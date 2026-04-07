from __future__ import annotations

import csv
import json
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Annotated, Any

from fastapi import Depends, FastAPI, File, Header, HTTPException, Query, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from backend.database import (
    from_json,
    get_db,
    hash_password,
    hash_token,
    init_db,
    to_json,
    utc_now,
    verify_password,
)
from services.ai import AIService
from services.transcription import TranscriptionError, TranscriptionService


app = FastAPI(title="Vertex API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ai_service = AIService()
transcription_service = TranscriptionService()
EXPORT_DIR = Path(__file__).resolve().parent.parent / "data" / "exports"
EXPORT_DIR.mkdir(parents=True, exist_ok=True)
FRONTEND_BUILD_DIR = Path(__file__).resolve().parent.parent / "build"
FRONTEND_ASSETS_DIR = FRONTEND_BUILD_DIR / "assets"

if FRONTEND_ASSETS_DIR.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_ASSETS_DIR), name="assets")


class RegisterRequest(BaseModel):
    email: str
    password: str = Field(min_length=8)
    name: str = Field(min_length=1)


class LoginRequest(BaseModel):
    email: str
    password: str = Field(min_length=8)


class NotesRequest(BaseModel):
    notes: str


class RecordingCreateRequest(BaseModel):
    sourceType: str = "manual"
    provider: str = "manual"
    platform: str = "In-Person"


class RecordingStartRequest(BaseModel):
    startedAt: str | None = None


class RecordingStopRequest(BaseModel):
    stoppedAt: str | None = None
    occasion: str = ""
    location: str = ""
    transcriptText: str = ""


class ContactCreateProfile(BaseModel):
    name: str
    title: str = ""
    company: str = ""
    location: str = ""
    linkedIn: str = ""
    twitter: str = ""
    instagram: str = ""
    github: str = ""
    transcriptText: str = ""
    occasion: str = ""
    platform: str = "In-Person"
    locationContext: str = ""


class ContactFromRecordingRequest(BaseModel):
    recordingId: int
    contactId: int | None = None
    profile: ContactCreateProfile


class ActionExecuteRequest(BaseModel):
    channel: str
    payload: dict[str, Any] = Field(default_factory=dict)


class ActionCompleteRequest(BaseModel):
    completed: bool = True


class AssistantRecommendRequest(BaseModel):
    query: str
    chatSessionId: int | None = None


class AssistantMessageRequest(BaseModel):
    chatSessionId: int | None = None
    role: str = "user"
    content: str


class DraftMessageRequest(BaseModel):
    targetType: str
    contactId: int | None = None
    recommendationId: str | None = None
    goal: str


class SettingsUpdateRequest(BaseModel):
    theme: str | None = None
    notifications: dict[str, Any] | None = None
    privacy: dict[str, Any] | None = None


class ConnectIntegrationRequest(BaseModel):
    scopes: list[str] = Field(default_factory=list)


class ExportRequest(BaseModel):
    format: str = Field(pattern="^(json|csv)$")


@app.post("/api/transcriptions/upload")
async def upload_transcription(
    current_user: CurrentUser,
    audio: UploadFile = File(...),
) -> dict[str, str]:
    content_type = audio.content_type or ""
    if content_type not in {"audio/wav", "audio/wave", "audio/x-wav"}:
        raise HTTPException(status_code=400, detail="Please upload a WAV audio file.")

    audio_bytes = await audio.read()
    try:
        transcript = transcription_service.transcribe_wav_bytes(audio_bytes)
    except TranscriptionError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {"transcript": transcript}


@app.post("/api/ocr/upload")
async def upload_ocr(
    current_user: CurrentUser,
    image: UploadFile = File(...),
) -> dict[str, str]:
    content_type = image.content_type or ""
    if content_type not in {"image/png", "image/jpeg", "image/jpg", "image/webp"}:
        raise HTTPException(status_code=400, detail="Please upload a PNG, JPG, or WEBP image.")

    image_bytes = await image.read()
    extracted_text = ai_service.extract_text_from_image(image_bytes, content_type)
    if not extracted_text.strip():
        raise HTTPException(
            status_code=400,
            detail="Unable to extract text from the image. Make sure GEMINI_API_KEY is set and the image is readable.",
        )
    return {"text": extracted_text.strip()}


def _ensure_defaults_for_user(user_id: int) -> None:
    with get_db() as conn:
        settings = conn.execute(
            "SELECT id FROM user_settings WHERE user_id = ?", (user_id,)
        ).fetchone()
        now = utc_now()
        if not settings:
            conn.execute(
                """
                INSERT INTO user_settings (user_id, theme, notifications_json, privacy_json, created_at, updated_at)
                VALUES (?, 'light', '{}', '{}', ?, ?)
                """,
                (user_id, now, now),
            )

        providers = {
            "gmail": ("disconnected", ["Read emails", "Send emails", "Access contacts"]),
            "outlook-calendar": ("disconnected", ["Read calendar events", "Create events", "View attendees"]),
            "zoom": ("disconnected", ["Record meetings", "Access transcripts", "View participants"]),
            "teams": ("disconnected", ["Record meetings", "Access chat history", "View members"]),
            "linkedin": ("disconnected", ["Read profile", "Access connections", "View messages"]),
            "slack": ("disconnected", ["Read messages", "View channels", "Access user info"]),
        }
        for provider, (state, scopes) in providers.items():
            existing = conn.execute(
                "SELECT id FROM integrations WHERE user_id = ? AND provider = ?",
                (user_id, provider),
            ).fetchone()
            if not existing:
                conn.execute(
                    """
                    INSERT INTO integrations (user_id, provider, status, scopes_json, last_sync_at, connected_at, disconnected_at)
                    VALUES (?, ?, ?, ?, NULL, NULL, ?)
                    """,
                    (user_id, provider, state, to_json(scopes), now),
                )


def _create_session(user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    expires_at = (datetime.now(timezone.utc) + timedelta(days=14)).isoformat()
    with get_db() as conn:
        conn.execute(
            "INSERT INTO sessions (user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?)",
            (user_id, hash_token(token), expires_at, utc_now()),
        )
    return token


def _public_user(row: dict[str, Any]) -> dict[str, Any]:
    return {"id": row["id"], "name": row["name"], "email": row["email"]}


def _format_transcript(segment: dict[str, Any] | None, full_text: str) -> dict[str, Any] | None:
    if not segment:
        return None
    return {
        "id": segment["id"],
        "platform": segment["platform"],
        "occasion": segment["occasion"],
        "date": segment["event_date"],
        "time": segment["event_time"],
        "location": segment["location"],
        "fullTranscript": full_text,
        "highlightedText": segment["highlighted_text"],
    }


def _load_contact(conn: Any, contact_id: int, user_id: int) -> dict[str, Any] | None:
    contact = conn.execute(
        """
        SELECT *
        FROM contacts
        WHERE id = ? AND user_id = ?
        """,
        (contact_id, user_id),
    ).fetchone()
    if not contact:
        return None

    transcript_lookup = {}
    transcript_rows = conn.execute(
        """
        SELECT ts.*, t.full_text
        FROM transcript_segments ts
        JOIN transcripts t ON t.id = ts.transcript_id
        JOIN recordings r ON r.id = t.recording_id
        WHERE r.contact_id = ? AND r.user_id = ?
        """,
        (contact_id, user_id),
    ).fetchall()
    for row in transcript_rows:
        transcript_lookup[row["id"]] = row

    insights = conn.execute(
        """
        SELECT *
        FROM insights
        WHERE contact_id = ?
        ORDER BY id ASC
        """,
        (contact_id,),
    ).fetchall()
    key_facts = []
    fun_facts = []
    for insight in insights:
        transcript_row = transcript_lookup.get(insight["transcript_segment_id"])
        item = {
            "id": insight["id"],
            "text": insight["text"],
            "source": insight["source"],
            "category": insight["category"],
            "transcript": _format_transcript(
                transcript_row, transcript_row["text"] if transcript_row else ""
            ),
        }
        if insight["section"] == "key_fact":
            key_facts.append(item)
        else:
            fun_facts.append(item)

    actions = conn.execute(
        """
        SELECT *
        FROM suggested_actions
        WHERE contact_id = ?
        ORDER BY
            CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
            id ASC
        """,
        (contact_id,),
    ).fetchall()
    suggested_actions = []
    for action in actions:
        transcript_row = transcript_lookup.get(action["transcript_segment_id"])
        suggested_actions.append(
            {
                "id": action["id"],
                "contactId": contact_id,
                "type": action["type"],
                "title": action["title"],
                "description": action["description"],
                "priority": action["priority"],
                "dueDate": action["due_date"],
                "status": action["status"],
                "transcript": _format_transcript(
                    transcript_row, transcript_row["text"] if transcript_row else ""
                ),
            }
        )

    social_rows = conn.execute(
        "SELECT platform, profile_url, handle FROM contact_social_profiles WHERE contact_id = ?",
        (contact_id,),
    ).fetchall()
    social_profiles = {row["platform"]: row["profile_url"] or row["handle"] for row in social_rows}
    conversations = [
        {
            "id": row["transcript_id"],
            "platform": row["platform"],
            "occasion": row["occasion"],
            "date": row["event_date"],
            "time": row["event_time"],
            "location": row["location"],
            "fullTranscript": row["full_text"],
            "highlightedText": row["full_text"][:160],
        }
        for row in conn.execute(
            """
            SELECT
                t.id AS transcript_id,
                r.platform,
                r.occasion,
                COALESCE(date(r.stopped_at), date(r.created_at)) AS event_date,
                COALESCE(time(r.stopped_at), time(r.created_at)) AS event_time,
                r.location,
                t.full_text
            FROM recordings r
            JOIN transcripts t ON t.recording_id = r.id
            WHERE r.contact_id = ? AND r.user_id = ?
            ORDER BY COALESCE(r.stopped_at, r.created_at) DESC
            """,
            (contact_id, user_id),
        ).fetchall()
    ]

    return {
        "id": contact["id"],
        "name": contact["name"],
        "title": contact["title"],
        "company": contact["company"],
        "location": contact["location"],
        "linkedInUrl": contact["linkedin_url"],
        "profileImage": contact["profile_image_url"],
        "dateAdded": contact["date_added"],
        "notes": contact["notes"],
        "conversationDuration": _format_duration(contact["conversation_duration_seconds"]),
        "conversationDurationSeconds": contact["conversation_duration_seconds"],
        "socialProfiles": social_profiles,
        "keyFacts": key_facts,
        "funFacts": fun_facts,
        "suggestedActions": suggested_actions,
        "conversations": conversations,
    }


def _format_duration(seconds: int) -> str:
    minutes = seconds // 60
    remaining = seconds % 60
    if minutes == 0:
        return f"{remaining}s"
    return f"{minutes}m {remaining}s"


def _default_avatar(name: str) -> str:
    seed = "-".join(name.lower().split()) or "vertex"
    return f"https://api.dicebear.com/8.x/thumbs/svg?seed={seed}"


def _ensure_transcript_for_recording(conn: Any, recording: dict[str, Any], transcript_text: str) -> int:
    transcript = conn.execute(
        "SELECT * FROM transcripts WHERE recording_id = ?",
        (recording["id"],),
    ).fetchone()
    if transcript:
        transcript_id = transcript["id"]
        conn.execute("UPDATE transcripts SET full_text = ?, created_at = ? WHERE id = ?", (transcript_text, utc_now(), transcript_id))
    else:
        conn.execute(
            "INSERT INTO transcripts (recording_id, full_text, language, created_at) VALUES (?, ?, 'en', ?)",
            (recording["id"], transcript_text, utc_now()),
        )
        transcript_id = conn.execute("SELECT last_insert_rowid() AS id").fetchone()["id"]
    return transcript_id


def _rebuild_contact_analysis(conn: Any, user_id: int, contact_id: int) -> None:
    contact = conn.execute(
        "SELECT * FROM contacts WHERE id = ? AND user_id = ?",
        (contact_id, user_id),
    ).fetchone()
    if not contact:
        return

    recordings = conn.execute(
        """
        SELECT r.*, t.id AS transcript_id, t.full_text
        FROM recordings r
        JOIN transcripts t ON t.recording_id = r.id
        WHERE r.contact_id = ? AND r.user_id = ?
        ORDER BY COALESCE(r.stopped_at, r.created_at) ASC
        """,
        (contact_id, user_id),
    ).fetchall()
    if not recordings:
        return

    combined_text = "\n\n".join(
        row["full_text"].strip()
        for row in recordings
        if row["full_text"].strip()
    ).strip()
    if not combined_text:
        return

    profile = {
        "name": contact["name"],
        "title": contact["title"],
        "company": contact["company"],
        "location": contact["location"],
        "notes": contact["notes"],
    }
    key_facts = ai_service.extract_things_to_know(combined_text, profile)
    fun_facts = ai_service.extract_fun_facts(combined_text, profile)
    suggested_actions = ai_service.extract_suggested_actions(combined_text, profile)
    summarized_notes = ai_service.summarize_text(combined_text, max_sentences=4)

    latest_recording = recordings[-1]
    latest_transcript_id = latest_recording["transcript_id"]
    conn.execute("DELETE FROM insights WHERE contact_id = ?", (contact_id,))
    conn.execute("DELETE FROM suggested_actions WHERE contact_id = ?", (contact_id,))
    conn.execute(
        "DELETE FROM transcript_segments WHERE transcript_id IN (SELECT id FROM transcripts WHERE recording_id IN (SELECT id FROM recordings WHERE contact_id = ?))",
        (contact_id,),
    )

    now = utc_now()
    event_date = datetime.now().strftime("%Y-%m-%d")
    event_time = datetime.now().strftime("%H:%M")
    for section_name, section in (("key_fact", key_facts), ("fun_fact", fun_facts)):
        for item in section:
            conn.execute(
                """
                INSERT INTO transcript_segments (transcript_id, platform, occasion, event_date, event_time, location, text, highlighted_text, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    latest_transcript_id,
                    latest_recording["platform"],
                    "All conversations for this contact",
                    event_date,
                    event_time,
                    latest_recording["location"],
                    combined_text,
                    item.get("highlighted_text") or item["text"],
                    now,
                ),
            )
            segment_id = conn.execute("SELECT last_insert_rowid() AS id").fetchone()["id"]
            conn.execute(
                """
                INSERT INTO insights (contact_id, transcript_segment_id, text, source, category, section, confidence_score, created_by, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'ai', ?)
                """,
                (
                    contact_id,
                    segment_id,
                    item["text"],
                    item.get("source") or "Conversation",
                    item.get("category") or "Professional",
                    section_name,
                    0.7,
                    now,
                ),
            )

    for action in suggested_actions:
        highlighted_text = action.get("highlighted_text") or combined_text[:160]
        conn.execute(
            """
            INSERT INTO transcript_segments (transcript_id, platform, occasion, event_date, event_time, location, text, highlighted_text, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                latest_transcript_id,
                latest_recording["platform"],
                "All conversations for this contact",
                event_date,
                event_time,
                latest_recording["location"],
                combined_text,
                highlighted_text,
                now,
            ),
        )
        segment_id = conn.execute("SELECT last_insert_rowid() AS id").fetchone()["id"]
        conn.execute(
            """
            INSERT INTO suggested_actions (contact_id, transcript_segment_id, type, title, description, priority, due_date, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)
            """,
            (
                contact_id,
                segment_id,
                action.get("type") or "follow-up",
                action["title"],
                action["description"],
                action.get("priority") or "medium",
                action.get("due_date"),
                now,
                now,
            ),
        )

    conn.execute(
        "UPDATE contacts SET notes = ?, updated_at = ? WHERE id = ?",
        (summarized_notes or contact["notes"], now, contact_id),
    )


def _store_recording_analysis(conn: Any, user_id: int, contact_id: int, recording: dict[str, Any], transcript_text: str) -> None:
    _ensure_transcript_for_recording(conn, recording, transcript_text)
    conn.execute(
        "UPDATE recordings SET contact_id = ?, status = 'completed', updated_at = ? WHERE id = ?",
        (contact_id, utc_now(), recording["id"]),
    )
    _rebuild_contact_analysis(conn, user_id, contact_id)


def _contact_search_rows(conn: Any, user_id: int, search: str) -> list[dict[str, Any]]:
    like = f"%{search.lower()}%"
    return conn.execute(
        """
        SELECT c.*,
               COUNT(DISTINCT i.id) AS insight_count
        FROM contacts c
        LEFT JOIN insights i ON i.contact_id = c.id
        WHERE c.user_id = ?
          AND (
            ? = ''
            OR lower(c.name) LIKE ?
            OR lower(c.title) LIKE ?
            OR lower(c.company) LIKE ?
            OR lower(c.notes) LIKE ?
          )
        GROUP BY c.id
        ORDER BY c.updated_at DESC
        """,
        (user_id, search, like, like, like, like),
    ).fetchall()


def _all_contacts_for_ai(conn: Any, user_id: int) -> list[dict[str, Any]]:
    rows = conn.execute("SELECT id FROM contacts WHERE user_id = ? ORDER BY updated_at DESC", (user_id,)).fetchall()
    return [_load_contact(conn, row["id"], user_id) for row in rows]


def _create_chat_session(conn: Any, user_id: int) -> int:
    now = utc_now()
    conn.execute(
        "INSERT INTO chat_sessions (user_id, title, created_at, updated_at) VALUES (?, 'Networking Assistant', ?, ?)",
        (user_id, now, now),
    )
    return conn.execute("SELECT last_insert_rowid() AS id").fetchone()["id"]


def get_current_user(
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
) -> dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1]
    with get_db() as conn:
        session = conn.execute(
            """
            SELECT s.*, u.id AS user_id, u.email, u.name
            FROM sessions s
            JOIN users u ON u.id = s.user_id
            WHERE s.token_hash = ?
            """,
            (hash_token(token),),
        ).fetchone()
        if not session:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")
        if datetime.fromisoformat(session["expires_at"]) < datetime.now(timezone.utc):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired")
        return {"id": session["user_id"], "email": session["email"], "name": session["name"]}


CurrentUser = Annotated[dict[str, Any], Depends(get_current_user)]


@app.on_event("startup")
def startup() -> None:
    init_db()
    print(
        "frontend_build_status",
        {
            "build_exists": FRONTEND_BUILD_DIR.exists(),
            "index_exists": (FRONTEND_BUILD_DIR / "index.html").exists(),
            "assets_exists": FRONTEND_ASSETS_DIR.exists(),
        },
    )


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/auth/register")
def register(payload: RegisterRequest) -> dict[str, Any]:
    with get_db() as conn:
        existing = conn.execute("SELECT id FROM users WHERE email = ?", (payload.email.lower(),)).fetchone()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        now = utc_now()
        conn.execute(
            "INSERT INTO users (email, password_hash, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            (payload.email.lower(), hash_password(payload.password), payload.name.strip(), now, now),
        )
        user_id = conn.execute("SELECT last_insert_rowid() AS id").fetchone()["id"]
    _ensure_defaults_for_user(user_id)
    token = _create_session(user_id)
    with get_db() as conn:
        user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return {"user": _public_user(user), "token": token}


@app.post("/api/auth/login")
def login(payload: LoginRequest) -> dict[str, Any]:
    with get_db() as conn:
        user = conn.execute("SELECT * FROM users WHERE email = ?", (payload.email.lower(),)).fetchone()
        if not user or not verify_password(payload.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")
    _ensure_defaults_for_user(user["id"])
    token = _create_session(user["id"])
    return {"user": _public_user(user), "token": token}


@app.get("/api/me")
def me(current_user: CurrentUser) -> dict[str, Any]:
    with get_db() as conn:
        settings = conn.execute(
            "SELECT theme FROM user_settings WHERE user_id = ?", (current_user["id"],)
        ).fetchone()
    return {"user": {**current_user, "theme": settings["theme"] if settings else "light"}}


@app.get("/api/contacts")
def list_contacts(current_user: CurrentUser, search: str = Query(default="")) -> dict[str, Any]:
    with get_db() as conn:
        rows = _contact_search_rows(conn, current_user["id"], search.strip())
    return {
        "items": [
            {
                "id": row["id"],
                "name": row["name"],
                "title": row["title"],
                "company": row["company"],
                "location": row["location"],
                "linkedInUrl": row["linkedin_url"],
                "profileImage": row["profile_image_url"],
                "dateAdded": row["date_added"],
                "notesPreview": row["notes"][:180],
                "conversationDuration": _format_duration(row["conversation_duration_seconds"]),
                "conversationDurationSeconds": row["conversation_duration_seconds"],
                "insightCount": row["insight_count"],
            }
            for row in rows
        ]
    }


@app.get("/api/contacts/{contact_id}")
def get_contact(contact_id: int, current_user: CurrentUser) -> dict[str, Any]:
    with get_db() as conn:
        contact = _load_contact(conn, contact_id, current_user["id"])
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"contact": contact}


@app.patch("/api/contacts/{contact_id}/notes")
def update_notes(contact_id: int, payload: NotesRequest, current_user: CurrentUser) -> dict[str, Any]:
    with get_db() as conn:
        exists = conn.execute(
            "SELECT id FROM contacts WHERE id = ? AND user_id = ?", (contact_id, current_user["id"])
        ).fetchone()
        if not exists:
            raise HTTPException(status_code=404, detail="Contact not found")
        conn.execute(
            "UPDATE contacts SET notes = ?, updated_at = ? WHERE id = ?",
            (payload.notes.strip(), utc_now(), contact_id),
        )
        contact = _load_contact(conn, contact_id, current_user["id"])
    return {"contact": contact}


@app.delete("/api/contacts/{contact_id}")
def delete_contact(contact_id: int, current_user: CurrentUser) -> dict[str, bool]:
    with get_db() as conn:
        exists = conn.execute(
            "SELECT id FROM contacts WHERE id = ? AND user_id = ?",
            (contact_id, current_user["id"]),
        ).fetchone()
        if not exists:
            raise HTTPException(status_code=404, detail="Contact not found")
        conn.execute("DELETE FROM contacts WHERE id = ?", (contact_id,))
    return {"success": True}


@app.post("/api/contacts/{contact_id}/refresh-analysis")
def refresh_contact_analysis(contact_id: int, current_user: CurrentUser) -> dict[str, Any]:
    with get_db() as conn:
        exists = conn.execute(
            "SELECT id FROM contacts WHERE id = ? AND user_id = ?",
            (contact_id, current_user["id"]),
        ).fetchone()
        if not exists:
            raise HTTPException(status_code=404, detail="Contact not found")
        _rebuild_contact_analysis(conn, current_user["id"], contact_id)
        contact = _load_contact(conn, contact_id, current_user["id"])
    return {"contact": contact}


@app.get("/api/contacts/{contact_id}/actions")
def contact_actions(contact_id: int, current_user: CurrentUser) -> dict[str, Any]:
    with get_db() as conn:
        contact = _load_contact(conn, contact_id, current_user["id"])
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"items": contact["suggestedActions"]}


@app.post("/api/recordings")
def create_recording(payload: RecordingCreateRequest, current_user: CurrentUser) -> dict[str, Any]:
    now = utc_now()
    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO recordings (user_id, source_type, provider, status, platform, created_at, updated_at)
            VALUES (?, ?, ?, 'created', ?, ?, ?)
            """,
            (current_user["id"], payload.sourceType, payload.provider, payload.platform, now, now),
        )
        recording_id = conn.execute("SELECT last_insert_rowid() AS id").fetchone()["id"]
        recording = conn.execute("SELECT * FROM recordings WHERE id = ?", (recording_id,)).fetchone()
    return {"recording": recording}


@app.post("/api/recordings/{recording_id}/start")
def start_recording(recording_id: int, payload: RecordingStartRequest, current_user: CurrentUser) -> dict[str, Any]:
    started_at = payload.startedAt or utc_now()
    with get_db() as conn:
        recording = conn.execute(
            "SELECT * FROM recordings WHERE id = ? AND user_id = ?", (recording_id, current_user["id"])
        ).fetchone()
        if not recording:
            raise HTTPException(status_code=404, detail="Recording not found")
        conn.execute(
            "UPDATE recordings SET status = 'recording', started_at = ?, updated_at = ? WHERE id = ?",
            (started_at, utc_now(), recording_id),
        )
        recording = conn.execute("SELECT * FROM recordings WHERE id = ?", (recording_id,)).fetchone()
    return {"recording": recording}


@app.post("/api/recordings/{recording_id}/stop")
def stop_recording(recording_id: int, payload: RecordingStopRequest, current_user: CurrentUser) -> dict[str, Any]:
    stopped_at = payload.stoppedAt or utc_now()
    with get_db() as conn:
        recording = conn.execute(
            "SELECT * FROM recordings WHERE id = ? AND user_id = ?", (recording_id, current_user["id"])
        ).fetchone()
        if not recording:
            raise HTTPException(status_code=404, detail="Recording not found")
        started = datetime.fromisoformat(recording["started_at"]) if recording["started_at"] else datetime.now(timezone.utc)
        stopped = datetime.fromisoformat(stopped_at)
        duration = max(int((stopped - started).total_seconds()), 0)
        conn.execute(
            """
            UPDATE recordings
            SET status = 'processing', stopped_at = ?, duration_seconds = ?, occasion = ?, location = ?, transcript_text = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                stopped_at,
                duration,
                payload.occasion.strip(),
                payload.location.strip(),
                payload.transcriptText.strip(),
                utc_now(),
                recording_id,
            ),
        )
        updated = conn.execute("SELECT * FROM recordings WHERE id = ?", (recording_id,)).fetchone()
    extracted_profile = ai_service.extract_contact_profile(updated["transcript_text"], {})
    analysis = ai_service.extract_insights_and_actions(updated["transcript_text"], extracted_profile)
    return {
        "recording": {
            **updated,
            "extractedProfile": extracted_profile,
            "proposedInsights": analysis["key_facts"] + analysis["fun_facts"],
            "proposedActions": analysis["suggested_actions"],
        }
    }


@app.get("/api/recordings/{recording_id}")
def get_recording(recording_id: int, current_user: CurrentUser) -> dict[str, Any]:
    with get_db() as conn:
        recording = conn.execute(
            "SELECT * FROM recordings WHERE id = ? AND user_id = ?", (recording_id, current_user["id"])
        ).fetchone()
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
    extracted_profile = ai_service.extract_contact_profile(recording["transcript_text"], {})
    analysis = ai_service.extract_insights_and_actions(recording["transcript_text"], extracted_profile)
    return {
        "recording": {
            **recording,
            "extractedProfile": extracted_profile,
            "proposedInsights": analysis["key_facts"] + analysis["fun_facts"],
            "proposedActions": analysis["suggested_actions"],
        }
    }


@app.post("/api/contacts/from-recording")
def create_contact_from_recording(payload: ContactFromRecordingRequest, current_user: CurrentUser) -> dict[str, Any]:
    with get_db() as conn:
        recording = conn.execute(
            "SELECT * FROM recordings WHERE id = ? AND user_id = ?", (payload.recordingId, current_user["id"])
        ).fetchone()
        if not recording:
            raise HTTPException(status_code=404, detail="Recording not found")
        transcript_text = payload.profile.transcriptText.strip() or recording["transcript_text"].strip()
        if not transcript_text:
            raise HTTPException(status_code=400, detail="Transcript text is required")
        profile_data = payload.profile.model_dump()
        extracted_profile = ai_service.extract_contact_profile(transcript_text, profile_data)
        notes = extracted_profile["notes"] or ai_service.summarize_text(transcript_text)
        now = utc_now()
        if payload.contactId is not None:
            existing_contact = conn.execute(
                "SELECT * FROM contacts WHERE id = ? AND user_id = ?",
                (payload.contactId, current_user["id"]),
            ).fetchone()
            if not existing_contact:
                raise HTTPException(status_code=404, detail="Contact not found")
            merged_notes = "\n\n".join(part for part in [existing_contact["notes"], notes] if part).strip()
            conn.execute(
                """
                UPDATE contacts
                SET name = ?, title = ?, company = ?, location = ?, linkedin_url = ?, notes = ?, conversation_duration_seconds = ?, updated_at = ?
                WHERE id = ?
                """,
                (
                    payload.profile.name.strip() or existing_contact["name"] or extracted_profile["name"],
                    payload.profile.title.strip() or existing_contact["title"] or extracted_profile["title"],
                    payload.profile.company.strip() or existing_contact["company"] or extracted_profile["company"],
                    payload.profile.location.strip() or payload.profile.locationContext.strip() or existing_contact["location"] or extracted_profile["location"],
                    payload.profile.linkedIn.strip() or existing_contact["linkedin_url"],
                    merged_notes,
                    existing_contact["conversation_duration_seconds"] + recording["duration_seconds"],
                    now,
                    payload.contactId,
                ),
            )
            contact_id = payload.contactId
        else:
            conn.execute(
                """
                INSERT INTO contacts
                (user_id, name, title, company, location, linkedin_url, profile_image_url, notes, date_added, conversation_duration_seconds, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    current_user["id"],
                    payload.profile.name.strip() or extracted_profile["name"],
                    payload.profile.title.strip() or extracted_profile["title"],
                    payload.profile.company.strip() or extracted_profile["company"],
                    payload.profile.location.strip() or payload.profile.locationContext.strip() or extracted_profile["location"],
                    payload.profile.linkedIn.strip(),
                    _default_avatar(payload.profile.name or extracted_profile["name"]),
                    notes,
                    datetime.now().strftime("%Y-%m-%d"),
                    recording["duration_seconds"],
                    now,
                    now,
                ),
            )
            contact_id = conn.execute("SELECT last_insert_rowid() AS id").fetchone()["id"]

        for platform, value in {
            "linkedin": payload.profile.linkedIn.strip(),
            "twitter": payload.profile.twitter.strip(),
            "instagram": payload.profile.instagram.strip(),
            "github": payload.profile.github.strip(),
        }.items():
            if value:
                existing_social = conn.execute(
                    "SELECT id FROM contact_social_profiles WHERE contact_id = ? AND platform = ?",
                    (contact_id, platform),
                ).fetchone()
                if existing_social:
                    conn.execute(
                        "UPDATE contact_social_profiles SET profile_url = ?, handle = ? WHERE id = ?",
                        (value, value, existing_social["id"]),
                    )
                else:
                    conn.execute(
                        """
                        INSERT INTO contact_social_profiles (contact_id, platform, profile_url, handle, created_at)
                        VALUES (?, ?, ?, ?, ?)
                        """,
                        (contact_id, platform, value, value, now),
                    )
        conn.execute(
            """
            UPDATE recordings
            SET platform = ?, occasion = ?, location = ?, transcript_text = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                payload.profile.platform,
                payload.profile.occasion.strip(),
                payload.profile.locationContext.strip() or payload.profile.location.strip(),
                transcript_text,
                now,
                payload.recordingId,
            ),
        )
        refreshed_recording = conn.execute("SELECT * FROM recordings WHERE id = ?", (payload.recordingId,)).fetchone()
        _store_recording_analysis(conn, current_user["id"], contact_id, refreshed_recording, transcript_text)
        contact = _load_contact(conn, contact_id, current_user["id"])
    return {"contact": contact}


@app.get("/api/actions")
def all_actions(current_user: CurrentUser, status_filter: str = Query(default="open", alias="status")) -> dict[str, Any]:
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT a.*, c.name AS contact_name, c.profile_image_url, c.title AS contact_title, c.company AS contact_company,
                   ts.id AS segment_id, ts.platform, ts.occasion, ts.event_date, ts.event_time, ts.location, ts.text, ts.highlighted_text,
                   t.full_text
            FROM suggested_actions a
            JOIN contacts c ON c.id = a.contact_id
            LEFT JOIN transcript_segments ts ON ts.id = a.transcript_segment_id
            LEFT JOIN transcripts t ON t.id = ts.transcript_id
            WHERE c.user_id = ? AND (? = '' OR a.status = ?)
            ORDER BY CASE a.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, a.id ASC
            """,
            (current_user["id"], status_filter, status_filter),
        ).fetchall()
    return {
        "items": [
            {
                "id": row["id"],
                "contactId": row["contact_id"],
                "contactName": row["contact_name"],
                "contactImage": row["profile_image_url"],
                "contactTitle": row["contact_title"],
                "contactCompany": row["contact_company"],
                "type": row["type"],
                "title": row["title"],
                "description": row["description"],
                "priority": row["priority"],
                "dueDate": row["due_date"],
                "status": row["status"],
                "transcript": {
                    "id": row["segment_id"],
                    "platform": row["platform"],
                    "occasion": row["occasion"],
                    "date": row["event_date"],
                    "time": row["event_time"],
                    "location": row["location"],
                    "fullTranscript": row["text"] or row["full_text"] or "",
                    "highlightedText": row["highlighted_text"],
                } if row["platform"] else None,
            }
            for row in rows
        ]
    }


@app.get("/api/actions/{action_id}")
def get_action(action_id: int, current_user: CurrentUser) -> dict[str, Any]:
    items = all_actions(current_user, status_filter="")
    for item in items["items"]:
        if item["id"] == action_id:
            return {"action": item}
    raise HTTPException(status_code=404, detail="Action not found")


@app.post("/api/actions/{action_id}/execute")
def execute_action(action_id: int, payload: ActionExecuteRequest, current_user: CurrentUser) -> dict[str, Any]:
    action = get_action(action_id, current_user)["action"]
    with get_db() as conn:
        context = f"{action['title']}: {action['description']}"
        draft = ai_service.draft_message(action["contactName"], action["title"], context)
        response_payload = {"draft": draft, "channel": payload.channel}
        conn.execute(
            """
            INSERT INTO action_executions (action_id, channel, request_payload_json, response_payload_json, status, created_at)
            VALUES (?, ?, ?, ?, 'sent', ?)
            """,
            (action_id, payload.channel, to_json(payload.payload), to_json(response_payload), utc_now()),
        )
    return {"execution": {"actionId": action_id, "status": "sent", "draft": draft}}


@app.post("/api/actions/{action_id}/complete")
def complete_action(action_id: int, payload: ActionCompleteRequest, current_user: CurrentUser) -> dict[str, Any]:
    if not payload.completed:
        raise HTTPException(status_code=400, detail="completed must be true")
    with get_db() as conn:
        row = conn.execute(
            """
            SELECT a.id
            FROM suggested_actions a
            JOIN contacts c ON c.id = a.contact_id
            WHERE a.id = ? AND c.user_id = ?
            """,
            (action_id, current_user["id"]),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Action not found")
        conn.execute(
            "UPDATE suggested_actions SET status = 'completed', completed_at = ?, updated_at = ? WHERE id = ?",
            (utc_now(), utc_now(), action_id),
        )
    return get_action(action_id, current_user)


@app.post("/api/assistant/recommend")
def assistant_recommend(payload: AssistantRecommendRequest, current_user: CurrentUser) -> dict[str, Any]:
    with get_db() as conn:
        contacts = _all_contacts_for_ai(conn, current_user["id"])
    recommendations = ai_service.recommend_contacts(payload.query, contacts)
    return recommendations


@app.post("/api/assistant/messages")
def assistant_message(payload: AssistantMessageRequest, current_user: CurrentUser) -> dict[str, Any]:
    with get_db() as conn:
        session_id = payload.chatSessionId or _create_chat_session(conn, current_user["id"])
        conn.execute(
            "INSERT INTO chat_messages (chat_session_id, role, content, recommendations_json, created_at) VALUES (?, ?, ?, '[]', ?)",
            (session_id, payload.role, payload.content, utc_now()),
        )
        contacts = _all_contacts_for_ai(conn, current_user["id"])
        recommendations = ai_service.recommend_contacts(payload.content, contacts)
        conn.execute(
            """
            INSERT INTO chat_messages (chat_session_id, role, content, recommendations_json, created_at)
            VALUES (?, 'assistant', ?, ?, ?)
            """,
            (session_id, recommendations["message"], to_json(recommendations["recommendations"]), utc_now()),
        )
        conn.execute("UPDATE chat_sessions SET updated_at = ? WHERE id = ?", (utc_now(), session_id))
    return {
        "chatSessionId": session_id,
        "message": {
            "role": "assistant",
            "content": recommendations["message"],
            "recommendations": recommendations["recommendations"],
        },
    }


@app.post("/api/assistant/draft-message")
def assistant_draft(payload: DraftMessageRequest, current_user: CurrentUser) -> dict[str, Any]:
    recipient_name = "there"
    context = payload.goal
    with get_db() as conn:
        if payload.contactId:
            contact = _load_contact(conn, payload.contactId, current_user["id"])
            if not contact:
                raise HTTPException(status_code=404, detail="Contact not found")
            recipient_name = contact["name"]
            context = contact["notes"]
    return ai_service.draft_message(recipient_name, payload.goal, context)


@app.get("/api/settings")
def get_settings(current_user: CurrentUser) -> dict[str, Any]:
    with get_db() as conn:
        settings = conn.execute(
            "SELECT * FROM user_settings WHERE user_id = ?", (current_user["id"],)
        ).fetchone()
    return {
        "theme": settings["theme"],
        "notifications": from_json(settings["notifications_json"], {}),
        "privacy": from_json(settings["privacy_json"], {}),
        "exportAvailable": True,
        "aiConfigured": bool(ai_service.api_key),
        "aiModel": ai_service.model,
    }


@app.patch("/api/settings")
def update_settings(payload: SettingsUpdateRequest, current_user: CurrentUser) -> dict[str, Any]:
    with get_db() as conn:
        settings = conn.execute(
            "SELECT * FROM user_settings WHERE user_id = ?", (current_user["id"],)
        ).fetchone()
        notifications = payload.notifications if payload.notifications is not None else from_json(settings["notifications_json"], {})
        privacy = payload.privacy if payload.privacy is not None else from_json(settings["privacy_json"], {})
        theme = payload.theme or settings["theme"]
        conn.execute(
            """
            UPDATE user_settings
            SET theme = ?, notifications_json = ?, privacy_json = ?, updated_at = ?
            WHERE user_id = ?
            """,
            (theme, to_json(notifications), to_json(privacy), utc_now(), current_user["id"]),
        )
    return {"settings": {"theme": theme, "notifications": notifications, "privacy": privacy}}


@app.get("/api/integrations")
def list_integrations(current_user: CurrentUser) -> dict[str, Any]:
    provider_labels = {
        "gmail": "Gmail",
        "outlook-calendar": "Outlook Calendar",
        "zoom": "Zoom",
        "teams": "Microsoft Teams",
        "linkedin": "LinkedIn",
        "slack": "Slack",
    }
    descriptions = {
        "gmail": "Sync email conversations and extract insights",
        "outlook-calendar": "Auto-schedule meetings and track conversation contexts",
        "zoom": "Capture video call conversations and generate insights",
        "teams": "Integrate Teams conversations and video calls",
        "linkedin": "Import professional background and connection data",
        "slack": "Track workplace conversations and interactions",
    }
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM integrations WHERE user_id = ? ORDER BY provider ASC", (current_user["id"],)
        ).fetchall()
    return {
        "items": [
            {
                "provider": row["provider"],
                "name": provider_labels[row["provider"]],
                "status": row["status"],
                "permissions": from_json(row["scopes_json"], []),
                "lastSyncAt": row["last_sync_at"],
                "description": descriptions[row["provider"]],
            }
            for row in rows
        ]
    }


@app.post("/api/integrations/{provider}/connect")
def connect_integration(provider: str, payload: ConnectIntegrationRequest, current_user: CurrentUser) -> dict[str, Any]:
    now = utc_now()
    with get_db() as conn:
        existing = conn.execute(
            "SELECT id FROM integrations WHERE user_id = ? AND provider = ?",
            (current_user["id"], provider),
        ).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Integration not found")
        scopes = payload.scopes or ["Read data", "Write data"]
        conn.execute(
            """
            UPDATE integrations
            SET status = 'connected', scopes_json = ?, connected_at = ?, disconnected_at = NULL, last_sync_at = ?
            WHERE user_id = ? AND provider = ?
            """,
            (to_json(scopes), now, now, current_user["id"], provider),
        )
    return {"integration": {"provider": provider, "status": "connected"}}


@app.delete("/api/integrations/{provider}")
def disconnect_integration(provider: str, current_user: CurrentUser) -> dict[str, Any]:
    with get_db() as conn:
        existing = conn.execute(
            "SELECT id FROM integrations WHERE user_id = ? AND provider = ?",
            (current_user["id"], provider),
        ).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Integration not found")
        conn.execute(
            """
            UPDATE integrations
            SET status = 'disconnected', disconnected_at = ?, last_sync_at = ?
            WHERE user_id = ? AND provider = ?
            """,
            (utc_now(), utc_now(), current_user["id"], provider),
        )
    return {"success": True}


@app.post("/api/exports")
def create_export(payload: ExportRequest, current_user: CurrentUser) -> dict[str, Any]:
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM contacts WHERE user_id = ? ORDER BY updated_at DESC", (current_user["id"],)
        ).fetchall()
        export_time = utc_now()
        conn.execute(
            "INSERT INTO exports (user_id, format, status, created_at) VALUES (?, ?, 'queued', ?)",
            (current_user["id"], payload.format, export_time),
        )
        export_id = conn.execute("SELECT last_insert_rowid() AS id").fetchone()["id"]
        file_path = EXPORT_DIR / f"export_{current_user['id']}_{export_id}.{payload.format}"
        if payload.format == "json":
            contacts = [_load_contact(conn, row["id"], current_user["id"]) for row in rows]
            file_path.write_text(json.dumps({"contacts": contacts}, indent=2), encoding="utf-8")
        else:
            with file_path.open("w", newline="", encoding="utf-8") as handle:
                writer = csv.writer(handle)
                writer.writerow(["id", "name", "title", "company", "location", "notes"])
                for row in rows:
                    writer.writerow([row["id"], row["name"], row["title"], row["company"], row["location"], row["notes"]])
        conn.execute(
            "UPDATE exports SET status = 'completed', storage_path = ?, finished_at = ? WHERE id = ?",
            (str(file_path), utc_now(), export_id),
        )
    return {"exportId": export_id, "status": "completed", "path": str(file_path)}


@app.get("/", include_in_schema=False, response_model=None)
def serve_root():
    index_file = FRONTEND_BUILD_DIR / "index.html"
    if not index_file.exists():
        return HTMLResponse(
            "<html><body><h1>Vertex API is running.</h1><p>Frontend build not found in container.</p></body></html>"
        )
    return FileResponse(index_file)


@app.get("/{full_path:path}", include_in_schema=False, response_model=None)
def serve_spa(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not found")

    candidate = FRONTEND_BUILD_DIR / full_path
    if candidate.exists() and candidate.is_file():
        return FileResponse(candidate)

    index_file = FRONTEND_BUILD_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return HTMLResponse(
        "<html><body><h1>Vertex API is running.</h1><p>Frontend build not found in container.</p></body></html>"
    )

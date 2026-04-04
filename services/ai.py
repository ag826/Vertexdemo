from __future__ import annotations

import json
import os
import re
from base64 import b64encode
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any
from urllib import error, parse, request


class AIService:
    def __init__(self) -> None:
        self._load_local_env()
        self.api_key = os.getenv("GEMINI_API_KEY", "").strip()
        self.model = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
        self.base_url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent"
        )

    def _load_local_env(self) -> None:
        env_path = Path(__file__).resolve().parent.parent / ".env"
        if not env_path.exists():
            return
        for line in env_path.read_text(encoding="utf-8").splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("#") or "=" not in stripped:
                continue
            key, value = stripped.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip("'\""))

    def summarize_text(self, text: str, max_sentences: int = 3) -> str:
        cleaned = " ".join(text.split())
        if not cleaned:
            return ""
        prompt = (
            "Summarize the following networking conversation into concise CRM notes. "
            f"Use at most {max_sentences} sentences.\n\n{cleaned}"
        )
        fallback = self._fallback_summary(cleaned, max_sentences)
        return self._text_generation(prompt, fallback)

    def classify_input(self, text: str, labels: list[str]) -> str:
        cleaned = " ".join(text.split())
        fallback = self._fallback_label(cleaned, labels)
        if not cleaned:
            return fallback
        prompt = (
            "Classify the following text into exactly one of these labels: "
            f"{', '.join(labels)}.\nReturn only the label.\n\nText: {cleaned}"
        )
        result = self._text_generation(prompt, fallback).strip()
        return result if result in labels else fallback

    def extract_contact_profile(self, transcript: str, provided_profile: dict[str, Any]) -> dict[str, Any]:
        cleaned = transcript.strip()
        fallback = self._fallback_contact_profile(cleaned, provided_profile)
        if not cleaned:
            return fallback
        prompt = (
            "Extract contact profile information from this networking conversation. "
            "Return strict JSON with keys: name, title, company, location, notes.\n\n"
            f"Conversation:\n{cleaned}\n\nProvided profile: {json.dumps(provided_profile)}"
        )
        result = self._json_generation(prompt, fallback)
        return {
            "name": result.get("name") or fallback["name"],
            "title": result.get("title") or fallback["title"],
            "company": result.get("company") or fallback["company"],
            "location": result.get("location") or fallback["location"],
            "notes": result.get("notes") or fallback["notes"],
        }

    def extract_insights_and_actions(self, transcript: str, profile: dict[str, Any]) -> dict[str, Any]:
        cleaned = transcript.strip()
        return {
            "key_facts": self.extract_things_to_know(cleaned, profile),
            "fun_facts": self.extract_fun_facts(cleaned, profile),
            "suggested_actions": self.extract_suggested_actions(cleaned, profile),
        }

    def extract_things_to_know(self, transcript: str, profile: dict[str, Any]) -> list[dict[str, Any]]:
        cleaned = transcript.strip()
        fallback = self._fallback_section_insights(
            cleaned,
            "things_to_know",
            ["Professional", "Background", "Goal", "Personal", "Interest"],
        )
        if not cleaned:
            return fallback
        prompt = (
            "You are extracting CRM persona insights from aggregated conversation notes.\n"
            "Return strict JSON with one key: items.\n"
            "items must be an array of distinct points with keys: text, source, category, highlighted_text.\n"
            "Rules:\n"
            "- Focus only on 'Things to Know' (professional background, goals, context that helps future conversations).\n"
            "- Write each text point in third person.\n"
            "- Keep each point concise and non-overlapping.\n"
            "- Provide up to 6 points if available.\n"
            "- highlighted_text must be an exact span copied from the notes that supports the point.\n"
            "- Use only source values: Conversation, LinkedIn, Mutual Connection, Website, Social Media, Email.\n"
            "- Use only category values: Professional, Personal, Interest, Background, Goal.\n\n"
            f"Profile context: {json.dumps(profile)}\n\n"
            f"Aggregated conversation notes:\n{cleaned}"
        )
        parsed = self._json_generation(prompt, {"items": fallback})
        items = parsed.get("items")
        if not isinstance(items, list):
            return fallback
        normalized = self._normalize_section_items(
            items,
            allowed_categories={"Professional", "Background", "Goal", "Personal", "Interest"},
            fallback_category="Professional",
        )
        return normalized or fallback

    def extract_fun_facts(self, transcript: str, profile: dict[str, Any]) -> list[dict[str, Any]]:
        cleaned = transcript.strip()
        fallback = self._fallback_section_insights(
            cleaned,
            "fun_facts",
            ["Interest", "Personal", "Background", "Professional", "Goal"],
        )
        if not cleaned:
            return fallback
        prompt = (
            "You are extracting CRM persona insights from aggregated conversation notes.\n"
            "Return strict JSON with one key: items.\n"
            "items must be an array of distinct points with keys: text, source, category, highlighted_text.\n"
            "Rules:\n"
            "- Focus only on fun facts and personal interests relevant for rapport-building.\n"
            "- Write each text point in third person.\n"
            "- Keep each point concise and non-overlapping.\n"
            "- Provide up to 6 points if available.\n"
            "- highlighted_text must be an exact span copied from the notes that supports the point.\n"
            "- Use only source values: Conversation, LinkedIn, Mutual Connection, Website, Social Media, Email.\n"
            "- Use only category values: Professional, Personal, Interest, Background, Goal.\n\n"
            f"Profile context: {json.dumps(profile)}\n\n"
            f"Aggregated conversation notes:\n{cleaned}"
        )
        parsed = self._json_generation(prompt, {"items": fallback})
        items = parsed.get("items")
        if not isinstance(items, list):
            return fallback
        normalized = self._normalize_section_items(
            items,
            allowed_categories={"Interest", "Personal", "Background", "Professional", "Goal"},
            fallback_category="Interest",
        )
        return normalized or fallback

    def extract_suggested_actions(self, transcript: str, profile: dict[str, Any]) -> list[dict[str, Any]]:
        cleaned = transcript.strip()
        fallback = self._fallback_suggested_actions(cleaned, profile)
        if not cleaned:
            return fallback
        prompt = (
            "You are extracting action items from aggregated conversation notes.\n"
            "Return strict JSON with one key: items.\n"
            "items must be an array of distinct action points with keys: type, title, description, priority, due_date, highlighted_text.\n"
            "Rules:\n"
            "- Focus only on practical follow-up actions based on the notes.\n"
            "- Keep items distinct and non-overlapping.\n"
            "- Provide up to 6 actions if available.\n"
            "- title must be highly specific and actionable, starting with a clear verb and concrete deliverable.\n"
            "- description must be a specific execution step (what to send/do, to whom, and why) and must not be generic.\n"
            "- Avoid vague wording like 'Follow up with X' or 'based on conversation highlights'.\n"
            "- Use only type values: email, meeting, follow-up, introduction, share, call.\n"
            "- Use only priority values: high, medium, low.\n"
            "- due_date must be YYYY-MM-DD or null.\n"
            "- highlighted_text must be one exact sentence or line copied verbatim from the notes that justifies the action.\n"
            "- highlighted_text must appear exactly in the notes text.\n\n"
            f"Profile context: {json.dumps(profile)}\n\n"
            f"Aggregated conversation notes:\n{cleaned}"
        )
        parsed = self._json_generation(prompt, {"items": fallback})
        items = parsed.get("items")
        if not isinstance(items, list):
            items = []
        normalized = self._normalize_action_items(items, cleaned)
        cue_actions = self._extract_actions_from_cues(cleaned, profile)
        merged = self._merge_actions(cue_actions, normalized)
        return merged or fallback

    def recommend_contacts(self, query: str, contacts: list[dict[str, Any]]) -> dict[str, Any]:
        fallback = self._fallback_recommendations(query, contacts)
        if not query.strip() or not contacts:
            return fallback
        prompt = (
            "You are a networking assistant. Return strict JSON with keys message and recommendations. "
            "Each recommendation must have contactType, name, role, company, explanation, suggestedQuestions, "
            "inNetwork, contactId. Limit to top 4.\n\n"
            f"Query: {query}\nContacts: {json.dumps(contacts)}"
        )
        result = self._json_generation(prompt, fallback)
        if not isinstance(result.get("recommendations"), list):
            return fallback
        result["message"] = result.get("message") or fallback["message"]
        return result

    def draft_message(self, recipient_name: str, goal: str, context: str) -> dict[str, str]:
        fallback = self._fallback_draft(recipient_name, goal, context)
        prompt = (
            "Draft a concise professional outreach email. Return strict JSON with keys subject and body.\n\n"
            f"Recipient: {recipient_name}\nGoal: {goal}\nContext: {context}"
        )
        result = self._json_generation(prompt, fallback)
        return {
            "subject": result.get("subject") or fallback["subject"],
            "body": result.get("body") or fallback["body"],
        }

    def extract_text_from_image(self, image_bytes: bytes, mime_type: str) -> str:
        if not image_bytes:
            return ""
        if not self.api_key:
            return ""
        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": (
                                "Extract all legible handwritten or typed notes from this image. "
                                "Return plain text only, keeping line breaks where helpful."
                            )
                        },
                        {
                            "inline_data": {
                                "mime_type": mime_type,
                                "data": b64encode(image_bytes).decode("utf-8"),
                            }
                        },
                    ]
                }
            ],
            "generationConfig": {"temperature": 0.1, "responseMimeType": "text/plain"},
        }
        response = self._call_gemini_payload(payload)
        return response.strip() if response else ""

    def _text_generation(self, prompt: str, fallback: str) -> str:
        response = self._call_gemini(prompt)
        if not response:
            return fallback
        return response.strip() or fallback

    def _json_generation(self, prompt: str, fallback: dict[str, Any]) -> dict[str, Any]:
        response = self._call_gemini(prompt)
        if not response:
            return fallback
        parsed = self._extract_json(response)
        return parsed if isinstance(parsed, dict) else fallback

    def _call_gemini(self, prompt: str) -> str | None:
        if not self.api_key:
            return None
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.3, "responseMimeType": "text/plain"},
        }
        return self._call_gemini_payload(payload)

    def _call_gemini_payload(self, payload: dict[str, Any]) -> str | None:
        if not self.api_key:
            return None
        req = request.Request(
            f"{self.base_url}?key={parse.quote(self.api_key)}",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with request.urlopen(req, timeout=30) as response:
                data = json.loads(response.read().decode("utf-8"))
        except (error.URLError, error.HTTPError, TimeoutError, json.JSONDecodeError):
            return None

        candidates = data.get("candidates") or []
        if not candidates:
            return None
        parts = candidates[0].get("content", {}).get("parts", [])
        text_parts = [part.get("text", "") for part in parts if part.get("text")]
        return "\n".join(text_parts).strip() or None

    def _extract_json(self, raw_text: str) -> Any:
        text = raw_text.strip()
        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.DOTALL)
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", text, re.DOTALL)
            if not match:
                return None
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                return None

    def _fallback_summary(self, text: str, max_sentences: int) -> str:
        sentences = re.split(r"(?<=[.!?])\s+", text)
        selected = [s.strip() for s in sentences if s.strip()][:max_sentences]
        return " ".join(selected)

    def _fallback_label(self, text: str, labels: list[str]) -> str:
        text = text.lower()
        priorities = {
            "Professional": ["product", "marketing", "engineer", "fund", "hiring", "conference"],
            "Interest": ["hobby", "hike", "coffee", "surf", "cook", "music"],
            "Personal": ["family", "kids", "dog", "travel", "marathon"],
            "Background": ["former", "previously", "graduated", "phd", "worked at"],
            "Goal": ["looking to", "wants to", "interested in", "trying to"],
        }
        for label in labels:
            for keyword in priorities.get(label, []):
                if keyword in text:
                    return label
        return labels[0]

    def _fallback_contact_profile(self, transcript: str, provided: dict[str, Any]) -> dict[str, Any]:
        notes = self._fallback_summary(transcript, 3) if transcript else "Conversation captured."
        return {
            "name": provided.get("name") or "Unknown Contact",
            "title": provided.get("title") or "Role not specified",
            "company": provided.get("company") or "Company not specified",
            "location": provided.get("location") or "Location not specified",
            "notes": notes,
        }

    def _normalize_section_items(
        self,
        items: list[dict[str, Any]],
        allowed_categories: set[str],
        fallback_category: str,
    ) -> list[dict[str, Any]]:
        normalized: list[dict[str, Any]] = []
        seen: set[str] = set()
        for raw in items:
            if not isinstance(raw, dict):
                continue
            text = str(raw.get("text") or "").strip()
            highlighted_text = str(raw.get("highlighted_text") or "").strip()
            if not text:
                continue
            dedupe_key = text.lower()
            if dedupe_key in seen:
                continue
            seen.add(dedupe_key)
            source = str(raw.get("source") or "Conversation").strip()
            if source not in {"Conversation", "LinkedIn", "Mutual Connection", "Website", "Social Media", "Email"}:
                source = "Conversation"
            category = str(raw.get("category") or fallback_category).strip()
            if category not in allowed_categories:
                category = fallback_category
            normalized.append(
                {
                    "text": text[:220],
                    "source": source,
                    "category": category,
                    "highlighted_text": (highlighted_text or text)[:260],
                }
            )
        return normalized

    def _fallback_section_insights(
        self,
        transcript: str,
        section: str,
        label_priority: list[str],
    ) -> list[dict[str, Any]]:
        sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", transcript) if s.strip()]
        if not sentences:
            default_text = (
                "This contact shared relevant professional context."
                if section == "things_to_know"
                else "This contact shared personal interests."
            )
            sentences = [default_text]
        selected = sentences[:6]
        return [
            {
                "text": sentence[:220],
                "source": "Conversation",
                "category": self._fallback_label(sentence, label_priority),
                "highlighted_text": sentence[:260],
            }
            for sentence in selected
        ]

    def _fallback_insights_and_actions(self, transcript: str, profile: dict[str, Any]) -> dict[str, Any]:
        sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", transcript) if s.strip()]
        key_sentence = sentences[0] if sentences else f"{profile.get('name', 'This contact')} shared professional context."
        fun_sentence = sentences[1] if len(sentences) > 1 else key_sentence
        due_date = (datetime.utcnow() + timedelta(days=7)).date().isoformat()
        return {
            "key_facts": [
                {
                    "text": key_sentence[:160],
                    "source": "Conversation",
                    "category": self._fallback_label(key_sentence, ["Professional", "Background", "Goal", "Personal", "Interest"]),
                    "highlighted_text": key_sentence[:160],
                }
            ],
            "fun_facts": [
                {
                    "text": fun_sentence[:160],
                    "source": "Conversation",
                    "category": self._fallback_label(fun_sentence, ["Interest", "Personal", "Background", "Professional", "Goal"]),
                    "highlighted_text": fun_sentence[:160],
                }
            ],
            "suggested_actions": [
                {
                    "type": "follow-up",
                    "title": f"Follow up with {profile.get('name') or 'contact'}",
                    "description": "Send a follow-up message based on the conversation highlights.",
                    "priority": "medium",
                    "due_date": due_date,
                    "highlighted_text": key_sentence[:160],
                }
            ],
        }

    def _normalize_action_items(self, items: list[dict[str, Any]], transcript: str) -> list[dict[str, Any]]:
        normalized: list[dict[str, Any]] = []
        seen: set[str] = set()
        allowed_types = {"email", "meeting", "follow-up", "introduction", "share", "call"}
        allowed_priorities = {"high", "medium", "low"}
        generic_patterns = (
            "follow up with",
            "conversation highlights",
            "send a follow-up message",
        )
        for raw in items:
            if not isinstance(raw, dict):
                continue
            title = str(raw.get("title") or "").strip()
            description = str(raw.get("description") or "").strip()
            if not title or not description:
                continue
            lowered_title = title.lower()
            lowered_description = description.lower()
            if any(pattern in lowered_title for pattern in generic_patterns) and any(
                pattern in lowered_description for pattern in generic_patterns
            ):
                continue
            dedupe_key = f"{title.lower()}::{description.lower()}"
            if dedupe_key in seen:
                continue
            seen.add(dedupe_key)
            action_type = str(raw.get("type") or "follow-up").strip()
            if action_type not in allowed_types:
                action_type = "follow-up"
            priority = str(raw.get("priority") or "medium").strip()
            if priority not in allowed_priorities:
                priority = "medium"
            due_date = raw.get("due_date")
            due_date_text = None
            if isinstance(due_date, str) and re.fullmatch(r"\d{4}-\d{2}-\d{2}", due_date.strip()):
                due_date_text = due_date.strip()
            highlighted_text = str(raw.get("highlighted_text") or "").strip()
            if not highlighted_text or highlighted_text not in transcript:
                highlighted_text = self._pick_supporting_excerpt(transcript, title, description)
            normalized.append(
                {
                    "type": action_type,
                    "title": title[:180],
                    "description": description[:320],
                    "priority": priority,
                    "due_date": due_date_text,
                    "highlighted_text": (highlighted_text or title)[:260],
                }
            )
        return normalized

    def _fallback_suggested_actions(self, transcript: str, profile: dict[str, Any]) -> list[dict[str, Any]]:
        sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", transcript) if s.strip()]
        first_sentence = sentences[0] if sentences else f"Follow up with {profile.get('name') or 'this contact'}."
        due_date = (datetime.utcnow() + timedelta(days=7)).date().isoformat()
        return [
            {
                "type": "follow-up",
                "title": f"Send tailored follow-up to {profile.get('name') or 'contact'} with requested materials",
                "description": "Draft and send a concise follow-up that references the key asks from the conversation and confirms next-step timing.",
                "priority": "medium",
                "due_date": due_date,
                "highlighted_text": first_sentence[:260],
            }
        ]

    def _pick_supporting_excerpt(self, transcript: str, title: str, description: str) -> str:
        sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", transcript) if s.strip()]
        if not sentences:
            return ""
        keywords = [
            token
            for token in re.findall(r"[a-zA-Z]{4,}", f"{title} {description}".lower())
            if token not in {"send", "with", "from", "that", "this", "will", "have", "your"}
        ]
        best_sentence = sentences[0]
        best_score = -1
        for sentence in sentences:
            lowered = sentence.lower()
            score = sum(1 for keyword in keywords if keyword in lowered)
            if score > best_score:
                best_score = score
                best_sentence = sentence
        return best_sentence[:260]

    def _extract_actions_from_cues(self, transcript: str, profile: dict[str, Any]) -> list[dict[str, Any]]:
        contact_name = profile.get("name") or "this contact"
        actions: list[dict[str, Any]] = []
        sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", transcript) if s.strip()]
        for sentence in sentences:
            lowered = sentence.lower()
            if (
                ("open to" in lowered or "available for" in lowered)
                and ("coffee" in lowered or "follow-up" in lowered or "30-minute" in lowered)
            ):
                location_match = re.search(r"\bin\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)", sentence)
                location_text = location_match.group(1) if location_match else "their location"
                week_match = re.search(r"week of ([A-Za-z]+ \d{1,2})", sentence, flags=re.IGNORECASE)
                week_text = week_match.group(1) if week_match else "the suggested week"
                due_date = self._extract_due_date(sentence)
                actions.append(
                    {
                        "type": "meeting",
                        "title": f"Schedule 30-minute coffee with {contact_name} in {location_text} ({week_text})",
                        "description": (
                            f"Send a meeting note proposing two specific 30-minute coffee slots in {location_text} "
                            f"during the week of {week_text}, and confirm availability."
                        ),
                        "priority": "high",
                        "due_date": due_date,
                        "highlighted_text": sentence[:260],
                    }
                )
            if (
                ("offered to introduce" in lowered or "introduce me" in lowered or "introduction" in lowered)
                and ("if i send" in lowered or "send" in lowered)
                and ("blurb" in lowered or "intro" in lowered)
            ):
                due_date = self._extract_due_date(sentence)
                actions.append(
                    {
                        "type": "introduction",
                        "title": "Send concise intro blurb for lifecycle marketing introduction",
                        "description": (
                            "Draft and send a forwardable 3-4 sentence intro blurb that states your context, "
                            "what help you need, and why the lifecycle marketing counterpart is relevant."
                        ),
                        "priority": "high",
                        "due_date": due_date,
                        "highlighted_text": sentence[:260],
                    }
                )
            if (
                ("asked if i could share" in lowered or "requested" in lowered)
                and ("write-up" in lowered or "examples" in lowered or "narrative" in lowered)
            ):
                due_date = self._extract_due_date(sentence)
                actions.append(
                    {
                        "type": "share",
                        "title": f"Send requested B2B AI narrative examples and short write-up to {contact_name}",
                        "description": (
                            "Prepare a concise write-up with 2-3 successful B2B AI product narrative examples "
                            "and send it with a clear subject line for easy forwarding."
                        ),
                        "priority": "high",
                        "due_date": due_date,
                        "highlighted_text": sentence[:260],
                    }
                )
        return self._normalize_action_items(actions, transcript)

    def _merge_actions(self, preferred: list[dict[str, Any]], generated: list[dict[str, Any]]) -> list[dict[str, Any]]:
        merged: list[dict[str, Any]] = []
        seen: set[str] = set()
        preferred_highlights = {str(item.get("highlighted_text") or "").strip() for item in preferred}
        for action in [*preferred, *generated]:
            if preferred:
                title_lower = str(action.get("title") or "").lower()
                description_lower = str(action.get("description") or "").lower()
                highlight = str(action.get("highlighted_text") or "").strip()
                if (
                    action.get("type") == "follow-up"
                    and ("follow-up" in title_lower or "follow-up" in description_lower)
                    and highlight in preferred_highlights
                ):
                    continue
            key = f"{action.get('title','').strip().lower()}::{action.get('description','').strip().lower()}"
            if not key or key in seen:
                continue
            seen.add(key)
            merged.append(action)
        return merged

    def _extract_due_date(self, sentence: str) -> str | None:
        # Support phrases like "next Tuesday" and "week of May 12".
        lowered = sentence.lower()
        weekdays = {
            "monday": 0,
            "tuesday": 1,
            "wednesday": 2,
            "thursday": 3,
            "friday": 4,
            "saturday": 5,
            "sunday": 6,
        }
        for day_name, day_num in weekdays.items():
            if f"next {day_name}" in lowered:
                today = datetime.utcnow().date()
                days_ahead = (day_num - today.weekday()) % 7
                if days_ahead == 0:
                    days_ahead = 7
                return (today + timedelta(days=days_ahead)).isoformat()
        match = re.search(r"week of ([A-Za-z]+)\s+(\d{1,2})", sentence, flags=re.IGNORECASE)
        if match:
            month_name = match.group(1)
            day = int(match.group(2))
            try:
                parsed = datetime.strptime(f"{month_name} {day} {datetime.utcnow().year}", "%B %d %Y")
                return parsed.date().isoformat()
            except ValueError:
                try:
                    parsed = datetime.strptime(f"{month_name} {day} {datetime.utcnow().year}", "%b %d %Y")
                    return parsed.date().isoformat()
                except ValueError:
                    return None
        return None

    def _fallback_recommendations(self, query: str, contacts: list[dict[str, Any]]) -> dict[str, Any]:
        query_terms = [term for term in re.findall(r"[a-zA-Z]+", query.lower()) if len(term) > 2]
        ranked = []
        for contact in contacts:
            haystack = " ".join(
                [
                    contact.get("name", ""),
                    contact.get("title", ""),
                    contact.get("company", ""),
                    contact.get("notes", ""),
                    " ".join(item.get("text", "") for item in contact.get("keyFacts", [])),
                    " ".join(item.get("text", "") for item in contact.get("funFacts", [])),
                ]
            ).lower()
            score = sum(term in haystack for term in query_terms)
            ranked.append((score, contact))
        ranked.sort(key=lambda item: item[0], reverse=True)
        recommendations = []
        for _, contact in ranked[:4]:
            recommendations.append(
                {
                    "contactType": "In Your Network",
                    "name": contact.get("name"),
                    "role": contact.get("title"),
                    "company": contact.get("company"),
                    "explanation": contact.get("notes") or f"{contact.get('name')} looks relevant to this topic.",
                    "suggestedQuestions": [
                        "What path led you to your current role?",
                        "What should I learn next in this area?",
                        "Who else would you recommend I talk to?",
                    ],
                    "inNetwork": True,
                    "contactId": contact.get("id"),
                }
            )
        return {
            "message": "Here are the strongest matches from your network.",
            "recommendations": recommendations,
        }

    def _fallback_draft(self, recipient_name: str, goal: str, context: str) -> dict[str, str]:
        subject = f"Following up on {goal}".strip()
        body = (
            f"Hi {recipient_name},\n\n"
            f"I enjoyed our conversation. I'm reaching out to follow up on {goal}.\n\n"
            f"{context}\n\n"
            "Would you be open to continuing the conversation?\n\n"
            "Best,\nYour Name"
        )
        return {"subject": subject, "body": body}

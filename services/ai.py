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
        default_model = os.getenv("GEMINI_MODEL", "gemini-1.5-flash").strip()
        self.chat_model = os.getenv("GEMINI_CHAT_MODEL", default_model).strip() or default_model
        self.vision_model = os.getenv("GEMINI_VISION_MODEL", default_model).strip() or default_model
        self.model = self.chat_model

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
        key_facts = self.extract_things_to_know(cleaned, profile)
        fun_facts = self.extract_fun_facts(cleaned, profile, key_facts)
        return {
            "key_facts": key_facts,
            "fun_facts": fun_facts,
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
            "Extract the 3 most important \"things to know\" about the person to prepare for a future meeting, "
            "using only the conversation note.\n\n"
            "Requirements:\n"
            "- Return output strictly in valid JSON format.\n"
            "- Output must be an array under the key \"key_insights\".\n"
            "- Include exactly 3 items.\n"
            "- Each item must contain:\n"
            "  - \"insight\": a concise, high-value takeaway about the person.\n"
            "  - \"category\": one of [\"professional_focus\", \"current_priority\", \"pain_point\", "
            "\"personal_context\", \"relationship_opportunity\"].\n"
            "  - \"quote\": an exact quote or minimally edited extract from the conversation note that justifies the insight.\n"
            "  - \"source\": must be \"conversation_note\".\n"
            "- Prioritize insights directly useful for guiding the meeting (what to discuss, positioning).\n"
            "- Prioritize current priorities, challenges, and opportunities.\n"
            "- Avoid trivial or purely biographical details unless they support rapport-building or strategy.\n"
            "- Do not include redundant or overlapping insights.\n\n"
            f"Conversation note:\n{cleaned}"
        )
        parsed = self._json_generation(prompt, {"key_insights": []})
        items = parsed.get("key_insights")
        if not isinstance(items, list):
            items = []
        normalized = self._normalize_key_insights(items, cleaned)
        if len(normalized) < 3:
            existing_texts = {item["text"].strip().lower() for item in normalized}
            for item in fallback:
                if item["text"].strip().lower() in existing_texts:
                    continue
                normalized.append(item)
                if len(normalized) >= 3:
                    break
        return normalized[:3] if normalized else fallback[:3]

    def extract_fun_facts(
        self,
        transcript: str,
        profile: dict[str, Any],
        key_facts: list[dict[str, Any]] | None = None,
    ) -> list[dict[str, Any]]:
        cleaned = transcript.strip()
        key_facts = key_facts or []
        fallback = self._fallback_fun_facts(cleaned)
        if not cleaned:
            return []
        prompt = (
            "Extract all useful fun facts about the person for rapport-building in a future meeting, "
            "using only the conversation note.\n\n"
            "Requirements:\n"
            "- Return output strictly in valid JSON format.\n"
            "- Output must be an array under the key \"fun_facts\".\n"
            "- Include all distinct fun facts found in the conversation note.\n"
            "- Each item must contain:\n"
            "  - \"fact\": a concise, third-person rapport-building detail.\n"
            "  - \"category\": one of [\"hobby\", \"interest\", \"lifestyle\", \"personality_trait\", \"social_behavior\"].\n"
            "  - \"quote\": an exact quote or minimally edited extract from the conversation note that supports the fact.\n"
            "  - \"source\": must be \"conversation_note\".\n"
            "- Focus on details that can help open a warm, relevant follow-up conversation.\n"
            "- Avoid generic professional summaries unless they support personal rapport.\n"
            "- Exclude asks, follow-ups, scheduling, deadlines, deliverables, and action items.\n"
            "- Do not include redundant or overlapping points.\n\n"
            f"Conversation note:\n{cleaned}"
        )
        parsed = self._json_generation(prompt, {"fun_facts": []})
        items = parsed.get("fun_facts")
        if not isinstance(items, list):
            # Backward compatibility for older prompt shape.
            items = parsed.get("items")
        if not isinstance(items, list):
            items = []
        category_map = {
            "hobby": "hobby",
            "interest": "interest",
            "lifestyle": "lifestyle",
            "personality_trait": "personality_trait",
            "social_behavior": "social_behavior",
            "personal_interest": "interest",
            "hobby_lifestyle": "lifestyle",
            "values_personality": "personality_trait",
            "background_tidbit": "interest",
            "relationship_hook": "social_behavior",
        }
        converted: list[dict[str, Any]] = []
        for raw in items:
            if not isinstance(raw, dict):
                continue
            fact_text = self._strip_context_prefix(str(raw.get("fact") or raw.get("text") or "").strip())
            quote_text = self._strip_context_prefix(str(raw.get("quote") or raw.get("highlighted_text") or "").strip())
            category_text = str(raw.get("category") or "").strip().lower()
            converted.append(
                {
                    "text": fact_text,
                    "source": "Conversation",
                    "category": category_map.get(category_text, "interest"),
                    "highlighted_text": quote_text or fact_text,
                }
            )
        normalized = self._normalize_section_items(
            converted,
            allowed_categories={"hobby", "interest", "lifestyle", "personality_trait", "social_behavior"},
            fallback_category="interest",
        )
        normalized = [
            item
            for item in normalized
            if self._is_fun_fact_candidate(item.get("text", ""))
            and not self._is_action_like_statement(item.get("text", ""))
        ]
        if len(normalized) < 3:
            existing_texts = {item["text"].strip().lower() for item in normalized}
            for item in fallback:
                if item["text"].strip().lower() in existing_texts:
                    continue
                normalized.append(item)
                if len(normalized) >= 3:
                    break
        filtered = self._dedupe_fun_facts_against_key_facts(normalized, key_facts)
        return filtered

    def extract_suggested_actions(self, transcript: str, profile: dict[str, Any]) -> list[dict[str, Any]]:
        cleaned = transcript.strip()
        fallback = self._fallback_suggested_actions(cleaned, profile)
        if not cleaned:
            return fallback
        prompt = (
            "Extract all actionable items from the following conversation note.\n\n"
            "Requirements:\n"
            "- Return output strictly in valid JSON format.\n"
            "- Output must be an array of objects under the key \"action_items\".\n"
            "- Each action item object must contain:\n"
            "  - \"action\": a clear, concise description of the task.\n"
            "  - \"deadline\": explicit deadline if mentioned, otherwise null.\n"
            "  - \"quote\": an exact quote or minimally edited extract from the conversation note that justifies the action.\n"
            "- Only include items that require follow-up, delivery, scheduling, or sending something.\n"
            "- Do not infer actions that are not grounded in the text.\n"
            "- Preserve fidelity to the original wording in the \"quote\" field.\n"
            "- Keep action items distinct and non-overlapping.\n"
            "- Make each action specific and executable; avoid vague phrasing.\n"
            "- If a deadline is explicit and calendar-based, use YYYY-MM-DD; otherwise use null.\n"
            "- Include up to 8 action items if present.\n\n"
            f"Conversation note:\n{cleaned}"
        )
        parsed = self._json_generation(prompt, {"action_items": []})
        items = parsed.get("action_items")
        if not isinstance(items, list):
            items = []
        normalized = self._normalize_prompt_action_items(items, cleaned)
        cue_actions = self._extract_actions_from_cues(cleaned, profile)
        merged = self._merge_actions(cue_actions, normalized)
        return merged or fallback

    def _normalize_prompt_action_items(self, items: list[dict[str, Any]], transcript: str) -> list[dict[str, Any]]:
        converted: list[dict[str, Any]] = []
        for raw in items:
            if not isinstance(raw, dict):
                continue
            action_text = self._strip_context_prefix(str(raw.get("action") or "").strip())
            quote_text = self._strip_context_prefix(str(raw.get("quote") or "").strip())
            deadline = raw.get("deadline")
            if not action_text or not quote_text:
                continue
            due_date = None
            if isinstance(deadline, str) and re.fullmatch(r"\d{4}-\d{2}-\d{2}", deadline.strip()):
                due_date = deadline.strip()
            elif isinstance(deadline, str):
                due_date = self._extract_due_date(deadline)

            action_type = self._infer_action_type(action_text)
            converted.append(
                {
                    "type": action_type,
                    "title": action_text[:180],
                    "description": action_text[:320],
                    "priority": "high" if due_date else "medium",
                    "due_date": due_date,
                    "highlighted_text": quote_text[:260],
                }
            )
        return self._normalize_action_items(converted, transcript)

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
        for item in result["recommendations"]:
            if not isinstance(item, dict):
                continue
            explanation = str(item.get("explanation") or "").strip()
            if explanation:
                item["explanation"] = explanation[:220]
        return result

    def answer_query_from_contacts(self, query: str, contacts: list[dict[str, Any]]) -> dict[str, Any]:
        cleaned_query = query.strip()
        if not cleaned_query:
            return {
                "message": "Ask me anything about your saved profiles, conversations, insights, or actions.",
                "recommendations": [],
            }
        if not self.api_key:
            return {
                "message": (
                    "Gemini is not configured. Add `GEMINI_API_KEY` to your `.env` and restart the API server "
                    "to enable chat answers."
                ),
                "recommendations": [],
            }
        if not contacts:
            return {
                "message": (
                    "I couldn't find any profiles yet. Add or import contacts first, then I can answer questions "
                    "from their notes, insights, and action items."
                ),
                "recommendations": [],
            }

        recommendation_payload = self.recommend_contacts(cleaned_query, contacts)
        recommendations = recommendation_payload.get("recommendations", [])
        is_recommendation_query = self._is_recommendation_query(cleaned_query)
        prepared_contacts = self._prepare_contacts_for_answering(contacts)
        query_terms = [term for term in re.findall(r"[a-zA-Z]+", cleaned_query.lower()) if len(term) > 2]
        name_matches = self._name_matches_from_query(query_terms, prepared_contacts)

        # For person-specific questions, send full known profile context for that person.
        if name_matches:
            focus_contacts = name_matches[:2]
            focused_prompt = (
                "You are a warm, human networking assistant.\n"
                "Answer the user's question using only the provided profile data.\n"
                "Style rules:\n"
                "- Sound natural and conversational, not robotic.\n"
                "- Give a direct answer first, then short supporting bullets when helpful.\n"
                "- If data is incomplete, say that plainly.\n"
                "- Do not invent facts.\n\n"
                f"User question:\n{cleaned_query}\n\n"
                f"Focused person data:\n{json.dumps(focus_contacts)}"
            )
            focused_message = self._call_gemini(focused_prompt)
            if not focused_message:
                return {
                    "message": (
                        "I couldn't get a response from Gemini right now. "
                        "Please try again in a few seconds."
                    ),
                    "recommendations": [],
                }
            return {
                "message": focused_message.strip(),
                "recommendations": recommendations if is_recommendation_query and isinstance(recommendations, list) else [],
            }

        prompt = (
            "You are a networking assistant answering questions strictly from the user's saved CRM/profile data.\n"
            "Rules:\n"
            "- Only use facts present in the provided contacts JSON.\n"
            "- If data is missing, say that clearly and suggest what to capture next.\n"
            "- Provide a direct answer first, then up to 3 concise supporting bullets.\n"
            "- Do not invent names, jobs, events, dates, or action items.\n"
            "- Keep the answer under 140 words.\n\n"
            f"User question:\n{cleaned_query}\n\n"
            f"Contacts data:\n{json.dumps(prepared_contacts)}"
        )
        message = self._call_gemini(prompt)
        if not message:
            return {
                "message": (
                    "I couldn't get a response from Gemini right now. "
                    "Please try again in a few seconds."
                ),
                "recommendations": [],
            }
        return {
            "message": message.strip(),
            "recommendations": recommendations if is_recommendation_query and isinstance(recommendations, list) else [],
        }

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
        response = self._call_gemini_payload(payload, model=self.vision_model)
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
        return self._call_gemini_payload(payload, model=self.chat_model)

    def _call_gemini_payload(self, payload: dict[str, Any], model: str | None = None) -> str | None:
        if not self.api_key:
            return None
        resolved_model = (model or self.chat_model or "gemini-1.5-flash").strip()
        req = request.Request(
            f"https://generativelanguage.googleapis.com/v1beta/models/{resolved_model}:generateContent?key={parse.quote(self.api_key)}",
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

    def _strip_context_prefix(self, text: str) -> str:
        if not text:
            return ""
        # Remove bracketed recording context prefixes such as:
        # [In-Person | Conversation | Unknown location]
        cleaned = re.sub(r"^\[[^\]]+\]\s*", "", text.strip())
        return cleaned.strip()

    def _is_fun_fact_candidate(self, text: str) -> bool:
        lowered = text.lower()
        personal_terms = (
            "enjoy", "enjoys", "likes", "loves", "hobby", "outside work", "outside of work",
            "family", "kids", "dog", "cat", "pet", "travel", "running", "marathon", "coffee",
            "espresso", "music", "book", "reading", "cook", "cooking", "mentor", "mentoring",
            "volunteer", "weekend", "sports", "fitness", "dinner", "cycling", "hiking",
            "curious", "thoughtful", "collaborative", "calm", "warm", "community", "hosts"
        )
        business_terms = (
            "vp", "director", "campaign", "enterprise", "product", "marketing", "roadmap",
            "sales", "launch", "region", "kpi", "revenue", "pipeline", "analytics", "challenge"
        )
        has_personal = any(term in lowered for term in personal_terms)
        has_business = any(term in lowered for term in business_terms)
        return has_personal and not has_business

    def _is_action_like_statement(self, text: str) -> bool:
        lowered = text.lower()
        action_terms = (
            "available for", "open to", "follow-up", "schedule", "requested", "request",
            "asked", "send", "share", "write-up", "blurb", "deadline", "next tuesday",
            "week of", "coffee in", "introduce", "introduction", "deliver", "proposal"
        )
        return any(term in lowered for term in action_terms)

    def _dedupe_fun_facts_against_key_facts(
        self,
        fun_facts: list[dict[str, Any]],
        key_facts: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        if not fun_facts:
            return []
        key_texts = [
            self._normalize_for_compare(str(item.get("text") or ""))
            for item in key_facts
            if isinstance(item, dict)
        ]
        deduped: list[dict[str, Any]] = []
        seen_fun: set[str] = set()
        for item in fun_facts:
            text = self._normalize_for_compare(str(item.get("text") or ""))
            if not text or text in seen_fun:
                continue
            if any(
                text == key_text
                or text in key_text
                or key_text in text
                for key_text in key_texts
                if key_text
            ):
                continue
            seen_fun.add(text)
            deduped.append(item)
        return deduped

    def _normalize_for_compare(self, text: str) -> str:
        lowered = self._strip_context_prefix(text).lower()
        lowered = re.sub(r"[^a-z0-9\s]", " ", lowered)
        lowered = re.sub(r"\s+", " ", lowered).strip()
        return lowered

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
            text = self._strip_context_prefix(str(raw.get("text") or "").strip())
            highlighted_text = self._strip_context_prefix(str(raw.get("highlighted_text") or "").strip())
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

    def _normalize_key_insights(self, items: list[dict[str, Any]], transcript: str) -> list[dict[str, Any]]:
        mapped: list[dict[str, Any]] = []
        seen: set[str] = set()
        category_map = {
            "professional_focus": "Professional",
            "current_priority": "Goal",
            "pain_point": "Background",
            "personal_context": "Personal",
            "relationship_opportunity": "Interest",
        }
        for raw in items:
            if not isinstance(raw, dict):
                continue
            insight_text = self._strip_context_prefix(str(raw.get("insight") or "").strip())
            quote_text = self._strip_context_prefix(str(raw.get("quote") or "").strip())
            category_text = str(raw.get("category") or "").strip().lower()
            if not insight_text or not quote_text:
                continue
            dedupe_key = insight_text.lower()
            if dedupe_key in seen:
                continue
            seen.add(dedupe_key)
            mapped_category = category_map.get(category_text, "Professional")
            highlighted = quote_text
            if quote_text not in transcript:
                highlighted = self._pick_supporting_excerpt(transcript, insight_text, quote_text)
            mapped.append(
                {
                    "text": insight_text[:220],
                    "source": "Conversation",
                    "category": mapped_category,
                    "highlighted_text": highlighted[:260],
                }
            )
        return mapped

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
        cleaned_sentences = [self._strip_context_prefix(sentence) for sentence in sentences]
        selected = [sentence for sentence in cleaned_sentences if sentence][:6]
        return [
            {
                "text": sentence[:220],
                "source": "Conversation",
                "category": self._fallback_label(sentence, label_priority),
                "highlighted_text": sentence[:260],
            }
            for sentence in selected
        ]

    def _fallback_fun_facts(self, transcript: str) -> list[dict[str, Any]]:
        sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", transcript) if s.strip()]
        cleaned = [self._strip_context_prefix(sentence) for sentence in sentences]
        selected = [
            sentence
            for sentence in cleaned
            if sentence and self._is_fun_fact_candidate(sentence) and not self._is_action_like_statement(sentence)
        ]
        if not selected:
            return []
        return [
            {
                "text": sentence[:220],
                "source": "Conversation",
                "category": "interest",
                "highlighted_text": sentence[:260],
            }
            for sentence in selected[:8]
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

    def _infer_action_type(self, action_text: str) -> str:
        lowered = action_text.lower()
        if any(term in lowered for term in ("schedule", "coffee", "meeting", "calendar", "call")):
            return "meeting" if "meeting" in lowered or "coffee" in lowered or "calendar" in lowered else "call"
        if any(term in lowered for term in ("introduce", "introduction", "forward")):
            return "introduction"
        if any(term in lowered for term in ("share", "send", "write-up", "blurb", "email", "draft")):
            return "share"
        return "follow-up"

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
        return self._strip_context_prefix(best_sentence)[:260]

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
            "recommendations": [
                {
                    **item,
                    "explanation": str(item.get("explanation") or "").strip()[:220],
                }
                for item in recommendations
            ],
        }

    def _is_recommendation_query(self, query: str) -> bool:
        lowered = query.lower()
        recommendation_terms = (
            "who should", "who can", "who in my network", "recommend", "intro", "introduction",
            "talk to", "connect with", "best contact", "best person"
        )
        return any(term in lowered for term in recommendation_terms)

    def _prepare_contacts_for_answering(self, contacts: list[dict[str, Any]]) -> list[dict[str, Any]]:
        prepared: list[dict[str, Any]] = []
        for contact in contacts[:15]:
            if not isinstance(contact, dict):
                continue
            key_facts = [str(item.get("text") or "").strip() for item in contact.get("keyFacts", []) if isinstance(item, dict)]
            fun_facts = [str(item.get("text") or "").strip() for item in contact.get("funFacts", []) if isinstance(item, dict)]
            actions = [
                {
                    "title": str(item.get("title") or "").strip(),
                    "description": str(item.get("description") or "").strip(),
                    "priority": str(item.get("priority") or "").strip(),
                    "status": str(item.get("status") or "").strip(),
                    "dueDate": item.get("dueDate"),
                }
                for item in contact.get("suggestedActions", [])
                if isinstance(item, dict)
            ]
            conversations = contact.get("conversations", [])
            latest_conversation = {}
            if isinstance(conversations, list) and conversations:
                first = conversations[0]
                if isinstance(first, dict):
                    latest_conversation = {
                        "occasion": str(first.get("occasion") or "").strip(),
                        "date": str(first.get("date") or "").strip(),
                        "location": str(first.get("location") or "").strip(),
                    }
            prepared.append(
                {
                    "id": contact.get("id"),
                    "name": str(contact.get("name") or "").strip(),
                    "title": str(contact.get("title") or "").strip(),
                    "company": str(contact.get("company") or "").strip(),
                    "location": str(contact.get("location") or "").strip(),
                    "notes": str(contact.get("notes") or "").strip()[:420],
                    "keyFacts": [item for item in key_facts if item][:5],
                    "funFacts": [item for item in fun_facts if item][:5],
                    "suggestedActions": [item for item in actions if item.get("title")][:5],
                    "latestConversation": latest_conversation,
                    "conversations": [
                        {
                            "occasion": str(item.get("occasion") or "").strip(),
                            "date": str(item.get("date") or "").strip(),
                            "location": str(item.get("location") or "").strip(),
                            "fullTranscript": str(item.get("fullTranscript") or "").strip()[:900],
                        }
                        for item in (conversations[:3] if isinstance(conversations, list) else [])
                        if isinstance(item, dict)
                    ],
                }
            )
        return prepared

    def _fallback_profile_answer(
        self,
        query: str,
        contacts: list[dict[str, Any]],
        recommendations: list[dict[str, Any]],
    ) -> str:
        lowered_query = query.lower()
        lowered_query_terms = [term for term in re.findall(r"[a-zA-Z]+", lowered_query) if len(term) > 2]
        if self._is_recommendation_query(query) and recommendations:
            top = recommendations[:3]
            lines = []
            for item in top:
                name = item.get("name") or "Unknown contact"
                role = item.get("role") or "Role not listed"
                company = item.get("company") or "Company not listed"
                reason = item.get("explanation") or "Relevant based on your saved profile data."
                lines.append(f"- {name}: {role} at {company}. {reason}")
            return "Best matches from your saved profiles:\n" + "\n".join(lines)

        name_matches = self._name_matches_from_query(lowered_query_terms, contacts)
        asks_for_interests = any(
            term in lowered_query
            for term in ("like to do", "likes to", "hobby", "hobbies", "interest", "interests", "outside work")
        )
        if name_matches and asks_for_interests:
            contact = name_matches[0]
            fun_facts = [item for item in contact.get("funFacts", []) if isinstance(item, str) and item.strip()]
            if fun_facts:
                selected = fun_facts[:3]
                lines = [f"- {self._clean_snippet(item)}" for item in selected]
                return f"{contact.get('name') or 'This contact'}'s interests from your saved profiles:\n" + "\n".join(lines)
            return (
                f"I found {contact.get('name') or 'this contact'}, but I don't see clear hobbies/interests saved yet. "
                "Add personal details in notes or conversation transcripts, then refresh analysis."
            )

        ranked: list[tuple[int, dict[str, Any]]] = []
        for contact in contacts:
            haystack = " ".join(
                [
                    str(contact.get("name") or ""),
                    str(contact.get("title") or ""),
                    str(contact.get("company") or ""),
                    str(contact.get("location") or ""),
                    str(contact.get("notes") or ""),
                    " ".join(contact.get("keyFacts") or []),
                    " ".join(contact.get("funFacts") or []),
                    " ".join(
                        f"{item.get('title','')} {item.get('description','')}"
                        for item in (contact.get("suggestedActions") or [])
                        if isinstance(item, dict)
                    ),
                ]
            ).lower()
            score = sum(1 for term in lowered_query_terms if term in haystack)
            ranked.append((score, contact))
        ranked.sort(key=lambda item: item[0], reverse=True)
        matches = name_matches or [contact for score, contact in ranked if score > 0][:3]
        if not matches:
            return (
                "I couldn't find a direct answer in your current profile data. "
                "Try asking about a specific contact name, company, insight, or action item."
            )
        lines = []
        for contact in matches:
            label = self._contact_label(contact)
            details = self._contact_detail_snippet(contact)
            if details:
                lines.append(f"- {label}: {details}")
            else:
                lines.append(f"- {label}")
        return "From your saved profiles, here are the most relevant details:\n" + "\n".join(lines)

    def _name_matches_from_query(self, query_terms: list[str], contacts: list[dict[str, Any]]) -> list[dict[str, Any]]:
        ranked: list[tuple[int, dict[str, Any]]] = []
        query_set = set(query_terms)
        for contact in contacts:
            name_words = [word for word in re.findall(r"[a-zA-Z]+", str(contact.get("name") or "").lower()) if len(word) > 2]
            if not name_words:
                continue
            overlap = sum(1 for word in name_words if word in query_set)
            if overlap > 0:
                ranked.append((overlap, contact))
        ranked.sort(key=lambda item: item[0], reverse=True)
        return [contact for _, contact in ranked]

    def _contact_label(self, contact: dict[str, Any]) -> str:
        name = str(contact.get("name") or "").strip() or "Unknown contact"
        role = str(contact.get("title") or "").strip()
        company = str(contact.get("company") or "").strip()
        if role and company:
            return f"{name} ({role} at {company})"
        if role:
            return f"{name} ({role})"
        if company:
            return f"{name} ({company})"
        return name

    def _contact_detail_snippet(self, contact: dict[str, Any]) -> str:
        fun_facts = [self._clean_snippet(item) for item in (contact.get("funFacts") or []) if isinstance(item, str) and item.strip()]
        key_facts = [self._clean_snippet(item) for item in (contact.get("keyFacts") or []) if isinstance(item, str) and item.strip()]
        notes = self._clean_snippet(str(contact.get("notes") or ""))
        for candidate in [*fun_facts, *key_facts, notes]:
            if candidate:
                return candidate[:160]
        return ""

    def _clean_snippet(self, text: str) -> str:
        cleaned = re.sub(r"\s+", " ", str(text or "")).strip()
        return cleaned.rstrip(" -:;,")

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

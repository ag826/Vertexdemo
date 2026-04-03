from __future__ import annotations

from io import BytesIO

import speech_recognition as sr


class TranscriptionError(Exception):
    pass


class TranscriptionService:
    def __init__(self) -> None:
        self.recognizer = sr.Recognizer()

    def transcribe_wav_bytes(self, audio_bytes: bytes) -> str:
        if not audio_bytes:
            raise TranscriptionError("Audio file is empty.")

        try:
            with sr.AudioFile(BytesIO(audio_bytes)) as source:
                audio = self.recognizer.record(source)
        except Exception as exc:  # pragma: no cover
            raise TranscriptionError("Unable to read uploaded audio. Please try again.") from exc

        try:
            transcript = self.recognizer.recognize_google(audio)
        except sr.UnknownValueError as exc:
            raise TranscriptionError("Speech could not be understood. Try speaking more clearly or use the notes box.") from exc
        except sr.RequestError as exc:
            raise TranscriptionError("Speech recognition service is unavailable right now. Check your internet connection or use manual notes.") from exc

        cleaned = transcript.strip()
        if not cleaned:
            raise TranscriptionError("No speech detected in the recording.")
        return cleaned

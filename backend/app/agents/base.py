"""Common base for the five CODEX agents.

Every agent has two modes (see config.py):
  * "rules"      — the built-in, dependency-free demo implementation (default)
  * "production" — plug in the real service named in SA-07 (Textract, BioBERT, fine-tuned LLM ...).
Production hooks are marked with `TODO(production)`.
"""
from ..config import Settings, get_settings


class Agent:
    name = "agent"
    role = ""

    def __init__(self, settings: Settings | None = None):
        self.settings = settings or get_settings()

    def mode(self, key: str) -> str:
        return getattr(self.settings, key, "rules")

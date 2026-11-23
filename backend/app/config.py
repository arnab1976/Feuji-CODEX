"""Runtime configuration (environment variables or .env)."""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="CODEX_", extra="ignore")

    app_name: str = "CODEX — Clinical Outcome Documentation EXtraction Engine"
    version: str = "1.1.0"
    database_url: str = "sqlite:///./codex.db"          # e.g. postgresql+psycopg://user:pw@db:5432/codex
    cors_origins: str = "*"                             # comma-separated; set to the Healthcare 360 origin in prod
    default_threshold: float = 0.90                     # confidence gate auto-submit threshold
    max_upload_mb: int = 20

    # --- agent modes: "rules" (built-in demo engine) or "production" (plug real services) ---
    ocr_mode: str = "rules"        # production → AWS Textract / LayoutLMv3 / Document AI
    ner_mode: str = "rules"        # production → BioBERT / Med-BERT service
    coder_mode: str = "rules"      # production → fine-tuned LLM HCC coder
    llm_provider: str = ""         # e.g. "openai" | "anthropic" | "azure-openai"
    llm_model: str = ""
    llm_api_key: str = ""

    # --- Patient 360 / Healthcare 360 integration ---
    patient360_webhook_url: str = ""   # if set, codex:result is POSTed here server-side
    patient360_webhook_token: str = ""

    # serve the built React app from FastAPI (single-container deploy)
    serve_frontend: bool = True
    frontend_dist: str = "../frontend/dist"


@lru_cache
def get_settings() -> Settings:
    return Settings()

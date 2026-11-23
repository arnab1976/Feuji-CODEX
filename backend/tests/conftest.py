import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
os.environ.setdefault("CODEX_DATABASE_URL", "sqlite:///./test_codex.db")
os.environ.setdefault("CODEX_SERVE_FRONTEND", "false")

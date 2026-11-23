"""Database setup — SQLite by default, any SQLAlchemy URL (e.g. PostgreSQL) via CODEX_DATABASE_URL."""
from datetime import datetime, timezone
from sqlalchemy import JSON, DateTime, Float, Integer, String, Text, create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

from .config import get_settings

_settings = get_settings()
_kwargs = {"connect_args": {"check_same_thread": False}} if _settings.database_url.startswith("sqlite") else {}
engine = create_engine(_settings.database_url, **_kwargs)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def utcnow():
    return datetime.now(timezone.utc)


class Record(Base):
    """One medical record moving through the CODEX journey."""
    __tablename__ = "records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    session_id: Mapped[str] = mapped_column(String(64), index=True, default="default")
    tenant_id: Mapped[str] = mapped_column(String(64), index=True, default="harbor")
    name: Mapped[str] = mapped_column(String(255))
    source: Mapped[str] = mapped_column(String(120))
    curated_key: Mapped[str | None] = mapped_column(String(4), nullable=True)
    text: Mapped[str] = mapped_column(Text, default="")
    meta: Mapped[dict] = mapped_column(JSON, default=dict)
    chart: Mapped[dict | None] = mapped_column(JSON, nullable=True)      # pipeline output
    stage: Mapped[int] = mapped_column(Integer, default=0)                # 0 = new, 3 = processed
    threshold: Mapped[float] = mapped_column(Float, default=0.9)
    decisions: Mapped[dict] = mapped_column(JSON, default=dict)          # {code: {d: acc|rej, t: iso}}
    delete_overrides: Mapped[dict] = mapped_column(JSON, default=dict)   # {code: true} = keep
    query_response: Mapped[str | None] = mapped_column(String(10), nullable=True)  # yes|next|und
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class Tenant(Base):
    """One buying organisation. Its charts, subscription, and usage stay separate from every other tenant."""
    __tablename__ = "tenants"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    kind: Mapped[str] = mapped_column(String(32))
    kind_label: Mapped[str] = mapped_column(String(80))
    summary: Mapped[str] = mapped_column(Text, default="")


class Subscription(Base):
    """The plan, term, and committed quantity currently in force for a tenant."""
    __tablename__ = "subscriptions"

    tenant_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    plan_id: Mapped[str] = mapped_column(String(40))
    duration: Mapped[str] = mapped_column(String(16))
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class UsageEvent(Base):
    """One chart coded for a tenant. Counted once per record, inside the subscription term."""
    __tablename__ = "usage_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(String(64), index=True)
    record_id: Mapped[str] = mapped_column(String(36), unique=True)
    kind: Mapped[str] = mapped_column(String(16), default="chart")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


def _ensure_tenant_column():
    insp = inspect(engine)
    if "records" not in insp.get_table_names():
        return
    cols = {c["name"] for c in insp.get_columns("records")}
    if "tenant_id" not in cols:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE records ADD COLUMN tenant_id VARCHAR(64) DEFAULT 'harbor'"))


def init_db():
    Base.metadata.create_all(engine)
    _ensure_tenant_column()
    from .tenancy import seed
    seed()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

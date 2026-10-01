"""
SERA Database Connection & Session Management
Supports both PostgreSQL (production / Docker) and SQLite (local dev fallback).
"""
import os
import socket
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import NullPool

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    pg_available = False
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(0.4)
        res = sock.connect_ex(('127.0.0.1', 5432))
        sock.close()
        pg_available = (res == 0)
    except Exception:
        pg_available = False

    if pg_available:
        DATABASE_URL = "postgresql://sera_user:sera_pass@localhost:5432/sera_db"
    else:
        db_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        db_path = os.path.join(db_dir, "sera.db")
        DATABASE_URL = f"sqlite:///{db_path}"

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    poolclass=NullPool,
    connect_args=connect_args,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database tables using SQLAlchemy models (universal for PG and SQLite)"""
    try:
        import models.db_models  # noqa: F401
    except ImportError:
        try:
            import backend.models.db_models  # noqa: F401
        except ImportError:
            import sera.backend.models.db_models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    dialect_name = engine.dialect.name
    db_display = str(DATABASE_URL or "")
    print(f"[DB] Database initialized successfully using {dialect_name} ({db_display.split('@')[-1] if '@' in db_display else db_display}).")


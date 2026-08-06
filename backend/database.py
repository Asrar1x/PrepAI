import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

# We will use SQLite for local MVP generation to avoid local PostgreSQL setup overhead for the user.
# The schema easily ports to Postgres natively when deployed.
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./prepai.db")

# For sqlite we need connect_args={"check_same_thread": False}, for Postgres we don't.
is_sqlite = SQLALCHEMY_DATABASE_URL.startswith("sqlite")
connect_args = {"check_same_thread": False} if is_sqlite else {}

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

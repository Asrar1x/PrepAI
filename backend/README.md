# PrepAI Backend

PrepAI is an AI-powered mock interview platform for college placements.
This is the backend implementation using FastAPI, PostgreSQL, and Redis.

## Setup

1. Create a virtual environment: `python -m venv venv`
2. Activate it: `source venv/bin/activate` or `venv\Scripts\activate`
3. Install requirements: `pip install -r requirements.txt`
4. Set up environment variables in `.env` based on `.env.example`
5. Start services with Docker Compose: `docker-compose up -d`
6. Run migrations: `alembic upgrade head`
7. Start server: `uvicorn app.main:app --reload`

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import os
from app.api.v1 import auth, users, health, voice, aptitude, resume, interview, intelligence, admin, notifications
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import init_db_extensions
from app.core.redis import redis_client

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db_extensions()
    await redis_client.connect()
    
    # Initialize ML Models
    from app.ai.custom_models.model_manager import ml_models
    ml_models.initialize()
    
    yield
    # Shutdown
    await redis_client.disconnect()

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="PrepAI Backend API", version="1.0.0", lifespan=lifespan)
os.makedirs(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../reports")), exist_ok=True)
app.mount("/reports", StaticFiles(directory=os.path.abspath(os.path.join(os.path.dirname(__file__), "../../reports"))), name="reports")
os.makedirs(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../uploads")), exist_ok=True)
app.mount("/uploads", StaticFiles(directory=os.path.abspath(os.path.join(os.path.dirname(__file__), "../../uploads"))), name="uploads")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api/v1/health", tags=["Health"])
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])
app.include_router(voice.router, prefix="/api/v1/voice", tags=["Voice"])
app.include_router(aptitude.router, prefix="/api/v1/aptitude", tags=["Aptitude"])
app.include_router(resume.router, prefix="/api/v1/resumes", tags=["Resumes"])
app.include_router(interview.router, prefix="/api/v1/interview", tags=["Interview"])
app.include_router(intelligence.router, prefix="/api/v1", tags=["Intelligence"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["Admin"])
app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["Notifications"])

@app.get("/")
def root():
    return {"message": "PrepAI API is running."}

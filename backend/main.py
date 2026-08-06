from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from backend.database import engine, Base, get_db
from sqlalchemy.orm import Session
import json

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="PrepAI Backend", version="2.0")

# Allow Frontend React App to communicate with Backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For dev. In prod: ["http://localhost:5173"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to PrepAI API Server (v2.0)"}

# -----------------
# WEBSOCKET ENGINE (AI Mock Interview)
# -----------------
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        # Send initial AI greeting
        await websocket.send_json({
            "sender": "ai",
            "message": "Hello! I am your AI Interviewer. Please introduce yourself and tell me why you're interested in this role."
        })

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def generate_ai_response(self, text: str) -> str:
        # NOTE: Placeholder for Claude/Gemini LLM logic
        # Here we would send transcript & prompt to Claude API
        return f"That's interesting. You said: '{text}'. Can you elaborate on the technical challenges you faced?"

manager = ConnectionManager()

@app.websocket("/ws/interview")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Receive message (speech-to-text string from frontend)
            data = await websocket.receive_text()
            
            # Here we would normally forward audio/text to Deepgram/Claude
            # For now, simulate AI thinking delay
            reply = await manager.generate_ai_response(data)
            
            await websocket.send_json({
                "sender": "ai",
                "message": reply
            })
    except WebSocketDisconnect:
        manager.disconnect(websocket)

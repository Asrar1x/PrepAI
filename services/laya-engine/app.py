"""
PrepAI Laya Decision Service (FastAPI).

- Loads convaiinnovations/laya once at startup (never per request).
- POST /internal/laya/decision : one typed decision (spec §8.3)
- POST /internal/laya/batch    : several decisions + concept presence in one forward pass
- POST /evaluate               : legacy alias of /internal/laya/batch
- POST /internal/resume/extract: PyMuPDF text extraction for resume intelligence (spec §13.1)
- GET  /health                 : readiness + model metadata

Failures return HTTP errors (503 when the model is not ready). Nothing is guessed.
"""

import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

from health import router as health_router
from model import load_laya_agent
import evaluator
from schemas import DecisionRequest, DecisionResponse, BatchDecisionRequest, BatchDecisionResponse, ResumeExtractResponse

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("laya-engine.app")

MAX_RESUME_BYTES = 5 * 1024 * 1024
MAX_RESUME_PAGES = 30


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Laya decision service...")
    load_laya_agent()
    yield
    logger.info("Laya decision service stopped.")


app = FastAPI(
    title="PrepAI Laya Decision Service",
    description="Typed, probability-bearing decisions from convaiinnovations/laya for PrepAI",
    version="2.0.0",
    lifespan=lifespan,
)

# Internal service: only the PrepAI API (server-to-server) calls it
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in os.getenv("LAYA_CORS_ORIGINS", "").split(",") if o],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)
app.include_router(health_router)


def _run(fn, *args):
    try:
        return fn(*args)
    except evaluator.UnknownDecisionType as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except evaluator.LayaUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@app.post("/internal/laya/decision", response_model=DecisionResponse, tags=["Decisions"])
def decision_endpoint(req: DecisionRequest):
    return _run(evaluator.decide, req.decision_type, req.state)


@app.post("/internal/laya/batch", response_model=BatchDecisionResponse, tags=["Decisions"])
def batch_endpoint(req: BatchDecisionRequest):
    return _run(evaluator.decide_batch, req)


@app.post("/evaluate", response_model=BatchDecisionResponse, tags=["Decisions"])
def evaluate_endpoint(req: BatchDecisionRequest):
    return _run(evaluator.decide_batch, req)


@app.post("/internal/resume/extract", response_model=ResumeExtractResponse, tags=["Resume"])
async def resume_extract(file: UploadFile = File(...)):
    # Read at most one byte past the limit, so an oversized upload is never held in memory
    data = await file.read(MAX_RESUME_BYTES + 1)
    if len(data) > MAX_RESUME_BYTES:
        raise HTTPException(status_code=413, detail="Resume must be 5 MB or smaller")
    if not data.startswith(b"%PDF-"):
        raise HTTPException(status_code=400, detail="File is not a PDF")
    try:
        import pymupdf
        doc = pymupdf.open(stream=data, filetype="pdf")
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Could not open PDF: {exc}")
    pages, links = [], []
    try:
        # A resume is a few pages; cap the work so a crafted many-page PDF cannot pin the CPU
        if doc.page_count > MAX_RESUME_PAGES:
            raise HTTPException(status_code=413, detail=f"Resume must have at most {MAX_RESUME_PAGES} pages")
        for page in doc:
            # sort=True yields natural reading order for multi-column resumes
            pages.append(page.get_text("text", sort=True))
            for link in page.get_links():
                uri = link.get("uri")
                if uri and uri not in links:
                    links.append(uri)
    finally:
        doc.close()
    text = "\n".join(pages).strip()
    return ResumeExtractResponse(text=text, page_count=len(pages), char_count=len(text), extractor="pymupdf", links=links)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host=os.getenv("LAYA_HOST", "127.0.0.1"), port=int(os.getenv("PORT", "7860")), reload=False)

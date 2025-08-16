import os
from typing import Optional

from dotenv import load_dotenv
from pathlib import Path
from fastapi import FastAPI, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from supabase import create_client, Client

from rag import rag_pipeline
from openai import RateLimitError
from mangum import Mangum

# Load environment variables from local .env
backend_env = Path(__file__).with_name('.env')
if backend_env.exists():
    load_dotenv(dotenv_path=backend_env)
load_dotenv()

# Supabase setup (optional for this RAG flow; kept for future DB usage)
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

supabase: Optional[Client] = None
if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI()

# CORS middleware setup
origins = [
    "http://localhost:3000",
]

# Allow additional origins from env (comma-separated)
allowed_origins_env = os.environ.get("ALLOWED_ORIGINS")
if allowed_origins_env:
    origins.extend([o.strip() for o in allowed_origins_env.split(",") if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RAGQueryRequest(BaseModel):
    question: str = Field(..., description="使用者問題（短句）")
    audience: Optional[str] = Field(default=None)
    top_k: int = Field(default=8, ge=1, le=20)
    match_threshold: float = Field(default=0.0)
    doc_id: Optional[str] = Field(default=None)
    include_context: bool = Field(default=False)
    generation_in_backend: bool = Field(default=True)


@app.post("/rag/query")
async def post_rag_query(
    payload: RAGQueryRequest,
    request: Request,
    x_api_key: Optional[str] = Header(default=None, convert_underscores=False),
):
    # Optional API key gate
    expected_api_key = os.environ.get("RAG_API_KEY")
    if expected_api_key and x_api_key != expected_api_key:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")

    try:
        result = await rag_pipeline(
            question=payload.question.strip(),
            audience=payload.audience,
            top_k=payload.top_k,
            match_threshold=payload.match_threshold,
            doc_id=payload.doc_id,
            include_context=payload.include_context,
        )
        return result
    except RateLimitError as e:
        # 將 LLM 配額不足透傳給前端
        raise HTTPException(status_code=429, detail={
            "code": "llm_quota_exceeded",
            "message": "LLM 配額不足（insufficient_quota），請檢查計費或稍後再試。"
        })
    except HTTPException:
        raise
    except Exception as e:
        print(f"RAG error: {e}")
        raise HTTPException(status_code=500, detail="Server error in RAG pipeline")


@app.get("/api/resume")
def get_resume():
    """Fetches the complete resume data from the Supabase 'resume' table if configured."""
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase is not configured")
    try:
        response = supabase.table("resume").select("*").limit(1).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Resume data not found")
        resume_data = response.data[0]
        formatted_data = {
            "contact": resume_data.get("contact"),
            "education": resume_data.get("education"),
            "jobs": resume_data.get("jobs"),
            "projects": resume_data.get("projects"),
            "skills": resume_data.get("skills"),
            "about_me": resume_data.get("about_me"),
        }
        return formatted_data
    except Exception as e:
        print(f"An error occurred: {e}")
        raise HTTPException(status_code=500, detail="An internal server error occurred.")


# AWS Lambda handler via Mangum
handler = Mangum(app)

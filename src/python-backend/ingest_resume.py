import os
import json
import asyncio
import sys
from typing import Any, Dict, List

from dotenv import load_dotenv
from pathlib import Path
from supabase import create_client

from rag import chunk_and_embed_resume
from openai import RateLimitError


def _chunk_list(items: List[Dict[str, Any]], size: int) -> List[List[Dict[str, Any]]]:
    return [items[i : i + size] for i in range(0, len(items), size)]


async def _build_rows(doc_id: str, resume_json_path: str) -> List[Dict[str, Any]]:
    with open(resume_json_path, "r", encoding="utf-8") as f:
        resume = json.load(f)

    context_chunks, _ = await chunk_and_embed_resume(resume)
    rows: List[Dict[str, Any]] = []
    for c in context_chunks:
        vector = c.get("_vector")
        if vector is None:
            continue
        rows.append(
            {
                "chunk_id": c["chunk_id"],
                "doc_id": doc_id,
                "section": c["section"],
                "idx": c["idx"],
                "split": c.get("split", 0),
                "content": c["content"],
                "metadata": {},
                "embedding": list(map(float, vector)),
            }
        )
    return rows


def main() -> None:
    # Load .env from script directory first, then project root
    script_env = Path(__file__).with_name('.env')
    if script_env.exists():
        load_dotenv(dotenv_path=script_env)
    load_dotenv()

    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY")
    if not supabase_url or not supabase_key:
        raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_KEY in environment")

    openai_key = os.environ.get("OPENAI_API_KEY")
    if not openai_key:
        raise RuntimeError("Missing OPENAI_API_KEY for embeddings")

    doc_id = os.environ.get("DOC_ID", "resume:2025-01:zh")
    resume_json_path = os.environ.get("RESUME_JSON_PATH", os.path.join("src", "nextjs", "data", "resume.json"))

    using_service_role = bool(os.environ.get("SUPABASE_SERVICE_ROLE_KEY"))
    print(f"Building embeddings for doc_id={doc_id} from {resume_json_path} ...")
    print(f"Supabase URL set: {bool(supabase_url)} | Using service role: {using_service_role}")
    try:
        rows = asyncio.run(_build_rows(doc_id, resume_json_path))
    except RateLimitError as e:
        print("[錯誤] LLM 配額不足（RateLimitError / insufficient_quota）。")
        print("訊息:", getattr(e, "message", str(e)))
        print("請檢查 OpenAI 帳戶的方案與計費狀態或稍後再試。")
        sys.exit(1)
    print(f"Prepared {len(rows)} rows. Upserting to Supabase...")

    sb = create_client(supabase_url, supabase_key)

    # Upsert in batches to avoid payload size limits
    batch_size = int(os.environ.get("UPSERT_BATCH_SIZE", "500"))
    batches = _chunk_list(rows, batch_size)
    for i, batch in enumerate(batches, start=1):
        print(f"Upsert batch {i}/{len(batches)} with {len(batch)} rows...")
        sb.table("resume_chunks").upsert(batch, on_conflict="chunk_id").execute()

    print("Done. You can now query via RPC match_resume_chunks.")


if __name__ == "__main__":
    main()



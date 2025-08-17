import json
import os
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from openai import OpenAI


def _flatten_resume(resume: Dict[str, Any]) -> List[Tuple[str, int, str]]:
    """Turn structured resume into list of (section, idx, text)."""
    chunks: List[Tuple[str, int, str]] = []

    contact = resume.get("contact") or {}
    if contact:
        text = " ".join(str(v) for v in contact.values() if v)
        if text:
            chunks.append(("contact", 0, text))

    for section_name in ["education", "jobs", "projects"]:
        items = resume.get(section_name) or []
        for i, item in enumerate(items):
            if isinstance(item, dict):
                text = " ".join(
                    [
                        *(str(v) for v in item.values() if isinstance(v, str) and v),
                        *(" ".join(v) for k, v in item.items() if isinstance(v, list) and v),
                    ]
                )
            else:
                text = str(item)
            text = text.strip()
            if text:
                chunks.append((section_name, i, text))

    skills = resume.get("skills") or {}
    if isinstance(skills, dict):
        for i, (k, v) in enumerate(skills.items()):
            if isinstance(v, list):
                text = f"{k}: " + ", ".join(v)
            else:
                text = f"{k}: {v}"
            chunks.append(("skills", i, text))

    return chunks


async def chunk_and_embed_resume(
    resume: Dict[str, Any],
    *,
    model: str = "text-embedding-3-small",
) -> Tuple[List[Dict[str, Any]], np.ndarray]:
    """
    Independent function: chunking + vectorization (embeddings) for resume data.
    Returns (context_chunks, embeddings_matrix).
    """
    client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

    linear_chunks = _flatten_resume(resume)

    if not linear_chunks:
        return [], np.zeros((0, 1536), dtype=np.float32)

    texts = [text for _, _, text in linear_chunks]
    emb_resp = client.embeddings.create(model=model, input=texts)
    vectors = np.array([d.embedding for d in emb_resp.data], dtype=np.float32)

    context_chunks: List[Dict[str, Any]] = []
    for (section, idx, text), vector in zip(linear_chunks, vectors):
        context_chunks.append(
            {
                "chunk_id": f"{section}:{idx}:0",
                "section": section,
                "idx": idx,
                "split": 0,
                "content": text,
                "_vector": vector,  # private field for in-memory search
            }
        )

    return context_chunks, vectors


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    denom = (np.linalg.norm(a) * np.linalg.norm(b))
    if denom == 0:
        return 0.0
    return float(np.dot(a, b) / denom)


def _search_similar_chunks(
    query_vector: np.ndarray,
    context_chunks: List[Dict[str, Any]],
    *,
    top_k: int,
    match_threshold: float,
) -> List[Dict[str, Any]]:
    scored: List[Tuple[float, Dict[str, Any]]] = []
    for chunk in context_chunks:
        vec = chunk.get("_vector")
        if vec is None:
            continue
        sim = _cosine_similarity(query_vector, vec)
        if sim >= match_threshold:
            item = {k: v for k, v in chunk.items() if k != "_vector"}
            item["similarity"] = sim
            scored.append((sim, item))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [item for _, item in scored[:top_k]]


async def rag_pipeline(
    *,
    question: str,
    audience: Optional[str],
    top_k: int,
    match_threshold: float,
    doc_id: Optional[str],
    include_context: bool,
) -> Dict[str, Any]:
    # Load resume from local JSON for now
    resume_path = os.environ.get("RESUME_JSON_PATH") or os.path.join(
        os.path.dirname(__file__), "..", "nextjs", "data", "resume.json"
    )
    with open(resume_path, "r", encoding="utf-8") as f:
        resume = json.load(f)

    # 1) Chunk + embed resume once
    context_chunks, _ = await chunk_and_embed_resume(resume)

    # 2) Embed question and retrieve
    client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    q_emb = client.embeddings.create(model="text-embedding-3-small", input=[question])
    q_vec = np.array(q_emb.data[0].embedding, dtype=np.float32)
    top_chunks = _search_similar_chunks(q_vec, context_chunks, top_k=top_k, match_threshold=match_threshold)

    # 3) Compose prompt
    sys_prompt = (
        "你是一個根據履歷內容回答問題的助理，以清晰、準確、可驗證為原則回答。"
        + (" 回答面向偏技術（engineering）。" if audience == "eng" else "")
        + (" 回答面向偏人資（HR）。" if audience == "hr" else "")
    )
    context_text = "\n\n".join(f"[{c['section']}#{c['idx']}] {c['content']}" for c in top_chunks)
    user_prompt = (
        f"以下是履歷的相關片段：\n{context_text}\n\n"
        f"問題：{question}\n"
        "請先以 1-3 句整體回答，再以條列方式補充重點。"
    )

    # 4) Generate
    chat = client.chat.completions.create(
        model=os.environ.get("OPENAI_MODEL", "gpt-5-nano"),
        messages=[
            {"role": "system", "content": sys_prompt},
            {"role": "user", "content": user_prompt},
        ],
    )
    answer_text = chat.choices[0].message.content or ""

    # simple bullets extraction by splitting lines
    bullets = [line.strip("- ") for line in answer_text.splitlines() if line.strip().startswith("-")]

    citations = [
        {"section": c["section"], "idx": c["idx"], "split": c.get("split")}
        for c in top_chunks
    ]

    response: Dict[str, Any] = {
        "answer": answer_text,
        "bullets": bullets,
        "citations": citations,
        "follow_up": [],
        "model": os.environ.get("OPENAI_MODEL", "gpt-5-nano"),
    }
    if include_context:
        response["contexts"] = top_chunks
    return response



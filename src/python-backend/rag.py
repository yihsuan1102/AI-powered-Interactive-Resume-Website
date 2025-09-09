import os
from typing import Any, Dict, Optional

# Import Supabase LangChain RAG pipeline
try:
    from supabase_langchain_rag import supabase_langchain_rag_pipeline
    SUPABASE_LANGCHAIN_AVAILABLE = True
except ImportError as e:
    SUPABASE_LANGCHAIN_AVAILABLE = False
    print(f"Warning: Supabase LangChain RAG not available: {e}")


async def rag_pipeline(
    *,
    question: str,
    audience: Optional[str],
    top_k: int,
    match_threshold: float,
    doc_id: Optional[str],
    include_context: bool,
) -> Dict[str, Any]:
    """
    Main RAG pipeline using Supabase + LangChain
    """
    if not SUPABASE_LANGCHAIN_AVAILABLE:
        raise RuntimeError(
            "Supabase LangChain RAG pipeline is not available. "
            "Please ensure all dependencies are installed and configured properly."
        )
    
    return await supabase_langchain_rag_pipeline(
        question=question,
        audience=audience,
        top_k=top_k,
        match_threshold=match_threshold,
        doc_id=doc_id,
        include_context=include_context
    )
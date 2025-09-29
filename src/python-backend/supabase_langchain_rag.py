import json
import os
from typing import Any, Dict, List, Optional

from langchain.schema import Document
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from langchain.vectorstores.base import VectorStore
from langchain.callbacks.base import BaseCallbackHandler
from langfuse.langchain import CallbackHandler as LangfuseCallbackHandler
from langfuse import Langfuse
from supabase import create_client, Client
import numpy as np


class SupabaseVectorStore(VectorStore):
    """LangChain compatible Supabase pgvector store"""
    
    def __init__(self, supabase_client: Client, table_name: str = "resume_chunks"):
        self.supabase = supabase_client
        self.table_name = table_name
    
    def add_texts(
        self,
        texts: List[str],
        metadatas: Optional[List[dict]] = None,
        **kwargs: Any,
    ) -> List[str]:
        """Add texts to the vector store (not implemented for this use case)"""
        raise NotImplementedError("This vector store is read-only")
    
    def similarity_search_with_score(
        self,
        query: str,
        k: int = 4,
        filter: Optional[Dict[str, Any]] = None,
        **kwargs: Any,
    ) -> List[tuple]:
        """Perform similarity search and return documents with scores"""
        # This would need the embedding of the query, but we'll handle it differently
        raise NotImplementedError("Use similarity_search_by_vector instead")
    
    def similarity_search_by_vector(
        self,
        embedding: List[float],
        k: int = 4,
        filter: Optional[Dict[str, Any]] = None,
        **kwargs: Any,
    ) -> List[Document]:
        """Search by embedding vector using Supabase RPC"""
        
        # Call Supabase RPC function for vector similarity search
        # Note: You'll need to create this RPC function in Supabase
        try:
            response = self.supabase.rpc(
                'match_resume_chunks',
                {
                    'query_embedding': embedding,
                    'match_count': k,
                    'filter_doc_id': filter.get('doc_id') if filter else None
                }
            ).execute()
            
            documents = []
            for row in response.data:
                doc = Document(
                    page_content=row['content'],
                    metadata={
                        'chunk_id': row['chunk_id'],
                        'section': row['section'],
                        'idx': row['idx'],
                        'split': row['split'],
                        'similarity': row.get('similarity', 0.0)
                    }
                )
                documents.append(doc)
            
            return documents
            
        except Exception as e:
            print(f"Error in vector search: {e}")
            return []
    
    def similarity_search(
        self,
        query: str,
        k: int = 4,
        filter: Optional[Dict[str, Any]] = None,
        **kwargs: Any,
    ) -> List[Document]:
        """Similarity search by query string (requires embeddings)"""
        # This method needs to embed the query first
        # For now, return empty - will be handled by custom retriever
        return []
    
    @classmethod
    def from_texts(
        cls,
        texts: List[str],
        embedding: Any,
        metadatas: Optional[List[dict]] = None,
        **kwargs: Any,
    ):
        """Create from texts (not needed for existing data)"""
        raise NotImplementedError("Use existing Supabase data")


class SupabaseRetriever:
    """Custom retriever for Supabase pgvector"""
    
    def __init__(self, supabase_client: Client, embeddings: OpenAIEmbeddings):
        self.supabase = supabase_client
        self.embeddings = embeddings
    
    def get_relevant_documents(
        self, 
        query: str, 
        top_k: int = 8,
        match_threshold: float = 0.0,
        doc_id: Optional[str] = None
    ) -> List[Document]:
        """Retrieve relevant documents from Supabase"""
        
        # 1. Get query embedding
        print(f"Getting embedding for query: '{query[:50]}...'")
        try:
            query_embedding = self.embeddings.embed_query(query)
            print(f"Successfully generated embedding with {len(query_embedding)} dimensions")
        except Exception as e:
            print(f"Error generating embedding: {e}")
            return []
        
        # 2. Search in Supabase using RPC
        print(f"Calling Supabase RPC 'match_resume_chunks' with top_k={top_k}, threshold={match_threshold}")
        try:
            response = self.supabase.rpc(
                'match_resume_chunks',
                {
                    'query_embedding': query_embedding,
                    'match_count': top_k,
                    'match_threshold': match_threshold,
                    'filter_doc_id': doc_id
                }
            ).execute()
            
            print(f"Supabase RPC returned {len(response.data) if response.data else 0} results")
            
            if not response.data:
                print("No data returned from Supabase RPC call")
                return []
            
            documents = []
            for i, row in enumerate(response.data):
                similarity = row.get('similarity', 0.0)
                print(f"Document {i+1}: similarity={similarity:.4f}, section={row.get('section', 'unknown')}")
                
                # Skip documents below threshold
                if similarity < match_threshold:
                    print(f"  Skipping due to low similarity ({similarity} < {match_threshold})")
                    continue
                    
                doc = Document(
                    page_content=row['content'],
                    metadata={
                        'chunk_id': row['chunk_id'],
                        'section': row['section'],
                        'idx': row['idx'],
                        'split': row['split'],
                        'similarity': similarity
                    }
                )
                documents.append(doc)
            
            print(f"Filtered to {len(documents)} documents above threshold")
            return documents
            
        except Exception as e:
            print(f"Error in Supabase retrieval: {type(e).__name__}: {e}")
            import traceback
            print(f"Full traceback: {traceback.format_exc()}")
            return []


class SupabaseLangChainRAGPipeline:
    """LangChain-based RAG pipeline using Supabase pgvector"""
    
    def __init__(self):
        # Initialize OpenAI components
        self.embeddings = OpenAIEmbeddings(
            model="text-embedding-3-small",
            openai_api_key=os.environ.get("OPENAI_API_KEY")
        )
        
        self.llm = ChatOpenAI(
            model=os.environ.get("OPENAI_MODEL", "gpt-5-nano"),
            openai_api_key=os.environ.get("OPENAI_API_KEY"),
            temperature=1
        )
        
        # Initialize Supabase client
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        
        if not supabase_url or not supabase_key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
        
        self.supabase = create_client(supabase_url, supabase_key)
        
        # Initialize custom retriever
        self.retriever = SupabaseRetriever(self.supabase, self.embeddings)
        
        # Initialize Langfuse
        self.langfuse = None
        langfuse_public_key = os.environ.get("LANGFUSE_PUBLIC_KEY")
        langfuse_secret_key = os.environ.get("LANGFUSE_SECRET_KEY")
        langfuse_host = os.environ.get("LANGFUSE_HOST", "https://cloud.langfuse.com")

        print(f"[LANGFUSE] Initialization check:")
        print(f"[LANGFUSE]   - LANGFUSE_PUBLIC_KEY: {'SET' if langfuse_public_key else 'MISSING'}")
        print(f"[LANGFUSE]   - LANGFUSE_SECRET_KEY: {'SET' if langfuse_secret_key else 'MISSING'}")
        print(f"[LANGFUSE]   - LANGFUSE_HOST: {langfuse_host}")

        if all([langfuse_public_key, langfuse_secret_key]):
            try:
                self.langfuse = Langfuse(
                    public_key=langfuse_public_key,
                    secret_key=langfuse_secret_key,
                    host=langfuse_host
                )
                # Test connection
                auth_result = self.langfuse.auth_check()
                print(f"[LANGFUSE] Initialized successfully! Auth check: {auth_result}")
            except Exception as e:
                print(f"[LANGFUSE] ERROR - Initialization failed: {e}")
                self.langfuse = None
        else:
            print("[LANGFUSE] WARNING - Not initialized, missing environment variables")
    
    async def query(
        self,
        question: str,
        audience: Optional[str] = None,
        top_k: int = 8,
        match_threshold: float = 0.0,
        doc_id: Optional[str] = None,
        include_context: bool = False
    ) -> Dict[str, Any]:
        """Execute RAG query using Supabase + LangChain"""
        
        # Set up callbacks for Langfuse tracking
        callbacks = []
        langfuse_handler = None

        print(f"[LANGFUSE] Query start - question: '{question[:50]}...'")
        print(f"[LANGFUSE] Langfuse client status: {'ACTIVE' if self.langfuse else 'INACTIVE'}")

        if self.langfuse:
            try:
                langfuse_handler = LangfuseCallbackHandler()
                callbacks.append(langfuse_handler)
                print(f"[LANGFUSE] CallbackHandler created successfully")
                print(f"[LANGFUSE] Callbacks list length: {len(callbacks)}")
            except Exception as e:
                print(f"[LANGFUSE] ERROR - Failed to create CallbackHandler: {e}")
        else:
            print("[LANGFUSE] Skipping callback setup - Langfuse not initialized")
        
        # 1. Retrieve relevant documents
        print(f"Retrieving documents: top_k={top_k}, threshold={match_threshold}")
        relevant_docs = self.retriever.get_relevant_documents(
            query=question,
            top_k=top_k,
            match_threshold=match_threshold,
            doc_id=doc_id
        )
        
        print(f"Retrieved {len(relevant_docs)} relevant documents")
        
        if not relevant_docs:
            print("No relevant documents found - returning default message")
            return {
                "answer": "抱歉，我無法在履歷中找到相關資訊來回答您的問題。",
                "bullets": [],
                "citations": [],
                "follow_up": ["請嘗試更具體的問題", "或者詢問關於特定技能、經驗的內容"],
                "model": os.environ.get("OPENAI_MODEL", "gpt-4"),
                "contexts": [] if include_context else None
            }
        
        # 2. Prepare context and prompt
        audience_instruction = ""
        if audience == "eng":
            audience_instruction = " 回答面向偏技術（engineering）。"
        elif audience == "hr":
            audience_instruction = " 回答面向偏人資（HR）。"
        
        context_text = "\n\n".join(
            f"[{doc.metadata['section']}#{doc.metadata['idx']}] {doc.page_content}" 
            for doc in relevant_docs
        )
        
        prompt_template = f"""你是一個根據履歷內容回答問題的助理，以清晰、準確、可驗證為原則回答。{audience_instruction}

以下是履歷的相關片段：
{context_text}

問題：{question}

請先以 1-3 句整體回答，再以條列方式補充重點。"""
        
        # 3. Generate response using LLM
        print(f"[LANGFUSE] Starting LLM generation with {len(callbacks)} callbacks")
        try:
            from langchain.schema import HumanMessage

            print(f"[LANGFUSE] Calling LLM.agenerate() with callbacks: {[type(cb).__name__ for cb in callbacks]}")
            response = await self.llm.agenerate(
                [[HumanMessage(content=prompt_template)]],
                callbacks=callbacks
            )
            answer_text = response.generations[0][0].text
            print(f"[LANGFUSE] LLM generation completed successfully")

            # Log trace information if available
            if langfuse_handler and hasattr(langfuse_handler, 'get_trace_id'):
                try:
                    trace_id = langfuse_handler.get_trace_id()
                    print(f"[LANGFUSE] Trace ID: {trace_id}")
                except:
                    pass
        except Exception as e:
            print(f"Error in LLM generation: {e}")
            answer_text = "抱歉，生成回答時發生錯誤。"
        
        # 4. Extract bullets and citations
        bullets = [
            line.strip("- ") 
            for line in answer_text.splitlines() 
            if line.strip().startswith("-")
        ]
        
        citations = [
            {
                "section": doc.metadata["section"],
                "idx": doc.metadata["idx"],
                "split": doc.metadata.get("split", 0)
            }
            for doc in relevant_docs
        ]
        
        # 5. Prepare response
        response_data = {
            "answer": answer_text,
            "bullets": bullets,
            "citations": citations,
            "follow_up": [],
            "model": os.environ.get("OPENAI_MODEL", "gpt-4")
        }
        
        if include_context:
            response_data["contexts"] = [
                {
                    "chunk_id": doc.metadata["chunk_id"],
                    "section": doc.metadata["section"],
                    "idx": doc.metadata["idx"],
                    "split": doc.metadata.get("split", 0),
                    "content": doc.page_content,
                    "similarity": doc.metadata.get("similarity", 0.0)
                }
                for doc in relevant_docs
            ]
        
        # Final logging
        print(f"[LANGFUSE] Query completed successfully")
        print(f"[LANGFUSE] Response length: {len(answer_text)} characters")

        # Attempt to flush any pending Langfuse data
        if self.langfuse:
            try:
                self.langfuse.flush()
                print(f"[LANGFUSE] Flushed pending trace data")
            except Exception as e:
                print(f"[LANGFUSE] Warning - Failed to flush: {e}")

        return response_data


# Global pipeline instance
_supabase_pipeline = None

async def supabase_langchain_rag_pipeline(
    *,
    question: str,
    audience: Optional[str],
    top_k: int,
    match_threshold: float,
    doc_id: Optional[str],
    include_context: bool,
) -> Dict[str, Any]:
    """Supabase + LangChain RAG pipeline function"""
    
    global _supabase_pipeline
    
    # Initialize pipeline if not exists
    if _supabase_pipeline is None:
        _supabase_pipeline = SupabaseLangChainRAGPipeline()
    
    # Execute query
    return await _supabase_pipeline.query(
        question=question,
        audience=audience,
        top_k=top_k,
        match_threshold=match_threshold,
        doc_id=doc_id,
        include_context=include_context
    )
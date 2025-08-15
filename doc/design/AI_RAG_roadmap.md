# 履歷問答：實施藍圖（Roadmap）

## 備註

- 前端對話框外觀與擺放位置：待設計（TBD）。
- 本階段優先完成：AI_RAG_design.md 流程 1–6、LangChain 整合、Langfuse 接入、無關提問（Guardrails）。
- 其餘 UI 細節與進階功能將於後續階段進行。

---

## Phase 1: 建立 Chatbot 基礎設施（不含 RAG）

1. 安裝依賴：
   ```bash
   npm install ai @ai-sdk/openai
   ```
2. 建立前端元件（`src/nextjs/components/ai/ChatWidget.tsx`）：使用 `useChat` 管理訊息狀態，提供浮動按鈕開關視窗。
3. 建立 API 端點（`src/nextjs/app/api/chat/route.ts`）：以 `@ai-sdk/openai` 的 `streamText` 串接 OpenAI，暫不查詢外部資料。
4. 整合到主佈局（`src/nextjs/app/layout.tsx`）：在 `<body>` 中渲染 `<ChatWidget />`。
5. 設定環境變數（`.env.local`）：`OPENAI_API_KEY="sk-..."`。

---

## Phase 2: 整合 RAG 流程（LangChain + Langfuse）

1. 資料來源與檢索（`resume.json` 向量化）：
   - 使用者問題為短句，不對問題做 chunking；直接向量化後檢索。
   - `src/nextjs/data/resume.json` 以「邏輯單元」為粒度做 chunking 與向量化。
2. 建立 Python RAG 端點（`POST /rag/query`）：
   - LangChain：`VectorStoreRetriever`（Supabase/pgvector，cosine）→（可選）MMR 去冗／重排序 → Prompt/Context 組裝；對聯絡方式等可加「規則直出」路徑後再合併。
   - 回傳：
     - 非串流：`{ answer, citations: [{section, idx, split}] }`
     - 串流：SSE/Chunked，包含 tokens 與 citations（完成時標記 `done`）。
   - Langfuse：追蹤整條鏈（retrieval 命中率、latency、cost）。
3. Next.js API 作為代理與生成端（`/api/chat`）：
   - 接收前端請求，向 `python-backend` 的 `/rag/query` 轉發以取得 prompt/context 與 citations；再呼叫 LLM 進行串流生成，並與 citations 合併串流回前端。
   - 處理權杖驗證、逾時重試、錯誤訊息正規化。
4. 升級前端元件（`ChatWidget.tsx`）：
   - 解析 SSE/Chunked 串流，顯示 citations；失敗情境友善提示。
   - UI 提供 Top-k 調整與「顯示來源」切換。



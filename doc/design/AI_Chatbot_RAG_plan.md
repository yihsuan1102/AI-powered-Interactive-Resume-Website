
# AI Chatbot 整合與 RAG 擴充方案

> **文件目的**：本文件旨在為現有履歷網站整合一個基於 `vercel/ai-chatbot` 的 AI 聊天機器人，並透過客製化的 RAG (Retrieval-Augmented Generation) 流程，使其能根據 `resume.json` 的內容準確回答問題。文件將闡述架構選項、技術細節與實施步驟。

## 1. 總體目標與核心功能

- **聊天介面**：在網站所有頁面提供一個可開關的浮動聊天視窗（Floating Action Button）。
- **核心引擎**：使用 Vercel AI SDK (`ai/react` 的 `useChat` hook) 管理前端狀態，並透過 Next.js App Router API (`route.ts`) 與後端溝通。
- **RAG 整合**：將使用者問題，透過向量檢索 `resume.json` 的相關內容，再交由大型語言模型（LLM）生成帶有來源標註 (Citations) 的回答。
- **使用者體驗**：支援流式輸出 (Streaming)、Markdown 格式、行動裝置最佳化，並在無法回答時提供清晰的回饋。

---

## 2. 架構決策：RAG 流程的部署模式

我們有兩種主要的架構模式可以選擇，各有優劣。**建議從模式 A 開始，以求快速驗證與迭代，待 RAG 邏輯複雜化後再考慮演進至模式 B。**

### 模式 A：Next.js 一體化方案 (建議起步)

在 `app/api/chat/route.ts` 中完成「**檢索 → 組裝 → 生成**」的完整 RAG 流程。

- **流程**：
  1. 前端 `ChatWidget` 將使用者問題發送到 `/api/chat`。
  2. API 收到問題後，將其向量化。
  3. 使用該向量查詢 Supabase/pgvector，取回最相關的履歷片段 (chunks)。
  4. 將履歷片段組裝成上下文 (context)，連同原始問題構成一個完整的提示 (prompt)。
  5. 呼叫 OpenAI API (或其他 LLM) 進行流式生成。
  6. 將生成的內容以流式 response 回傳給前端。

- **優點**：
  - **部署單純**：所有邏輯都在 Next.js 專案內，一次部署到位。
  - **開發快速**：無需管理額外的後端服務與 API 對接。
  - **低延遲**：可部署在 Edge 環境，減少網路往返。

- **缺點**：
  - **職責耦合**：資料處理 (RAG) 與 API 邏輯混和，未來若 RAG 流程變複雜 (如混合檢索、重排序) 會讓 `route.ts` 變得臃腫。
  - **Python 生態系限制**：無法直接使用 Python 生態中強大的資料科學與 LLM 工具鏈 (如 LangChain, LlamaIndex 的進階功能)。

### 模式 B：職責分離方案 (未來擴充方向)

RAG 核心邏輯由 `python-backend` 提供，Next.js API 只做請求轉發與串流生成。

- **流程**：
  1. 前端 `ChatWidget` 發送問題到 `/api/chat`。
  2. Next.js API 收到後，呼叫 `python-backend` 的一個新端點 (例如 `/rag/query`)。
  3. Python 服務執行完整的 RAG 流程 (檢索、去冗、重排序)，回傳已組裝好的 `prompt` 與 `context`。
  4. Next.js API 拿到 `prompt` 後，呼叫 LLM API 進行流式生成。
  5. 將生成內容串流回前端。

- **優點**：
  - **職責清晰**：前端 (Next.js) 與 RAG 後端 (Python) 分離，便於獨立開發、測試與擴展。
  - **生態系完整**：可充分利用 Python 在 RAG/LLM 領域的成熟工具與函式庫。
  - **可複用性**：RAG 服務可被其他應用程式（如 Slack bot, CLI 工具）重複使用。

- **缺點**：
  - **架構複雜度高**：需要維護兩個服務，並處理它們之間的通訊。
  - **延遲可能增加**：多了一次服務間的網路呼叫。
  - **部署成本**：需要分別部署與監控兩個服務。

---

## 3. 實施藍圖 (Roadmap)

我們將採用分階段實施的方式，確保每個階段都有可交付的成果。

### Phase 1: 建立 Chatbot 基礎設施 (不含 RAG)

**目標**：快速建立一個可以對話的 Chatbot UI，驗證 Vercel AI SDK 的整合。

1.  **安裝依賴**：
    ```bash
    npm install ai @ai-sdk/openai
    ```
2.  **建立前端元件** (`src/nextjs/components/ai/ChatWidget.tsx`):
    - 使用 `useChat` hook 管理訊息狀態。
    - 建立包含聊天視窗、輸入框、送出按鈕的 UI。
    - 實作一個浮動按鈕來開關聊天視窗。
3.  **建立 API 端點** (`src/nextjs/app/api/chat/route.ts`):
    - 建立一個基本的 `POST` handler，使用 `@ai-sdk/openai` 的 `streamText` 將對話直接轉發給 OpenAI。
    - 此階段不查詢任何外部資料。
4.  **整合到主佈局** (`src/nextjs/app/layout.tsx`):
    - 在 `<body>` 中引入並渲染 `<ChatWidget />`。
5.  **設定環境變數** (`.env.local`):
    - `OPENAI_API_KEY="sk-..."`

### Phase 2: 整合 RAG 流程 (模式 A)

**目標**：讓 Chatbot 能夠根據履歷內容回答問題。

1.  **資料庫與資料準備 (Ingestion)**:
    - **資料庫**：設定 Supabase 專案並啟用 `pgvector` 擴充。
    - **Schema**：建立 `resume_chunks` 資料表。
      ```sql
      -- DDL for resume_chunks table
      create table if not exists resume_chunks (
        id bigserial primary key,
        doc_id text not null default 'resume',
        section text not null, -- e.g., 'jobs', 'projects'
        idx int not null,      -- original index in the JSON array
        split int not null default 0,
        content text not null,
        metadata jsonb not null default '{}',
        embedding vector(1536) not null -- For text-embedding-3-small
      );

      -- Indexes for performance
      create index if not exists idx_resume_doc_section on resume_chunks (doc_id, section);
      create index if not exists idx_resume_embedding on resume_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);
      ```
    - **Ingestion Script**：撰寫一個獨立的腳本 (Node.js 或 Python)，執行以下操作：
        a. 讀取 `src/nextjs/data/resume.json`。
        b. 按照 `AI_Q&A_arch.md` 中的規則進行文本切分 (chunking)。
        c. 使用 OpenAI `text-embedding-3-small` 模型將每個 chunk 轉換為向量。
        d. 將 `content`、`metadata` 與 `embedding` 批量寫入 (upsert) 到 Supabase。

2.  **升級 API 端點** (`app/api/chat/route.ts`):
    - **安裝 Supabase 依賴**：`npm install @supabase/supabase-js`
    - **修改 Handler 邏輯**：
        a. 接收到使用者問題後，先用 embedding 模型將其向量化。
        b. 建立 Supabase client，使用 `rpc` 呼叫向量相似度搜尋函式，從 `resume_chunks` 表中檢索 Top-k (k=5) 相關內容。
        c. **提示詞工程 (Prompt Engineering)**：建構 system prompt，明確指示 LLM：
           - "You are a professional assistant for this resume. Answer the user's questions based ONLY on the provided context. If the information is not in the context, say you don't know. Include citations like `[section:index]` at the end of relevant sentences."
        d. 將檢索到的 context 與使用者問題一同傳給 `streamText`。
    - **來源標註 (Citations)**：在回傳的資料流中，設計一種方式來傳遞來源資訊，或直接讓 LLM 在回答中生成 `[section:index]` 格式的標註。

3.  **升級前端元件** (`ChatWidget.tsx`):
    - 設計 UI 來解析並美化顯示來源標註 (例如，點擊後可跳轉或顯示詳細內容的 tooltip)。
    - 處理 RAG 特有的錯誤狀態，例如「無法從履歷中找到相關資訊」。

---

## 4. 安全性與環境變數

- **金鑰管理**：所有密鑰（OpenAI, Supabase）必須儲存在 `.env.local` 中，並確保該檔案已被加入 `.gitignore`。
- **Supabase 金鑰**：
  - `NEXT_PUBLIC_SUPABASE_URL`: 可公開的 URL。
  - `SUPABASE_SERVICE_ROLE_KEY`: **高度機密**，僅能在伺服器端 (`route.ts`, ingestion script) 使用，絕不能洩漏到前端。
- **資料庫安全**：建議啟用 Supabase 的行級安全策略 (Row Level Security)，即使 `anon` key 意外洩漏，也無法讀取資料。但由於向量查詢通常需要更高權限，在 `route.ts` 中使用 `service_role` 金鑰是目前較直接的做法。

---

## 5. 未來擴充

- **過渡到模式 B**：當 RAG 邏輯需要引入混合檢索 (BM25 + Vector)、重排序 (Re-ranking) 或更複雜的 Agentic 行為時，將 RAG 邏輯遷移到 `python-backend`。
- **對話歷史**：使用 Vercel KV 或 Supabase 儲存對話歷史，實現跨 session 的記憶功能。
- **使用者回饋**：在 UI 加入「👍 / 👎」按鈕，收集使用者回饋以評估 RAG 品質，並將 bad cases 存入資料庫以供後續微調。
- **自動 Ingestion**：設定 CI/CD 或 Webhook，當 `resume.json` 更新時，自動觸發 Ingestion 流程。

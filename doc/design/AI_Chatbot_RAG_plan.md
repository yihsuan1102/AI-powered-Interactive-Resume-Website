
# AI Chatbot 整合與 RAG 擴充方案

> **文件目的**：本文件旨在為現有履歷網站整合一個基於 `vercel/ai-chatbot` 的 AI 聊天機器人，並透過客製化的 RAG (Retrieval-Augmented Generation) 流程，使其能根據 `resume.json` 的內容準確回答問題。文件將闡述架構選項、技術細節與實施步驟。

## 1. 總體目標與核心功能

- **聊天介面**：在網站所有頁面提供一個可開關的浮動聊天視窗（Floating Action Button）。
- **核心引擎**：使用 Vercel AI SDK (`ai/react` 的 `useChat` hook) 管理前端狀態，並透過 Next.js App Router API (`route.ts`) 與後端溝通。
- **RAG 整合**：將使用者問題，透過向量檢索 `resume.json` 的相關內容，再交由大型語言模型（LLM）生成帶有來源標註 (Citations) 的回答。
- **使用者體驗**：支援流式輸出 (Streaming)、Markdown 格式、行動裝置最佳化，並在無法回答時提供清晰的回饋。

---

## 2. 架構決策：RAG 流程的部署模式

我們將採用 **前後端職責分離作為正式方案**，並結合 **LangChain**（編排 RAG pipeline）與 **Langfuse**（可觀測性與品質追蹤）。模式 A 僅保留作為備選或早期 PoC。


### 職責分離方案

RAG 核心邏輯由 `python-backend` 提供，Next.js API 只做請求轉發與串流生成。Python 服務使用 **LangChain** 建構檢索鏈（Text Splitter → Embeddings → Vector Store Retriever → Prompt 構建 → LLM 生成／重排序），並以 **Langfuse** 全面記錄檢索與生成過程（延遲、成本、品質評分）。

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
  - **可觀測性**：Langfuse 對每一步（檢索、重排序、生成）提供追蹤，利於調參與 A/B 測試。

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

### Phase 2: 整合 RAG 流程（模式 B + LangChain + Langfuse）

**目標**：讓 Chatbot 能夠根據履歷內容回答問題，RAG 核心在 `python-backend`，並具備可觀測性。現階段假設「使用者發問為短句」，且「履歷來源為 `resume.json`，採用按邏輯單元的 chunking 與向量化」。

1.  **資料來源與檢索（`resume.json` 向量化）**
    - **現況假設**：
      - 使用者問題為短句，不對使用者問題做 chunking；直接向量化後檢索。
      - 履歷資料來源為 `src/nextjs/data/resume.json`，以「邏輯單元」為粒度做 chunking 與向量化。
    - **Chunking（按邏輯單元，非句子切分）**：
      - `contact`：整合為 1 個 chunk。
      - `education`：每一筆 education 作為 1 個 chunk（必要時補上校名、學位、期間等關鍵欄位）。
      - `jobs`：每一筆 job 合併 `overview + tasks + technologies` 作為 1 個 chunk；若長度過長再細分為 2 個 chunk（overlap 100–150）。
      - `projects`：每一筆 project 合併 `overview + tasks + technologies` 作為 1 個 chunk；必要時再細分。
      - `skills`：以技能類別為單位（如 Programming Language、Tools）各為 1 個 chunk。
      - 每個 chunk 的 metadata 包含：`section`、`idx`、`split`（預設 0）、關鍵欄位快照（如 `company/title/school/title`）。
    - **Embedding 與向量庫**：
      - 模型：OpenAI `text-embedding-3-small`（1536 維）。
      - 寫入：Supabase + pgvector（表結構見下）。
    - **檢索方式**：
      - 以 VectorStore Retriever（cosine 相似度）為主，`where doc_id='resume'`；Top-k 預設 5；可啟用 MMR 去冗。
      - 特例：聯絡方式等明確欄位可先規則直出，作為檢索結果的補充或校正。
    - **備註（未來）**：
      - 若來源切換到 `resume.tex`，流程：LaTeX 結構解析 → 章節抽取 → 正規化 → `RecursiveCharacterTextSplitter`（800–1200/overlap 100–150）→ embedding → 寫入向量庫。

2.  **建立 Python RAG 端點**（`python-backend`）
    - 新增 `POST /rag/query`：輸入 `question` 或 `messages`（多輪），`top_k`、`filters`、`stream`。
    - 使用 LangChain：`VectorStoreRetriever`（Supabase/pgvector，cosine）→（可選）MMR 去冗／重排序 → Prompt 組裝 → LLM 生成；對聯絡方式等可加「規則直出」路徑後再合併。
    - 回傳：
      - 非串流：`{ answer, citations: [{section, idx, split}] }`
      - 串流：SSE/Chunked，包含 tokens 與 citations（完成時標記 `done`）。
    - 以 Langfuse 追蹤整條鏈（retrieval 命中率、latency、cost）。

3.  **Next.js API 作為代理**（`app/api/chat/route.ts`）
    - 接收前端請求，向 `python-backend` 的 `/rag/query` 轉發並將串流回傳給前端。
    - 處理權杖驗證、逾時重試、錯誤訊息正規化。

4.  **升級前端元件**（`ChatWidget.tsx`）
    - 解析 SSE/Chunked 串流，顯示 citations；失敗情境友善提示。
    - UI 上提供 Top-k 調整與「顯示來源」切換。

---

## 4. API 設計與協定選擇

- **對外（前端 → Next.js）**：
  - `POST /api/chat`（REST + SSE）：用 REST 請求、SSE 回傳 token 串流；相容 CDN/負載平衡，實作簡單。
  - 優點：簡單、HTTP 基礎設施友善、容易監控與重試；與瀏覽器相容性佳。
  - 缺點：單向串流；若需要雙向互動或主動推送，需 WebSocket。

- **對內（Next.js → Python）**：
  - `POST http://python-backend/rag/query`（REST）。若長期演進到多服務、強型別或雙向串流，可考慮 gRPC。
  - 串流：SSE 或 HTTP chunked。

- **是否需要 REST？** 在此情境通常會使用「REST + SSE」：
  - **優點**：
    - 與現有前後端架構與安全設計（API Gateway、WAF、Cache）高度相容。
    - 簡單易測（curl/Postman）、可觀測性好（結合 Langfuse/日誌）。
    - 對聊天串流已足夠，無需建立長連線管理。
  - **缺點**：
    - 非雙向；若需即時指令（tool calls 主動推播）或協作式編輯，WebSocket 更合適。
    - JSON 體積大於二進位協定（gRPC），在高吞吐情境下成本略高。
  - **常見做法**：Web 端聊天大多採用 REST + SSE；服務間若需求嚴謹型別與效能，會引入 gRPC。

## 5. 安全性與環境變數

- **金鑰管理**：所有密鑰（OpenAI, Supabase）必須儲存在 `.env.local` 中，並確保該檔案已被加入 `.gitignore`。
- **Supabase 金鑰**：
  - `NEXT_PUBLIC_SUPABASE_URL`: 可公開的 URL。
  - `SUPABASE_SERVICE_ROLE_KEY`: **高度機密**，僅能在伺服器端 (`route.ts`, ingestion script) 使用，絕不能洩漏到前端。
- **資料庫安全**：建議啟用 Supabase 的行級安全策略 (Row Level Security)，即使 `anon` key 意外洩漏，也無法讀取資料。但由於向量查詢通常需要更高權限，在 `route.ts` 中使用 `service_role` 金鑰是目前較直接的做法。

---

## 6. 未來擴充

- **過渡到模式 B**：當 RAG 邏輯需要引入混合檢索 (BM25 + Vector)、重排序 (Re-ranking) 或更複雜的 Agentic 行為時，將 RAG 邏輯遷移到 `python-backend`。
- **對話歷史**：使用 Vercel KV 或 Supabase 儲存對話歷史，實現跨 session 的記憶功能。
- **使用者回饋**：在 UI 加入「👍 / 👎」按鈕，收集使用者回饋以評估 RAG 品質，並將 bad cases 存入資料庫以供後續微調。
- **自動 Ingestion**：設定 CI/CD 或 Webhook，當 `resume.json` 更新時，自動觸發 Ingestion 流程。

---

## 7. 對話紀錄儲存策略（Memory）

- **需求假設**：使用者目前僅輸入純文字進行對話。
- **兩層方案（建議）**：
  - 速記層（Redis）：以 `session_id` 為 key 儲存最近 N 則訊息（JSON 列表），設定 TTL（例如 24 小時），供即時對話記憶與快速讀寫。
  - 永久層（Postgres/Supabase）：`chat_sessions`、`chat_messages` 兩張表，保存完整對話轉錄與評分／回饋；利於分析、審計與離線評測。以 RLS 控制權限。
- **權衡**：Redis 低延遲與簡易過期；DB 便於長期查詢分析。可同時啟用：寫入 DB 作為事後分析，Redis 服務即時對話。

---

## 8. 防止離題／無關提問（Guardrails）

- **語義門檻**：當前檢索（或規則擷取）若無足夠相關內容，回覆「與履歷無關／無足夠資訊」，不進行自由生成。
- **提示詞約束**：System prompt 明確限制：「僅根據提供的履歷內容回答；若無相關內容，請說不知道並引導使用者聚焦履歷。」
- **主題白名單**：限定主題於履歷相關（聯絡方式、學歷、工作、專案、技能等）。
- **最小 citations 要求**：回答中至少包含一則來源標註（section/index），否則回應「無法根據履歷回答」。
- **速率與長度限制**：限制單次輸入長度與速率，降低濫用與越獄風險。
- **安全過濾**：使用 OpenAI 安全政策或自建過濾器阻擋敏感不當內容。

# 履歷問答：AI Chatbot 整合與 RAG 架構設計

## 文件目的

> 本文件旨在為現有履歷網站整合一個基於 `vercel/ai-chatbot` 的 AI 聊天機器人，並透過客製化的 RAG（Retrieval-Augmented Generation）流程，使其能根據 `resume.json` 的內容準確回答問題。文件闡述架構選項、技術細節與實施步驟，並以前後端職責分離（Next.js 代理 + Python 後端）為主軸，搭配 LangChain（檢索鏈編排）與 Langfuse（可觀測性與品質追蹤）。

---

## RAG 架構設計

### 架構採用（前後端分離 + LangChain + Langfuse）

- **部署模式**：採用「Next.js 代理 + Python 後端」的職責分離方案。
- **RAG 編排**：在 `python-backend` 以 **LangChain** 建構檢索鏈（Text Splitter → Embeddings → Vector Store Retriever → Prompt 組裝／可選重排序），回傳 prompt/context 與 citations。
- **可觀測性**：以 **Langfuse** 追蹤 ingestion、檢索、重排序與生成（延遲、成本、品質、命中率等）。
- **向量庫**：Supabase + `pgvector`；embedding 採 `text-embedding-3-small`（1536 維）。

#### 服務分工

- Python 後端：檢索、去冗、重排序、prompt/context 組裝與 citations 產出；不直接呼叫 LLM（可選擇性保留）。
- Next.js API：接收 Python 回傳的 prompt/context 與 citations，透過 Vercel AI SDK 或 OpenAI API 進行 LLM 串流生成，將結果與 citations 串流回前端。

---

### 流程總覽（精簡版｜現階段）

1. 準備資料：以 `resume.json` 進行「按邏輯單元的 chunking」並向量化，寫入 Supabase/pgvector。
2. 查詢處理：假設使用者發問為短句，不做使用者問題 chunking；將短句向量化後做向量檢索（Top-k 預設 5，建議 5–8）。
3. 擷取內容：取回最相關的 chunk 與 metadata，必要時補上規則式欄位直出（如聯絡方式）。
4. 回答：把上下文與原始問題送入 LLM 生成回答（無關時回覆不知道並引導聚焦）。

---

### 詳細流程設計

#### 1) 資料準備與切分（`resume.json`）

- 按「邏輯單元」切分：
  - `contact`：整合為 1 個 chunk。
  - `education`：每筆 education 1 個 chunk。
  - `jobs`：每筆 job 合併 overview/tasks/technologies 為 1 個 chunk；過長再細分（overlap 100–150）。
  - `projects`：每筆 project 合併 overview/tasks/technologies 為 1 個 chunk；過長再細分。
  - `skills`：以技能類別為單位分 chunk（Programming Language、Tools 等）。
- metadata：`section`、`idx`、`split`（預設 0）、關鍵欄位快照（如 company/title/school/title）。
- 正規化：基本清洗（移除空白、統一欄位表述）。

備註（未來從 `resume.tex` 開始 chunking）

- LaTeX 結構解析 → 分章節抽取（Education/Work/Project 等）→ 文字正規化 → `RecursiveCharacterTextSplitter`（chunk size 800–1200 字、overlap 100–150，盡量對齊句子邊界）→ embedding（`text-embedding-3-small`）→ 寫入向量庫。

#### 2) 嵌入（Embeddings）

- 模型：OpenAI `text-embedding-3-small`（1536 維）。
- 策略：批次 32–128、退避重試、快取重用；輸入正規化避免雜訊。

#### 3) 儲存與索引（Supabase + pgvector）

- 表：`resume_chunks`（id, doc_id, section, idx, split, content, metadata, embedding vector(1536)）。
- 索引：`ivfflat` + cosine，相容 ANN；輔以 `(doc_id, section)` 索引。
- Upsert：自然鍵 `doc_id + section + idx + split`。

#### 4) 建置與重建（現階段）

- 直接讀取 `resume.json`；僅需資料清洗與欄位映射的單元測試即可。

備註（未來 ingestion）

- 當導入向量庫：`resume.tex` → 解析與 chunking → embedding → 批量寫入資料表 → upsert/版本控管 → 指標驗證。

#### 5) 查詢與檢索（Vector + 規則直出）

- 將短句問題向量化後進行向量檢索（Top-k 5–8）；可啟用 MMR 去冗與相似度閾值。
- 對聯絡方式等標準欄位，可平行做規則直出並與向量檢索結果合併（提升精確度）。
- 若相似度皆低於閾值，回覆不知道／與履歷無關。

#### 6) 回答組裝（Answer Synthesis）

- 擷取對應欄位內容與 metadata，做最小化去重與排序，組成上下文。
- 提示詞要點：
  - 僅根據提供的上下文回答；缺資訊時直說不知道。
  - 輸出時附上來源標註（如 section 與 index）。
- 串流：由 Next.js API 端以 SSE/Chunked 將 LLM 生成結果與 citations 串流回傳，於完成時附上 citations 彙總（至少 1 則）。

#### 7) 成本與效能考量

- 成本：優先使用 `text-embedding-3-small`；透過快取與去重降低重算。
- 吞吐：批次請求並行、向量索引使用 ANN（如 ivfflat）以加速查詢。
- 資料規模：定期維護索引參數與統計，批量寫入後做分析以穩定效能。

#### 8) 安全與隱私

- 啟用 Supabase RLS，限制寫入與查詢角色權限。
- 金鑰管理：環境變數與密鑰保管（不進版控）。`SUPABASE_SERVICE_ROLE_KEY` 僅能在伺服器端使用（如 `route.ts` 或 ingestion 腳本），不得外洩到前端。
- 僅儲存必要個資；針對敏感欄位可做遮罩或摘要化處理。

#### 9) 可觀測性與評測

- 追蹤：以 Langfuse 追蹤檢索與生成的延遲、成本與品質。
- 評測：建立固定的問答回歸集，定期比較 Top-k 命中率與回答可用性。
- 回饋：介面提供使用者「有幫助/無幫助」回饋，納入後續修正。

---

### API 設計與協定選擇

- **對外（前端 → Next.js）**：
  - `POST /api/chat`（REST + SSE）：用 REST 請求、SSE 回傳 token 串流；相容 CDN/負載平衡，實作簡單。
  - 優點：簡單、HTTP 基礎設施友善、容易監控與重試；與瀏覽器相容性佳。
  - 缺點：單向串流；若需要雙向互動或主動推送，需 WebSocket。

- **對內（Next.js → Python）**：
  - `POST /rag/query`：查詢接口（REST）。
  - `POST /rag/ingest`：觸發/重建向量索引（受保護）。
  - `GET /rag/health`：健康檢查。
  - 備註：若長期演進到多服務、強型別或雙向串流，可考慮 gRPC；串流採 SSE 或 HTTP chunked。

- **是否需要 REST？** 在此情境通常使用「REST + SSE」：
  - **優點**：相容現有前後端架構與安全設計（API Gateway、WAF、Cache）、易測（curl/Postman）、可觀測性佳（結合 Langfuse/日誌）。
  - **缺點**：非雙向；若需即時指令（tool calls 主動推播）或協作式編輯，WebSocket 更合適。JSON 體積也大於 gRPC。
  - **常見做法**：Web 端聊天多採用 REST + SSE；服務間若需求嚴謹型別與效能，會引入 gRPC。

---

### 對話紀錄儲存策略（Memory）

- 速記層（Redis）：以 `session_id` 為 key 儲存最近 N 則訊息（JSON 列表），設定 TTL（例如 24 小時），供即時對話記憶與快速讀寫。
- 永久層（Postgres/Supabase）：`chat_sessions`、`chat_messages` 兩張表，保存完整對話轉錄與評分／回饋；利於分析、審計與離線評測。以 RLS 控制權限。
- 策略：同時寫入 DB（分析、審計）與 Redis（低延遲對話記憶）。

---

### 檢索方式比較與建議（基於 `resume.json`）

- 向量相似度（cosine, Top-k + MMR）
  - 優點：語義檢索能力佳；對同義詞/語序不敏感；擴充性好。
  - 缺點：需建 embedding/索引；極短查詢可能受模型噪音影響，需要閾值與規則輔助。
  - 建議：作為主檢索方式。

- 關鍵字/規則匹配（欄位直出）
  - 優點：精準、可解釋、零成本；對 `contact`、固定欄位查詢很強。
  - 缺點：覆蓋度有限，無法處理語義模糊的問題。
  - 建議：作為輔助路徑，與向量檢索結果合併。

- Hybrid（BM25 + 向量）
  - 優點：兼顧詞項精確與語義相似；在短句查詢上提升穩定性。
  - 缺點：增加實作與維運複雜度；需兩套索引與融合策略。
  - 建議：規模與查詢多樣性提升後再導入。

---

### 實施藍圖（Roadmap）

本章節已移至獨立文件：`doc/design/AI_RAG_roadmap.md`

備註：

- 前端對話框外觀與擺放位置：待設計（TBD）。
- 先完成流程 1–6、LangChain、Langfuse、無關提問（Guardrails），其他放後續。

---

### 防止離題／無關提問（Guardrails）

- 語義門檻：當前檢索（或規則擷取）若無足夠相關內容，回覆「與履歷無關／無足夠資訊」，不進行自由生成。
- 提示詞約束：System prompt 明確限制：「僅根據提供的履歷內容回答；若無相關內容，請說不知道並引導使用者聚焦履歷。」
- 主題白名單：限定主題於履歷相關（聯絡方式、學歷、工作、專案、技能等）。
- 最小 citations 要求：回答中至少包含一則來源標註（section/index），否則回應「無法根據履歷回答」。
- 速率與長度限制：限制單次輸入長度與速率，降低濫用與越獄風險。
- 安全過濾：使用 OpenAI 安全政策或自建過濾器阻擋敏感不當內容。

---

### 未來擴充與待辦

- 混合檢索（BM25 + Vector）與重排序（Re-ranking），提升準確度。
- 當 `resume.json` 變更時觸發自動重建（Webhook/CI）。
- 導入 `resume.tex` 的 ingestion：結構解析 → chunking → embedding → 向量庫寫入。
- 對話歷史：使用 Vercel KV 或 Supabase 儲存對話歷史，實現跨 session 的記憶功能。
- 使用者回饋：在 UI 加入「👍 / 👎」，蒐集回饋以評估 RAG 品質，並將 bad cases 存入資料庫供後續微調。


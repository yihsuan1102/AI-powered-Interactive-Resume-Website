## RAG 流程（履歷問答系統）

### 架構採用（前後端分離 + LangChain + Langfuse）
- **部署模式**：採用「Next.js 代理 + Python 後端」的職責分離方案。
- **RAG 編排**：在 `python-backend` 以 **LangChain** 建構檢索鏈（Text Splitter → Embeddings → Vector Store Retriever → Prompt 組裝 → LLM 生成／可選重排序）。
- **可觀測性**：以 **Langfuse** 追蹤 ingestion、檢索、重排序與生成（延遲、成本、品質、命中率等）。
- **向量庫**：Supabase + `pgvector`；embedding 採 `text-embedding-3-small`（1536 維）。

流程總覽（精簡版｜現階段）
1. 準備資料：以 `resume.json` 進行「按邏輯單元的 chunking」並向量化，寫入 Supabase/pgvector。
2. 查詢處理：假設使用者發問為短句，不做使用者問題 chunking；將短句向量化後做向量檢索（Top-k）。
3. 擷取內容：取回最相關的 chunk 與 metadata，必要時補上規則式欄位直出（如聯絡方式）。
4. 回答：把上下文與原始問題送入 LLM 生成回答（無關時回覆不知道並引導聚焦）。

備註（未來擴充）
- 當資料來源改為 `resume.tex` 或內容規模升高時，再導入：chunking → embedding → 向量庫（Supabase/pgvector）→ 向量檢索/重排序。

---

### 詳細流程設計（無程式碼）

1) 資料準備與切分（`resume.json`）
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

2) Chunking 的時機與差異
- **履歷本體（資料庫 Ingestion）**：必做。採結構化 + `RecursiveCharacterTextSplitter`，建議 chunk size 800–1200 字、overlap 100–150，保句子邊界；metadata 帶 `section`、`idx`、`split`。
- **使用者發問（Query 處理）**：通常不切分，直接向量化；但若使用者貼上長文本（如 JD/專案敘述），可：
  - 分句或段落切分為多個子查詢（SentenceSplitter）；
  - 或使用 LangChain 的 Multi-Query Retriever／HyDE 擴展查詢（非嚴格意義的 chunking）。
- **對話歷史（Memory）**：不入庫 chunking。以 token budget 做「窗口式裁剪」或摘要化（map-reduce summarization），保留近效脈絡。
- **其他來源（附件/網頁）**：若未來擴充，統一套用與履歷相同規則；必要時依來源類型（PDF/HTML）採不同 Splitter。

2) 嵌入（Embeddings）
- 模型：OpenAI `text-embedding-3-small`（1536 維）。
- 策略：批次 32–128、退避重試、快取重用；輸入正規化避免雜訊。

3) 儲存與索引（Supabase + pgvector）
- 表：`resume_chunks`（id, doc_id, section, idx, split, content, metadata, embedding vector(1536)）。
- 索引：`ivfflat` + cosine，相容 ANN；輔以 `(doc_id, section)` 索引。
- Upsert：自然鍵 `doc_id + section + idx + split`。

4) 建置與重建（現階段）
- 直接讀取 `resume.json`；僅需資料清洗與欄位映射的單元測試即可。

備註（未來 ingestion）
- 當導入向量庫：`resume.tex` → 解析與 chunking → embedding → 批量寫入資料表 → upsert/版本控管 → 指標驗證。

5) 查詢與檢索（Vector + 規則直出）
- 將短句問題向量化後進行向量檢索（Top-k 5–8）；可啟用 MMR 去冗與相似度閾值。
- 對聯絡方式等標準欄位，可平行做規則直出並與向量檢索結果合併（提升精確度）。
- 若相似度皆低於閾值，回覆不知道／與履歷無關。

6) 回答組裝（Answer Synthesis）
- 擷取對應欄位內容與 metadata，做最小化去重與排序，組成上下文。
- 提示詞要點：
  - 僅根據提供的上下文回答；缺資訊時直說不知道。
  - 輸出時附上來源標註（如 section 與 index）。
- 串流：支援 SSE/Chunked，於完成時附上 citations 彙總。

7) 成本與效能考量
- 成本：優先使用 `text-embedding-3-small`；透過快取與去重降低重算。
- 吞吐：批次請求並行、向量索引使用 ANN（如 ivfflat）以加速查詢。
- 資料規模：定期維護索引參數與統計，批量寫入後做分析以穩定效能。

成本主要來自 LLM 生成與向量查詢；透過縮小上下文、快取與 ANN 參數調整可控成本。

8) 安全與隱私
- 啟用 Supabase RLS，限制寫入與查詢角色權限。
- 僅儲存必要個資；針對敏感欄位可做遮罩或摘要化處理。
- 金鑰管理：環境變數與密鑰保管（不進版控）。

9) 可觀測性與評測
- 追蹤：以 Langfuse 追蹤檢索與生成的延遲、成本與品質。
- 評測：建立固定的問答回歸集，定期比較 Top-k 命中率與回答可用性。
- 回饋：介面提供使用者「有幫助/無幫助」回饋，納入後續修正。

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

### API 設計（是否採用 REST）
- **Next.js（對前端）**：`POST /api/chat`（REST + SSE 串流回傳 tokens）。
  - 優點：簡單、相容 CDN/代理、監控與重試容易、瀏覽器友善。
  - 缺點：僅單向串流；若需雙向互動或主動事件推送可考慮 WebSocket。
- **Python 後端（RAG 核心）**：
  - `POST /rag/query`：body `{ question|messages, top_k?, filters?, stream? }`；回傳 `{ answer, citations[] }` 或 SSE 串流。
  - `POST /rag/ingest`：觸發/重建向量索引（受保護）。
  - `GET /rag/health`：健康檢查。
- **是否使用 REST？** 此場景通常使用「REST + SSE」。服務間若未來需要強型別與更高效二進位傳輸，可考慮 gRPC。

10) 待辦與擴充
- TODO：挑選前端行為追蹤工具（游標活動、點擊位置）以優化體驗與知識缺口分析。
- TODO：加入混合檢索（BM25 + 向量）與重排序，提升準確度。
- TODO：當 `resume.json` 變更時觸發自動重建（Webhook/CI）。
# 履歷問答：AI Chatbot 整合與 RAG 架構設計

## 文件目的

> 本文件旨在為現有履歷網站整合一個基於 `vercel/ai-chatbot` 的 AI 聊天機器人，並透過客製化的 RAG（Retrieval-Augmented Generation）流程，使其能根據 `resume.json` 的內容準確回答問題。文件闡述架構選項、技術細節與實施步驟，並以前後端職責分離（Next.js 代理 + Python 後端）為主軸，搭配 LangChain（檢索鏈編排）與 Langfuse（可觀測性與品質追蹤）。

---

## RAG 架構設計

### 架構採用（前後端分離 + Supabase pgvector + 後端生成）

- **部署模式**：採用「Next.js 代理 + Python 後端」的職責分離方案。
- **檢索**：Python 直接呼叫 Supabase 的 RPC `match_resume_chunks`，以 `pgvector` 進行 cosine 相似度檢索（Top‑k 5–8、可加 MMR 去冗）。
- **生成**：預設於 Python 後端使用 OpenAI Chat 完成生成（非串流 JSON 一次回傳）；後續可改由 Next.js 以 SSE 串流或代理後端 SSE。
- **可觀測性**：可於後續加入 **Langfuse**；本版為最小可行實作。
- **向量庫**：[Supabase](https://supabase.com/) + `pgvector`；embedding 採 `text-embedding-3-small`（1536 維）。



#### 部署與環境假設（Amplify Hosting）

- **前端/SSR/Next.js API**：採用 AWS Amplify Hosting 部署 `src/nextjs`（含 `app/api` 路由）。Amplify 以 CloudFront + Lambda（SSR/Route handlers）承載 Next.js，靜態資產放置於 S3，對外提供自訂網域（`yihsuanliao.com`）。UI 與路由沿用 `vercel/ai-chatbot` 的結構（`useChat`、SSE/JSON 兼容）。
- **Python RAG 後端**：部署於 AWS Lambda（Python 3.11）+ API Gateway（Regional）。此服務提供 `/rag/query`。
- **網路路徑**：
  - 現階段（JSON）：Browser → CloudFront(Amplify) → Next.js `/api/chat` → 呼叫 API Gateway 的 Python `/rag/query` 取得 prompt/context/citations 或直接 `answer`（非串流 JSON）→ 一次性回前端。
  - 後續（SSE）：Browser → CloudFront(Amplify) → Next.js `/api/chat` → 取得後端內容並以 Vercel AI SDK 串流 LLM token（SSE）回前端，或代理後端 SSE。
- **金鑰與設定**：
  - Next.js（Amplify SSR Functions）只存取伺服器端金鑰（如 `OPENAI_API_KEY`、`LANGFUSE_*`），透過 Amplify 環境變數/Secrets 管理；不暴露於前端。
  - Python Lambda 金鑰（如 `SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`、`LANGFUSE_*`）放於 AWS Secrets Manager，於執行時載入。
- **CORS/網域**：若 Python API 與前端不同網域，API Gateway 的 CORS `Access-Control-Allow-Origin` 僅允許 Amplify 網域與自訂網域。
- **觀測性**：Amplify SSR Lambda 與 API Gateway/Lambda 由 CloudWatch 蒐集日誌；Langfuse 追蹤檢索與生成品質。
- **區域選擇**：Amplify Hosting 與 API Gateway/Lambda 儘量同區域（例如 `us-east-1`），降低延遲；與 Supabase 區域相近以縮短往返。
- **CI/CD**：
  - 前端：透過 Amplify 連結 Git 分支自動建置與部署。
  - 後端（Lambda + API Gateway）：
    - 初次建立（一次性）：以 AWS Console、CDK 或 Terraform 建立 API Gateway + Lambda、IAM 角色與 GitHub OIDC 信任關係、Lambda alias/Stage 等基礎設施。完成後無需再手動操作。
    - 後續部署（持續交付）：每次 push 到 GitHub 即由 GitHub Actions 透過 AWS OIDC 假設角色，打包 `src/python-backend`，執行 `aws lambda update-function-code` 更新程式碼，必要時 `publish-version` 並更新 alias 指向新版本。若 API Gateway 未變更，無需重新部署 Stage。

#### 服務分工（可切換 JSON/SSE 與前後端生成位置）

- Python 後端：檢索、去冗、重排序、prompt/context 組裝與 citations 產出；可選擇是否在後端直接呼叫 LLM（以環境變數切換）。
- Next.js API（Amplify SSR Functions）：作為統一代理與（預設）生成端；接收 Python 回傳的 prompt/context 與 citations，
  - JSON 模式：一次性回傳答案 JSON。
  - SSE 模式：使用 Vercel AI SDK 進行 LLM 串流生成，或代理後端 SSE，將結果與 citations 串流回前端。

---

### 流程總覽（現階段）

1. 準備資料：以 `resume.json` 進行「按邏輯單元的 chunking」並向量化，寫入 Supabase/pgvector。
2. 查詢處理：使用者發問向量化 → 透過 RPC `match_resume_chunks` 以 cosine 取回 Top‑k（5–8），並可套用 MMR 去冗；對聯絡方式等可規則直出。
3. 生成：Python 後端以提示模板聚合 contexts，呼叫 OpenAI Chat 完成生成（非串流 JSON）。
4. 回傳：一次性 JSON（`answer`、`bullets[]`、`citations[]`）。低信心時回「需要澄清」並給建議追問。

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

詳細的資料庫表格結構請參考 [Data_model.md](./Data_model.md)。

核心配置：
- 主表：`resume` 存放結構化履歷資料
- 向量表：`resume_chunks` 存放文本片段及其向量化表示  
- Upsert 策略：使用 `chunk_id` 作為主鍵避免重複寫入
- 向量索引：IVFFlat + cosine 相似度，支援高效的語意搜尋
- 輔助索引：針對 `doc_id` 和 `section` 建立 B-tree 索引

#### 4) 建置與重建（現階段）

- 直接讀取 `resume.json`；僅需資料清洗與欄位映射的單元測試即可。

備註（未來 ingestion）

- 當導入向量庫：`resume.tex` → 解析與 chunking → embedding → 批量寫入資料表 → upsert/版本控管 → 指標驗證。

#### 5) 查詢與檢索（Supabase RPC + 規則直出）

- 問題向量化 → 呼叫 `match_resume_chunks(query_embedding, match_count, filter_doc_id)` 取回 Top‑k（5–8）。
- 可選：MMR 去冗、關鍵字混分；設定低分閾值（例如 0.72）觸發澄清引導。
- 聯絡方式/教育等標準欄位：走規則直出（略過 LLM），或與向量結果合併提升精確度。

#### 6) 回答組裝與提示工程（後端生成）

- 後端將 `contexts`（含 `section/idx/split/content`）組裝為 prompt，嚴格限制「僅根據 contexts 回答」。
- 回傳統一 JSON：`{ answer: string, bullets: string[], citations: [{section, idx}], follow_up?: string[] }`。
- 提示模板（摘要 + Q&A）：

```text
你是專業的履歷助理（角色可為人資或資深工程師）。僅根據提供的 contexts 回答；若不足，回答「根據履歷無法判定」，並提出 1 個澄清問題。
輸出：
- 先列出 2–5 個重點（條列）
- 最後 1 句總結
- 附上最多 3 個 citations，格式如 [jobs:0], [projects:2]
```

- `audience`（hr/eng）可微調語氣與重點：影響/規模/交付 vs 架構/資料/部署/品質。

#### 6.1) 傳輸與生成位置開關（建議環境變數）

- `RAG_STREAMING=false|true`（預設 false：JSON；true：SSE 串流）。
- `GENERATION_IN_BACKEND=false|true`（預設 false：Next.js 生成；true：Python 生成並由 Next.js 代理）。

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




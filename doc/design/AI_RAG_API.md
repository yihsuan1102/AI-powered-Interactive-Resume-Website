# 履歷問答 API 文件（Markdown）

> 根據 `AI_RAG_design.md` 與 `AI_RAG_roadmap.md` 制定的 HTTP API 介面文件。對應的 OpenAPI 版請見 `doc/design/AI_RAG_openapi.yaml`。

- **前端統一入口（Next.js／Amplify）**: `POST /api/chat`
- **後端 RAG（Python Lambda + API Gateway）**: `POST /rag/query`
- **傳輸模式**: 僅支援非串流 JSON（SSE 未開放）。
- **citations 格式**: `[{ section, idx, split? }]`，`section ∈ { contact, education, jobs, projects, skills }`

---

## 1. 架構與部署總覽

- 前端/SSR：Next.js（Amplify Hosting）提供 `/api/chat`，可直接生成或代理後端。
- 後端（RAG）：API Gateway + Lambda（Python 3.11）提供 `/rag/query`，負責檢索、提示組裝與（預設）生成。
- 向量庫：Supabase + `pgvector`，RPC：`match_resume_chunks`。
- 安全：後端建議以 `x-api-key` 或其他保護機制；前端金鑰僅存於伺服器端（SSR/Route Handlers）。

---

## 2. 端點：POST /api/chat（Next.js 代理）

- **用途**：前端統一入口；現階段預設將請求轉發至後端 `/rag/query` 並回傳非串流 JSON。

### 2.1 Request Body（application/json）

| 欄位 | 型別 | 必填 | 預設 | 說明 |
|---|---|:---:|---|---|
| `message` | string | ✓ |  | 使用者訊息（單輪提問） |
| `audience` | enum(`hr`,`eng`) |  |  | 回答面向（語氣與重點微調） |
| `top_k` | integer |  | 8 | 檢索 Top‑k（範例 5–8） |
| `match_threshold` | number |  | 0.0 | 相似度閾值（cosine） |
| `doc_id` | string |  |  | 指定履歷版本（例：`resume:2025-01:zh`） |


#### 範例
```json
{
  "message": "請以重點條列介紹你的 Kubernetes 經驗",
  "audience": "eng",
  "top_k": 8,
  "match_threshold": 0.0,
  "doc_id": "resume:2025-01:zh"
}
```

### 2.2 Responses

- 200 OK（application/json）
```json
{
  "answer": "具備 K8s 部署與監控經驗...",
  "bullets": ["建置 GitOps 部署流程", "以 HPA 與 VPA 自動伸縮"],
  "citations": [
    { "section": "jobs", "idx": 0 },
    { "section": "projects", "idx": 2 }
  ],
  "follow_up": ["需要更詳細的叢集規模嗎？"]
}
```

- 錯誤
```json
// 400 Bad Request
{
  "code": "bad_request",
  "message": "缺少必要欄位 message"
}
```

### 2.3 cURL 範例
```bash
curl -X POST https://app.your-domain.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "請條列你的資料工程專案亮點",
    "audience": "eng",
    "top_k": 8
  }'
```

---

## 3. 端點：POST /rag/query（Python RAG 後端）

- **用途**：RAG 檢索、提示組裝與（預設）後端生成；以非串流 JSON 回傳，支援回傳 contexts。
- **安全**：建議以 `x-api-key` 或其他保護；可選 `Authorization: Bearer <token>`。

### 3.1 Headers

- `Content-Type: application/json`
- `x-api-key: <your-api-key>`（建議）
- `Authorization: Bearer <token>`（可選）

### 3.2 Request Body（application/json）

| 欄位 | 型別 | 必填 | 預設 | 說明 |
|---|---|:---:|---|---|
| `question` | string | ✓ |  | 使用者問題（短句） |
| `audience` | enum(`hr`,`eng`) |  |  | 回答面向（語氣與重點微調） |
| `top_k` | integer |  | 8 | 檢索 Top‑k（範例 5–8） |
| `match_threshold` | number |  | 0.0 | 相似度閾值（cosine） |
| `doc_id` | string |  |  | 指定履歷版本（例：`resume:2025-01:zh`） |
| `include_context` | boolean |  | false | 回傳使用到的 contexts |
| `stream` | boolean |  | false | 串流（若後端未啟用，忽略） |
| `generation_in_backend` | boolean |  | true | 是否於後端直接生成 |

#### 範例
```json
{
  "question": "S3 與 Redshift 成本優化的作法有哪些？",
  "audience": "eng",
  "top_k": 8,
  "match_threshold": 0.0,
  "doc_id": "resume:2025-01:zh",
  "include_context": true,
  "generation_in_backend": true
}
```

### 3.3 Responses（application/json）
```json
{
  "answer": "主要從儲存分層、壓縮與併檔、查詢調優三面向...",
  "bullets": [
    "以 lifecycle 移轉 infrequent access 降低 S3 成本",
    "Redshift WLM 與排序鍵/分佈鍵調整"
  ],
  "citations": [ { "section": "projects", "idx": 1 } ],
  "contexts": [
    {
      "section": "projects",
      "idx": 1,
      "split": 0,
      "chunk_id": "projects:1:0",
      "content": "在資料平台...（截斷）",
      "metadata": { "company": "ACME" }
    }
  ],
  "model": "gpt-4o-mini",
  "usage": {
    "prompt_tokens": 800,
    "completion_tokens": 200,
    "total_tokens": 1000,
    "latency_ms": 1200
  }
}
```

- 錯誤
```json
// 401 Unauthorized
{
  "code": "unauthorized",
  "message": "無效或缺少 API 金鑰"
}
```

### 3.4 cURL 範例
```bash
curl -X POST "https://{apiId}.execute-api.us-east-1.amazonaws.com/prod/rag/query" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "question": "請條列你的資料工程專案亮點",
    "include_context": true
  }'
```

---

## 4. 錯誤與回應格式

| 狀態碼 | `code` | 說明 |
|---|---|---|
| 400 | `bad_request` | 參數錯誤或缺少必填欄位 |
| 401 | `unauthorized` | 未授權或金鑰無效 |
| 429 | `rate_limited` | 達到流量限制 |
| 500 | `internal_error` | 伺服器端錯誤 |

標準錯誤格式：
```json
{
  "code": "bad_request",
  "message": "缺少必要欄位 question/message",
  "details": {"field": "question"},
  "request_id": "req_123"
}
```

---

## 5. 安全、CORS 與設定

- 後端：API Gateway 建議設定 `x-api-key`，或以 IAM/JWT 保護；金鑰置於 Secrets Manager。
- 前端：SSR/Route Handlers 僅在伺服器端讀取金鑰（如 `OPENAI_API_KEY`）。
- CORS：允許 Amplify 與自訂網域來源；僅允許必要方法與標頭。

### 5.1 環境變數（行為開關）

| 變數 | 值 | 預設 | 說明 |
|---|---|---|---|
| `GENERATION_IN_BACKEND` | `false`/`true` | `true`（後端）或 `false`（前端） | 生成位置切換 |

---

## 6. 版本與相容性

- API 版本：`v0.1.0`
- 變更策略：新增欄位以向後相容為原則；破壞性變更需提升版本並公告。

---

## 7. 參考

- 設計文件：`doc/design/AI_RAG_design.md`、`doc/design/AI_RAG_roadmap.md`
- OpenAPI：`doc/design/AI_RAG_openapi.yaml`

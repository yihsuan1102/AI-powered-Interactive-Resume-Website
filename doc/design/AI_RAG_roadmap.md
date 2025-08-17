# 履歷問答：實施藍圖（Roadmap）

## 備註

- 前端對話框外觀與擺放位置：待設計（TBD）。
- 本階段優先完成：AI_RAG_design.md 流程 1–6、LangChain 整合、Langfuse 接入、Redis setting、無關提問（Guardrails）。
- 其餘 UI 細節與進階功能將於後續階段進行。
 - UI 與路由：沿用 `vercel/ai-chatbot` 的架構與元件，依需求微調外觀與行為（樣式採 Tailwind/shadcn/ui）。

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
6. 傳輸模式（現階段先 JSON）：優先以非串流 JSON 回傳，暫不開啟 SSE；後續可切換為 SSE 串流。

---

## Phase 2: 整合 RAG 流程（Supabase pgvector + 後端生成）

1. 資料來源與檢索（`resume.json` 向量化）：
   - 使用者問題為短句，不對問題做 chunking；直接向量化後檢索。
   - `src/nextjs/data/resume.json` 以「邏輯單元」為粒度做 chunking 與向量化，寫入 Supabase `resume_chunks`。
   - 於 Supabase 建立 RPC `match_resume_chunks`，以 `pgvector` cosine 取回 Top‑k。
2. 建立 Python RAG 端點（`POST /rag/query`，後端生成）：
   - 後端直接：向量檢索（RPC）→ 組裝提示 → 呼叫 OpenAI Chat → 回傳 `answer/bullets/citations` JSON。
   - 聯絡/教育等標準欄位採規則直出，必要時與向量結果合併。
   - 可於後續引入 Langfuse 追蹤 ingestion、檢索、生成。
3. Next.js API 作為代理（`/api/chat`）：
   - 將前端請求轉發到 Python `/rag/query`；現階段以非串流 JSON 回傳。
   - 之後可改以 `streamText` 串流後端生成結果或由前端代為生成（環境變數切換）。
4. 升級前端元件（`ChatWidget.tsx`）：
   - 解析 SSE/Chunked 串流，顯示 citations；失敗情境友善提示。
   - UI 提供 Top-k 調整與「顯示來源」切換。

5. 部署與安全要點：
   - 前端/SSR/Next.js API：以 AWS Amplify Hosting 部署 `src/nextjs`（含 `app/api` 路由）。
   - Python RAG：部署於 AWS Lambda（Python 3.11）+ API Gateway；僅提供 `/rag/query`。將 `SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`、`OPENAI_API_KEY` 等存於 Secrets Manager。
   - CORS：API Gateway 的 `Access-Control-Allow-Origin` 僅允許 Amplify 網域與自訂網域。



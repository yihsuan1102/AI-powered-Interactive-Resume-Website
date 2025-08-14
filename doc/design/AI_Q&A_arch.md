## RAG 流程（履歷問答系統）

流程總覽（精簡版）
1. 準備資料：將履歷各段落拆成 chunk，利於精準檢索。
2. 產生 Embedding：用 OpenAI `text-embedding-3-small` 將每個 chunk 向量化。
3. 儲存到向量資料庫：寫入 Supabase `pgvector` 並建立向量索引。
4. 檢索：將問題向量化，取 Top-k 最相似段落作為上下文。
5. 回答：把相關段落與原始問題送入 LLM 生成回答。

---

### 詳細流程設計（無程式碼）

1) 資料準備與切分（Chunking）
- 來源：`resume.json` 的 `contact`、`education`、`jobs`、`projects`、`skills`。
- 扁平化規則：
  - `contact`：整合為一段可讀文本。
  - `education`/`jobs`/`projects`：每一筆獨立成段，將 overview 與重點任務合併（必要時再細分）。
  - `skills`：依技能類別（如 Programming Language、Tools）各自成段。
- 長度控制：單段約 700–1000 字；過長時按句子或段落切分，保留語義完整。
- 中繼資料（metadata）：至少包含 `index`（原始序號）、`source`（欄位名）、必要時的 `split`（分段序）。
- 正規化與去重：去除空白段、重複內容與雜訊。

2) 嵌入模型與策略（Embeddings）
- 模型建議：OpenAI `text-embedding-3-small`（1536 維，性價比高）。
- 何時改用 large：需要極致語義準確度或長文本對齊時。
- 批次策略：建議批次 32–128；遇到速率限制時退避重試。
- 穩定性：同輸入在同模型下嵌入結果一致，利於快取與重現。

3) 儲存與索引設計（Supabase + pgvector）
- 表結構（概念）：`resume_chunks`
  - `id`（主鍵）、`doc_id`（如 'resume'）、`section`（來源欄位）、`content`（純文字）、`metadata`（JSON）、`embedding`（向量）。
- 向量維度：1536（對應 small 模型）。
- 索引：向量欄位使用 cosine 相似度；輔以 `doc_id` 索引做篩選。
- 唯一性／更新：以 `doc_id + section + index + split` 作為自然鍵進行 upsert，避免重複資料。

4) 建置與重建流程（Ingestion）
- 讀取 `resume.json` → 依規則切分 → 產生嵌入 → 批次寫入資料表。
- 重建策略：
  - 簡化：先刪除同 `doc_id` 資料，再整批寫入。
  - 無刪除權限時：以 upsert 覆蓋（依自然鍵），並標記 `doc_version` 做版本控管。
- 成功驗證：比對寫入筆數、抽查幾筆內容與向量是否存在，更新索引統計。

5) 查詢與檢索（Retrieval）
- 將使用者問題轉為向量；`where doc_id='resume'` 篩選。
- 以 cosine 相似度取 Top-k（建議 k=5~8）。
- 可選：MMR 去冗、相似度閾值過低時返回「無相關內容」。

6) 回答組裝（Answer Synthesis）
- 取回 Top-k 內容與 metadata，去重並排序，組成上下文。
- 提示詞要點：
  - 僅根據提供的上下文回答；缺資訊時直說不知道。
  - 輸出時附上來源標註（如 section 與 index）。
- 控制長度：限制上下文與回覆字數，避免超過模型上下文長度。

7) 成本與效能考量
- 成本：優先使用 `text-embedding-3-small`；透過快取與去重降低重算。
- 吞吐：批次請求並行、向量索引使用 ANN（如 ivfflat）以加速查詢。
- 資料規模：定期維護索引參數與統計，批量寫入後做分析以穩定效能。

8) 安全與隱私
- 啟用 Supabase RLS，限制寫入與查詢角色權限。
- 僅儲存必要個資；針對敏感欄位可做遮罩或摘要化處理。
- 金鑰管理：環境變數與密鑰保管（不進版控）。

9) 可觀測性與評測
- 追蹤：以 Langfuse 追蹤檢索與生成的延遲、成本與品質。
- 評測：建立固定的問答回歸集，定期比較 Top-k 命中率與回答可用性。
- 回饋：介面提供使用者「有幫助/無幫助」回饋，納入後續修正。

10) 待辦與擴充
- TODO：挑選前端行為追蹤工具（游標活動、點擊位置）以優化體驗與知識缺口分析。
- TODO：加入混合檢索（BM25 + 向量）與重排序，提升準確度。
- TODO：當 `resume.json` 變更時觸發自動重建（Webhook/CI）。
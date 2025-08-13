# Tech stack
| 類別 (Category)   | 技術 (Technology)                      | 理由 (Reason)                                                      |
|-------------------|---------------------------------------|-------------------------------------------------------------------|
| 前端 (Frontend)   | Next.js (React)                       | 提供 SSR/SSG/ISR、檔案式路由、邊緣執行與內建資產最佳化。 |
| 後端 (Backend)    | Next.js (API Routes) & FastAPI (Python) | API Routes 快速處理輕量邏輯與邊緣部署；FastAPI 具高效非同步、型別驗證與自動文件，適合 AI/資料工作流。 |
| 履歷解析 (Parser) | LLM (GPT-5 Vision)  | 能穩健解析 PDF/LaTeX 並輸出結構化資料，降低自建規則成本。 |
| 主要資料庫        | Supabase (PostgreSQL)                 | 受管 PostgreSQL，支援 SQL/交易/RLS，並內建驗證與儲存，簡化全端資料與權限管理。 |
| 向量資料庫        | Supabase (pgvector)                   | 與 PostgreSQL 同庫整合，提供原生向量相似度查詢，確保交易一致性並降低維運複雜度。 |
| AI 問答核心       | LangChain (Python)                    | RAG 組件齊全（索引/檢索/後處理/工具/Agent），生態豐富，便於快速編排與替換元件。 |
| LLM 模型          | OpenAI API           | 成本最低。 |
| 快取 (Caching)    | Redis (Upstash)                       | 記憶體型快取與 TTL/併發控制/分散式鎖；Upstash 無伺服器計費與全球邊緣存取，降延遲降成本。 |
| AI 可觀測性       | Langfuse                             | 提供 prompt/trace/評測與統計，監控 RAG 管線品質、分析成本並支援實驗對照。 |
| CI/CD             | GitHub Actions                       | 與 GitHub 深度整合，支援矩陣建置、快取與祕鑰管理，輕鬆自動化測試與部署。 |
| 部署與架構        | AWS Amplify                           | 省成本，內建 CI/CD 與全球 CDN，適合 Next.js 快速上線與規模化。 |
 
TODO: 尋找適合的工具，用於偵測使用者行為（游標活動、點擊位置）。

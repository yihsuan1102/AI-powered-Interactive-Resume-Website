# Tech stack
| 類別 (Category)   | 技術 (Technology)                      | 理由 (Reason)                                                      |
|-------------------|---------------------------------------|-------------------------------------------------------------------|
| 前端 (Frontend)   | Next.js (React) + Tailwind CSS        | 業界領先的 React 框架，提供最佳的開發體驗與效能。                 |
| 後端 (Backend)    | Next.js (API Routes) & FastAPI (Python) | 職責分離，Next.js 處理前端請求，Python 專注於複雜的 AI/資料處理。  |
| 履歷解析 (Parser) | LLM (GPT-4o Vision) / Anthropic Claude 3 | 直接使用大型語言模型進行文件解析，比傳統 Regex 或 pylatexenc 更穩健、更智能。 |
| 主要資料庫        | Supabase (PostgreSQL)                 | 提供資料庫、向量儲存、身份驗證等功能，是優秀的後端即服務 (BaaS) 平台。 |
| 向量資料庫        | Supabase (pgvector)                   | 與主資料庫整合，簡化架構，降低維護成本。                           |
| AI 問答核心       | LangChain / LlamaIndex (Python)       | 實現 RAG 的標準框架，提供模組化且可擴展的元件。                     |
| LLM 模型          | OpenAI API / Anthropic API            | 頂尖的語言模型，保證生成品質。                                     |
| 快取 (Caching)    | Redis (Upstash)                       | 高效能的記憶體資料庫，用於快取 API 回應，降低延遲與成本。           |
| AI 可觀測性       | Langfuse                             | 專為 LLM 應用設計的追蹤與除錯工具，是優化 RAG 的利器。              |
| CI/CD             | GitHub Actions                       | 實現從程式碼提交到自動化測試、建置、部署的完整流程。                 |
| 全端監控          | Sentry / LogRocket                   | 捕獲前端錯誤與使用者行為，並監控後端 API 效能，確保系統穩定。       |
| 部署與架構        | Docker, Vercel, AWS/GCP, Nginx       | 兼具 Serverless 的便利性與容器化的彈性，適合各種規模的部署需求。     |

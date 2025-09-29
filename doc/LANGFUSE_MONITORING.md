# Langfuse 執行監控指南

## 如何確認 Lambda 中 Langfuse 正確執行

### 1. 檢查 CloudWatch 日誌

當 query 送到 Lambda 後，在 AWS CloudWatch 中查看以下關鍵日誌訊息：

#### 初始化階段日誌
```
[LANGFUSE] Initialization check:
[LANGFUSE]   - LANGFUSE_PUBLIC_KEY: SET
[LANGFUSE]   - LANGFUSE_SECRET_KEY: SET
[LANGFUSE]   - LANGFUSE_HOST: https://us.cloud.langfuse.com
[LANGFUSE] Initialized successfully! Auth check: True
```

#### Query 執行階段日誌
```
[API] Received RAG query: question='用戶問題...', top_k=8
[API] Calling RAG pipeline...
[LANGFUSE] Query start - question: '用戶問題...'
[LANGFUSE] Langfuse client status: ACTIVE
[LANGFUSE] CallbackHandler created successfully
[LANGFUSE] Callbacks list length: 1
```

#### LLM 調用階段日誌
```
[LANGFUSE] Starting LLM generation with 1 callbacks
[LANGFUSE] Calling LLM.agenerate() with callbacks: ['LangchainCallbackHandler']
[LANGFUSE] LLM generation completed successfully
[LANGFUSE] Query completed successfully
[LANGFUSE] Flushed pending trace data
```

### 2. 問題診斷指標

#### 正常執行指標
- ✅ `Langfuse client status: ACTIVE`
- ✅ `CallbackHandler created successfully`
- ✅ `Callbacks list length: 1`
- ✅ `LLM generation completed successfully`
- ✅ `Flushed pending trace data`

#### 異常狀況及處理
| 日誌內容 | 問題原因 | 解決方案 |
|---------|---------|---------|
| `LANGFUSE_PUBLIC_KEY: MISSING` | 環境變數未設定 | 檢查 Lambda 環境變數配置 |
| `LANGFUSE_SECRET_KEY: MISSING` | 環境變數未設定 | 檢查 Lambda 環境變數配置 |
| `Langfuse client status: INACTIVE` | 初始化失敗 | 檢查 Langfuse 認證資訊 |
| `Callbacks list length: 0` | CallbackHandler 創建失敗 | 檢查 langfuse 套件版本 |
| `Auth check: False` | 認證失敗 | 驗證 public_key 和 secret_key |

### 3. Langfuse Dashboard 驗證

#### 檢查追蹤資料
1. 登入 Langfuse Dashboard (https://us.cloud.langfuse.com)
2. 查看 "Traces" 頁面
3. 確認有新的追蹤記錄出現
4. 檢查追蹤詳細資訊包含：
   - Input: 用戶問題
   - Output: 生成回答
   - Model: gpt-5-nano
   - Token usage
   - Latency

#### 延遲說明
- Langfuse 資料同步可能有 1-3 分鐘延遲
- 如果 5 分鐘後仍無資料，檢查上述日誌

### 4. 本地測試驗證

在部署前，可以本地測試 Langfuse 連接：

```bash
cd src/python-backend
source venv/Scripts/activate
python -c "
import asyncio
import os
from dotenv import load_dotenv
load_dotenv()

async def test():
    from rag import rag_pipeline
    result = await rag_pipeline(
        question='Test question',
        audience=None,
        top_k=2,
        match_threshold=0.0,
        doc_id=None,
        include_context=False
    )
    print('Test completed successfully')

asyncio.run(test())
"
```

### 5. 環境變數檢查清單

確保 Lambda 環境變數正確設定：

```bash
LANGFUSE_PUBLIC_KEY=pk-lf-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
LANGFUSE_SECRET_KEY=sk-lf-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
LANGFUSE_HOST=https://us.cloud.langfuse.com
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxx
OPENAI_MODEL=gpt-5-nano
SUPABASE_URL=https://xxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxxxxxxxxx
```

### 6. 常見問題排除

#### 問題：在 CloudWatch 看到初始化成功，但 Langfuse Dashboard 沒有資料
- 檢查 Langfuse 專案設定是否正確
- 確認 `LANGFUSE_HOST` 指向正確區域
- 檢查時區設定，可能有時間差異

#### 問題：CallbackHandler 創建失敗
- 檢查 langfuse 和 langchain 套件版本相容性
- 確保 requirements.txt 中版本號正確

#### 問題：認證失敗
- 重新生成 Langfuse API 金鑰
- 確認金鑰有正確的權限設定

### 7. 效能監控

監控以下指標：
- 追蹤成功率：應該 > 95%
- 平均延遲：flush 操作應該 < 100ms
- 錯誤率：CallbackHandler 錯誤應該 < 1%

這些日誌和監控點可以幫助你確認 Langfuse 在 Lambda 環境中是否正確執行。
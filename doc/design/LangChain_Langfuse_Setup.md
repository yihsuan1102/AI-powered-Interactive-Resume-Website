# LangChain + Langfuse 整合設定指南

## 概述

本文檔說明如何設定和使用整合了 LangChain 和 Langfuse 的新 RAG 系統。

## 環境變數設定

### 1. 複製環境變數範本

```bash
cp src/python-backend/.env.example src/python-backend/.env
```

### 2. 設定必要的環境變數

#### OpenAI 設定
```bash
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL=gpt-4  # 或 gpt-4o-mini
```

#### Langfuse 設定 (雲端可觀測性)
```bash
LANGFUSE_PUBLIC_KEY=pk_your-langfuse-public-key
LANGFUSE_SECRET_KEY=sk_your-langfuse-secret-key
LANGFUSE_HOST=https://cloud.langfuse.com
```

#### RAG 系統配置
系統現在只支援 Supabase + LangChain 模式，提供最佳的效能和可靠性。

## Langfuse 雲端服務設定

### 1. 註冊 Langfuse Cloud

1. 前往 [Langfuse Cloud](https://cloud.langfuse.com)
2. 註冊新帳號或登入
3. 建立新專案 (例如: "Resume Chatbot")

### 2. 取得 API Keys

1. 在 Langfuse 儀表板中，前往 Settings > API Keys
2. 建立新的 API key pair
3. 複製 Public Key (pk_xxx) 和 Secret Key (sk_xxx)
4. 將這些 keys 設定到環境變數中

### 3. 設定專案資訊

在 Langfuse 專案中設定：
- **Project Name**: Resume RAG Chatbot
- **Description**: Resume question-answering system with RAG
- **Tags**: resume, rag, chatbot

## 系統架構

### Supabase + LangChain 架構

系統採用單一高效能架構：

#### 核心特色
- LangChain RetrievalQA chain
- Supabase pgvector 向量資料庫
- 自動 Langfuse callback 整合
- 生產環境就緒的高可用性設計

### 架構流程

```
Query → OpenAI Embeddings → Supabase pgvector → LangChain → Langfuse 追蹤
```

## 可觀測性功能

### Langfuse 追蹤項目

#### 1. 查詢追蹤
- 使用者問題
- 檢索參數 (top_k, threshold)
- 觀眾類型 (hr/eng)

#### 2. Embedding 追蹤  
- 文件向量化過程
- Token 使用量
- 處理時間

#### 3. 生成追蹤
- LLM 模型使用
- 生成 token 數量
- 回應時間
- 成本分析

#### 4. 檢索追蹤
- 找到的相關文件
- 相似度分數
- 引用資訊

### 儀表板功能

在 Langfuse 儀表板中可以查看：
- **總成本分析**: OpenAI API 花費追蹤
- **延遲分析**: 各組件處理時間
- **品質指標**: 檢索命中率、回答相關性
- **使用模式**: 熱門問題類型、peak hours

## 測試設定

### 1. 本地測試

```bash
cd src/python-backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 2. 測試 API

```bash
curl -X POST http://localhost:8000/rag/query \
  -H "Content-Type: application/json" \
  -d '{
    "question": "你有什麼技能？",
    "audience": "hr",
    "top_k": 5,
    "include_context": true
  }'
```

### 3. 檢查 Langfuse 追蹤

1. 發送幾個測試請求
2. 前往 Langfuse 儀表板
3. 查看 "Traces" 頁面確認資料收集

## 部署注意事項

### AWS Lambda 環境變數

在 AWS Lambda 設定中加入：
```bash
LANGFUSE_PUBLIC_KEY=pk_xxx
LANGFUSE_SECRET_KEY=sk_xxx
LANGFUSE_HOST=https://cloud.langfuse.com
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 安全性

- Langfuse keys 應存放在 AWS Secrets Manager
- 在生產環境中啟用 API key 保護
- CORS 設定限制來源網域

## 效能最佳化

### Supabase + LangChain 最佳化

```python
# 向量資料庫配置 (生產環境)
retriever = SupabaseRetriever(
    supabase_client=supabase,
    embeddings=embeddings
)
```

### 效能最佳化建議

- 使用 pgvector 索引提升查詢速度
- 適當設定 match_threshold 和 top_k 參數
- 實施查詢結果快取機制

## 故障排除

### 常見問題

#### 1. Langfuse 連接失敗
```bash
# 檢查 API keys 格式
echo $LANGFUSE_PUBLIC_KEY | grep "pk_"
echo $LANGFUSE_SECRET_KEY | grep "sk_"
```

#### 2. LangChain 導入錯誤
```bash
# 確認套件安裝
pip list | grep langchain
pip install langchain langchain-openai langchain-community supabase langfuse
```

#### 3. 向量化失敗
```bash
# 檢查 OpenAI API key
echo $OPENAI_API_KEY | grep "sk-"
```

## 監控與警報

### Langfuse 警報設定

1. 設定成本警報（每月 OpenAI 費用）
2. 延遲警報（回應時間 > 5 秒）
3. 錯誤率警報（失敗率 > 5%）

### CloudWatch 整合

AWS Lambda 的 CloudWatch 指標：
- 執行時間
- 記憶體使用量
- 錯誤率
- 並發請求數

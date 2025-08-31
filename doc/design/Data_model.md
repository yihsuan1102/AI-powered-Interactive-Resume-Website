# Data Model

## 資料庫架構概述

本專案使用 Supabase (PostgreSQL) 作為主要資料庫，包含兩個主要資料表：
- `resume`: 存放結構化履歷資料
- `resume_chunks`: 存放向量化的履歷內容片段，用於 RAG (Retrieval-Augmented Generation) 功能

## 資料表結構

### resume

| 欄位名稱 (Field) | 資料類型 (Type)   | 約束 (Constraints) | 描述 (Description)           |
|-----------------|--------------------|--------------------|------------------------------|
| id              | UUID               | PRIMARY KEY, DEFAULT gen_random_uuid() | 唯一的履歷 ID |
| about_me        | TEXT               | NULL               | 「關於我」的內容 |
| contact         | JSONB              | NULL               | 聯絡資訊的結構化資料 |
| education       | JSONB              | NULL               | 學歷背景的結構化資料 |
| jobs            | JSONB              | NULL               | 工作經驗的結構化資料 |
| skills          | JSONB              | NULL               | 技能清單的結構化資料 |
| projects        | JSONB              | NULL               | 專案經驗的結構化資料 |
| created_at      | TIMESTAMPTZ        | NULL, DEFAULT now() | 建立時間 |
| updated_at      | TIMESTAMPTZ        | NULL, DEFAULT now() | 最後更新時間 |

### resume_chunks

| 欄位名稱 (Field) | 資料類型 (Type)        | 約束 (Constraints) | 描述 (Description)                         |
|------------------|------------------------|--------------------|--------------------------------------------|
| chunk_id         | TEXT                   | PRIMARY KEY        | 唯一的 chunk ID                             |
| doc_id           | TEXT                   | NOT NULL           | 文件 ID，關聯到特定履歷                    |
| section          | TEXT                   | NULL, CHECK        | 履歷區塊：contact, education, jobs, projects, skills |
| idx              | INTEGER                | NOT NULL           | 在該 section 中的索引位置                   |
| split            | INTEGER                | NOT NULL           | 切分編號（用於長段落的細分）                |
| content          | TEXT                   | NOT NULL           | 切分後的文本段落                            |
| metadata         | JSONB                  | NULL               | 額外的中繼資料，如標題、時間區間等          |
| embedding        | VECTOR                 | NULL               | OpenAI Embedding 向量（用於語意搜尋）       |

#### resume_chunks 約束條件

- **section CHECK 約束**: 限制 section 欄位只能是以下值之一：
  - `contact`
  - `education` 
  - `jobs`
  - `projects`
  - `skills`

#### 索引結構

- **resume_chunks_doc_id_idx**: `doc_id` 上的 B-tree 索引
- **resume_chunks_section_idx**: `section` 上的 B-tree 索引  
- **resume_chunks_embedding_ivf**: `embedding` 上的 IVFFlat 索引，用於向量相似度搜尋

## Supabase 設定

### 1. 建立新專案

1. 前往 [Supabase](https://supabase.com/) 並建立新專案
2. 記錄專案的 URL 和 API 金鑰

### 2. 建立資料表

在 Supabase 專案的 SQL Editor 中執行以下 SQL 指令：

```sql
-- 建立 resume 資料表
CREATE TABLE public.resume (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  about_me text NULL,
  contact jsonb NULL,
  education jsonb NULL,
  jobs jsonb NULL,
  skills jsonb NULL,
  projects jsonb NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT resume_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- 建立 resume_chunks 資料表
CREATE TABLE public.resume_chunks (
  chunk_id text NOT NULL,
  doc_id text NOT NULL,
  section text NULL,
  idx integer NOT NULL,
  split integer NOT NULL,
  content text NOT NULL,
  metadata jsonb NULL,
  embedding extensions.vector NULL,
  CONSTRAINT resume_chunks_pkey PRIMARY KEY (chunk_id),
  CONSTRAINT resume_chunks_section_check CHECK (
    (
      section = any (
        array[
          'contact'::text,
          'education'::text,
          'jobs'::text,
          'projects'::text,
          'skills'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

-- 建立索引
CREATE INDEX IF NOT EXISTS resume_chunks_doc_id_idx 
ON public.resume_chunks USING btree (doc_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS resume_chunks_section_idx 
ON public.resume_chunks USING btree (section) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS resume_chunks_embedding_ivf 
ON public.resume_chunks USING ivfflat (embedding extensions.vector_cosine_ops)
WITH (lists = '100') TABLESPACE pg_default;
```

### 3. 設定 Row Level Security (RLS)

```sql
-- 為 resume 資料表啟用 RLS 並允許公開讀取
ALTER TABLE public.resume ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to resume" 
ON public.resume 
FOR SELECT 
USING (true);

-- 為 resume_chunks 資料表設定適當的 RLS 政策
ALTER TABLE public.resume_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow service role full access to resume_chunks" 
ON public.resume_chunks 
FOR ALL 
USING (true);
```

### 4. 插入初始資料

插入至少一筆履歷資料到 `resume` 資料表中，確保 JSONB 欄位的資料結構正確。

### 5. 取得認證資訊

前往「Project Settings」→「API」取得：
- Project URL
- `anon public` 金鑰（供前端使用）
- `service_role` 金鑰（供後端服務使用，需保密）

## 資料關聯

- `resume_chunks.doc_id` 邏輯上關聯到 `resume.id`
- 一個 resume 可以對應多個 resume_chunks
- 每個 chunk 代表履歷中的一個語意片段，用於 RAG 問答功能
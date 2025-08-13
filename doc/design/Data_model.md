# Data Model

### resume
| 欄位名稱 (Field) | 資料類型 (Type)   | 描述 (Description)           |
|-----------------|--------------------|-----------------------------|
| id              | UUID (Primary Key)  | 唯一的履歷 ID。              |
| about_me        | TEXT               | 「關於我」的內容。           |
| contact         | JSONB              | 聯絡資訊。                   |
| education       | JSONB              | 學歷背景的結構化資料。       |
| jobs            | JSONB              | 工作經驗的結構化資料。       |
| skills          | JSONB              | 技能清單的結構化資料。       |
| projects        | JSONB              | 專案經驗的結構化資料。       |
| created_at      | TIMESTAMPTZ        | 建立時間。                   |
| updated_at      | TIMESTAMPTZ        | 最後更新時間。               |

### vector

| 欄位名稱 (Field) | 資料類型 (Type)        | 描述 (Description)                         |
| ------------ | ------------------ | ---------------------------------------- |
| id           | UUID (Primary Key) | 唯一 ID，建議用 UUID                           |
| resume\_id   | UUID (Foreign Key) | 關聯到履歷主 Table 的 id，知道這段文本屬於誰的履歷           |
| section      | TEXT               | 履歷區塊，例如 education / experience / project |
| content      | TEXT               | 切分後的文本段落                                 |
| embedding    | VECTOR(1536)       | 向量欄位，存 OpenAI Embedding (1536 維度)        |
| metadata     | JSONB              | 其他備註，例如段落標題、來源、時間區間等                     |
| created\_at  | TIMESTAMPTZ        | 建立時間                                     |

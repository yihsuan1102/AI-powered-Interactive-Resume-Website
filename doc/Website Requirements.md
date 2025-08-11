# Website Requirements 

**專案名稱**：AI-powered Interactive Resume Website

**目標**：
- 建立一個智慧型履歷網站，使用者（訪客、面試官、人資）可以：
  - 瀏覽履歷內容（About、Education、Skills、Projects、Contact）
  - 與 AI 問答系統互動，從履歷與專案知識庫中獲取答案
  - 讓開發者可以管理與分析使用者的網站使用行為

## User Requirements

| ID          | Description                                                  |
| ----------- | --------------------------------------------------------- |
| UR-01   | 瀏覽履歷與個人資訊                                           |
| Actor (Who) | 使用者                                                       |
| 時機 (When) | 進入網站首頁時                                               |
| Act (What)  | 在首頁看到「關於我」、「學歷」、「專案經驗」、「技能」等資訊 |
| Information | 履歷結構化內容（關於我、學歷、專案、技能等）                 |
| 備註        | N/A                                                          |

| ID          | Description       |
| ----------- | ----------------- |
| UR-02     | AI 問答             |
| Actor (Who) | 使用者               |
| 時機 (When)   | 在首頁提問框輸入問題並送出時    |
| Act (What)  | 系統接收問題並回應與履歷相關的答案 |
| Information | 使用者輸入的問題內容        |
| 備註          | 回答需引用履歷中相關段落      |

| ID          | Description            |
| ----------- | ---------------------- |
| UR-03     | 即時顯示 AI 生成過程           |
| Actor (Who) | 使用者                    |
| 時機 (When)   | 提問後，系統正在生成答案時          |
| Act (What)  | 提問框下移並逐步顯示 AI 思考與生成的過程 |
| Information | AI 回答流式輸出資料            |
| 備註          | 顯示效果類似 ChatGPT 介面      |

| ID          | Description       |
| ----------- | ----------------- |
| UR-04     | 響應式設計             |
| Actor (Who) | 使用者               |
| 時機 (When)   | 使用桌面或行動裝置瀏覽網站時    |
| Act (What)  | 自動切換版面與排版以適應裝置大小  |
| Information | N/A               |
| 備註          | 包含深色模式 / 淺色模式自動切換 |

## System Requirements

| ID          | Description                               |
| ----------- | ----------------------------------------- |
| SR-01     | 資料儲存                                      |
| Actor (Who) | 系統                                        |
| 時機 (When)   | 新增或更新履歷資料時                                |
| Act (What)  | 儲存履歷結構化內容（關於我、學歷、專案、技能）|
| Information | 履歷資料                       |
| 備註          | 結構化資料需與 PDF 保持一致                          |

| ID          | Description                      |
| ----------- | -------------------------------- |
| SR-02     | 履歷更新（定期）                         |
| Actor (Who) | 系統                               |
| 時機 (When)   | 每日固定時間                           |
| Act (What)  | 從 GitHub 取得最新 LaTeX 履歷並解析，更新至資料庫 |
| Information | LaTeX 履歷檔案、解析後的履歷結構化資料           |
| 備註          | 定期更新以確保資料最新                      |

| ID          | Description                      |
| ----------- | -------------------------------- |
| SR-03     | 履歷更新（手動）                         |
| Actor (Who) | 系統管理員                            |
| 時機 (When)   | 管理員手動觸發更新時                       |
| Act (What)  | 從 GitHub 取得最新 LaTeX 履歷並解析，更新至資料庫 |
| Information | LaTeX 履歷檔案、解析後的履歷結構化資料           |
| 備註          | 可透過後台按鈕或命令行腳本觸發                  |

| ID          | Description                           |
| ----------- | ------------------------------------- |
| SR-04     | 履歷資料解析                                |
| Actor (Who) | 系統                                    |
| 時機 (When)   | 從 GitHub 取得 LaTeX 履歷後                 |
| Act (What)  | 解析 LaTeX 檔案，提取「關於我」、「學歷」、「專案」、「技能」等資料 |
| Information | LaTeX 履歷檔案、結構化履歷資料                    |
| 備註          | 確保資料格式一致性，方便 API 提供查詢                 |

| ID          | Description                    |
| ----------- | ------------------------------ |
| SR-05     | AI 問答處理                        |
| Actor (Who) | 系統                             |
| 時機 (When)   | 接收到使用者提問時                      |
| Act (What)  | 傳送問題給 AI 模型並接收回覆，將結果儲存並關聯至履歷內容 |
| Information | 問題內容、AI 回答、相關履歷段落              |
| 備註          | 回答需引用來源以增加可信度                  |

| ID          | Description      |
| ----------- | ---------------- |
| SR-06     | 快取               |
| Actor (Who) | 系統               |
| 時機 (When)   | 接收到重複問題時         |
| Act (What)  | 從快取中讀取已存在的回答並返回  |
| Information | 問題內容、快取回答        |
| 備註          | 設定快取過期時間以保持資料新鮮度 |

| ID          | Description              |
| ----------- | ------------------------ |
| SR-07     | API 提供                   |
| Actor (Who) | 系統                       |
| 時機 (When)   | 前端請求履歷資料或 AI 回答時         |
| Act (What)  | 透過 API 傳送履歷內容、AI 回答與相關資料 |
| Information | 履歷資料、AI 問答結果             |
| 備註          | API 應支援 JSON 格式輸出        |

| ID          | Description                              |
| ----------- | ---------------------------------------- |
| SR-08     | 安全性                                      |
| Actor (Who) | 系統                                       |
| 時機 (When)   | 所有 API 請求                                |
| Act (What)  | 確保 API 透過安全協定傳輸，防止惡意請求與 Prompt Injection |
| Information | 所有請求與回應資料                                |
| 備註          | 實作速率限制（Rate Limiting）與輸入檢查               |
W

# AWS Amplify 網站部屬與 Cloudflare 網域設定教學

這份教學將引導你完成以下設定：在 AWS Amplify 上部屬網站後，如何將你在 Cloudflare 購買的網域，成功連結到你的網站。

## 前置作業

* 你已經在 **AWS Amplify** 上部署好一個網站。
* 你已經在 **Cloudflare** 上購買並管理你的網域。
* 你已經在 AWS Amplify 的「**網域管理（Domain management）**」中新增網域，並看到系統正在等待驗證的狀態。

---

## 步驟一：在 AWS Amplify 取得 DNS 記錄

1.  登入 AWS Amplify 主控台。
2.  在左側導覽列中，選擇你的應用程式，點擊「**網域管理（Domain management）**」。
3.  在等待驗證的頁面中，你會看到 Amplify 提供的 **DNS 記錄資訊**。這些資訊通常包含：
    * **驗證紀錄（Verification Record）**：一個用於證明網域所有權的 `CNAME` 記錄。
    * **子網域紀錄（Subdomain Record）**：將你的網域指向 Amplify 網站的 `CNAME` 或 `A` 記錄。
4.  請將這些記錄的「**名稱**」（Name）和「**值**」（Value）複製下來，準備貼到 Cloudflare。

---

## 步驟二：在 Cloudflare 新增 DNS 記錄

這個步驟是整個流程中**最關鍵**的部分。你必須將 Amplify 提供的記錄手動加入 Cloudflare，並且要注意 **Proxy 狀態**。

1.  登入你的 Cloudflare 帳戶。
2.  在左側選單中選擇你的網域，然後點擊「**DNS**」。
3.  點擊「**Add record**」（新增記錄）。
4.  **首先，新增「驗證紀錄」**：
    * **類型（Type）**：選擇 `CNAME`。
    * **名稱（Name）**：貼上 Amplify 提供的驗證記錄名稱。
    * **內容（Content）**：貼上 Amplify 提供的驗證記錄值。
    * **Proxy 狀態（Proxy status）**：**重要！** 務必將橘色雲朵圖示點擊成**灰色（DNS only）**。否則 AWS 無法完成驗證。
    * 點擊「**Save**」。
5.  **接著，新增「子網域紀錄」**：
    * **類型（Type）**：選擇 `CNAME` 或 `A`，根據 Amplify 提供的資訊而定。
    * **名稱（Name）**：貼上你想要使用的子網域（例如 `www` 或 `@`）。
    * **內容（Content）**：貼上 Amplify 提供的子網域記錄值。
    * **Proxy 狀態（Proxy status）**：同樣將橘色雲朵圖示點擊成**灰色（DNS only）**。
    * 點擊「**Save**」。

---

## 步驟三：等待 AWS 完成驗證

1.  回到你的 AWS Amplify 主控台。
2.  Amplify 會自動偵測你新增的 DNS 記錄。
3.  這個過程需要一些時間，通常幾分鐘到幾小時不等，取決於 DNS 記錄的傳播速度。
4.  當網域狀態從「等待驗證（Pending verification）」變為「**可用（Available）**」時，就代表你成功了！

---

## 步驟四：選擇性開啟 Cloudflare CDN 代理

當網域成功連結後，你可以選擇性地開啟 Cloudflare 的 CDN 代理功能，以提升網站效能與安全性。

1.  回到你的 Cloudflare DNS 設定頁面。
2.  找到你為網站設定的**子網域紀錄**（例如 `www` 或 `@`）。
3.  點擊右側的「**Edit**」（編輯）。
4.  將 Proxy 狀態旁邊的**灰色雲朵圖示**點擊，讓它變成 **橘色**。
5.  點擊「**Save**」。

**重要提醒：** 只有子網域紀錄需要開啟代理。**驗證紀錄**請保持**灰色（DNS only）**狀態即可。

現在，你的網站已經成功透過 Cloudflare 的 CDN 加速，並連結到你的 Amplify 網站了！
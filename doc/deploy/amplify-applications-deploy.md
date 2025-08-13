### 本地生產模式測試與 Amplify 部署步驟

本文說明如何在本地以生產模式測試 Next.js 專案，以及如何部署到 AWS Amplify。專案的 Next.js 程式位於 `src/nextjs/`。

## 本地生產模式測試（與雲端最接近的行為）

1) 切換至 Next.js 專案目錄

```bash
cd src/nextjs
```

2) 安裝相依套件（建議使用乾淨安裝）

```bash
npm ci
```

3) 建置生產版

```bash
npm run build
```

4) 啟動生產伺服器

```bash
npm run start
```

5) 開啟瀏覽器驗證

- 預設網址：`http://localhost:3000`
- 確認頁面、路由、圖片、API 呼叫在生產模式下皆正常

6) 常見檢查項目

- 環境變數：在本地測試時可用 `.env.local`，僅 `NEXT_PUBLIC_*` 會出現在瀏覽器端
- `next.config.ts`：若有外部圖片來源，需設定 `images` 的允許網域
- TypeScript/ESLint：`next build` 會更嚴格，請先在本地確保無誤

## 部署至 AWS Amplify（Next.js）

### 1. 基本概念

- Amplify 會以生產模式建置並託管 Next.js
- SSR/ISR 會在無伺服器環境執行；靜態資產透過 CDN（CloudFront）快取
- 專案位於 `src/nextjs/`，需設定正確的 Base directory 或在建置前 `cd` 進入

### 2. 連接儲存庫並建立應用

1) 在 Amplify Console 連接 Git 儲存庫與分支（例如 `deploy`）
2) 自動偵測框架為 Next.js
3) 指定 Base directory：`src/nextjs`（若未設置，請在建置命令中先 `cd src/nextjs`）

### 3. 設定建置命令（兩種方式擇一）

- 方式 A：在 Amplify 介面設定建置命令
  - Pre-build: `cd src/nextjs && npm ci`
  - Build: `npm run build`

- 方式 B：使用 `amplify.yml`（放在儲存庫根目錄）

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - cd src/nextjs
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: src/nextjs/.next
    files:
      - '**/*'
  cache:
    paths:
      - src/nextjs/node_modules/**/*
```

### 4. 設定環境變數

- 在 Amplify Console 的 Environment variables 中新增
- 僅 `NEXT_PUBLIC_*` 會注入到瀏覽器端
- Server-only 變數請勿以 `NEXT_PUBLIC_` 開頭

### 5. Node 版本

- 建議在 Amplify 的 Build image 或環境設定中指定與本地一致的 Node 版本，以避免本地/雲端差異

### 6. 驗證與常見問題

- 首次部署完成後，造訪 Amplify 提供的網域確認頁面與路由
- 若圖片無法顯示，檢查 `next.config.ts` 的 `images` 設定是否允許外部來源
- 若有呼叫後端 API（例如 `python-backend`），請確認正式環境 API 網址與 CORS 設定
- 若使用 ISR 或 on-demand revalidation，請確認 token 與路由設定，以及 CDN 快取是否需要無效化

## 快速檢查清單

- Base directory 指向 `src/nextjs`，或建置命令先 `cd src/nextjs`
- `npm ci && npm run build` 能在本地成功
- 設定必要的環境變數（含 `NEXT_PUBLIC_*`）
- `next.config.ts` 的 `images` 允許需要的網域
- 後端 API 網址與 CORS 在生產環境可用



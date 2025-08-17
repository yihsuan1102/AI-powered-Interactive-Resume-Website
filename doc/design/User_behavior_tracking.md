# 使用者行為偵測方案（游標活動、點擊位置）

本文件彙整在本專案中導入使用者行為偵測（游標軌跡、點擊位置、滾動深度、頁面瀏覽、表單互動）的可行路線、實作範例、隱私合規、效能優化與決策建議。

## 目標與範圍

- 取得可視化洞察：熱圖（點擊/移動）、滾動深度、停留時間、關鍵區塊互動。
- 支援 Session Replay（選用），用於除錯與體驗觀察。
- 保護使用者隱私（不收集 PII，提供遮罩機制與同意控管）。
- 導入成本低、可逐步演進：先快上線驗證，再擴充自訂事件與資料儲存。

## 可能蒐集的事件

- 游標軌跡：座標、頻率、停留熱區。
- 點擊事件：座標、被點元素（簡化 selector/tag）、頁面路徑。
- 滾動：深度、方向、速度。
- 頁面：路由切換、停留時間、裝置/視窗大小。
- 表單：行為層級（focus/blur/submit），不收集內容。

## 方案總覽

### 方案 A：第三方即用型（上線最快）

- Microsoft Clarity（免費）
  - 優點：熱圖、Session Replay、點擊/滾動分析、遮罩簡易；導入成本最低。
  - 缺點：自訂事件模型較有限，數據不可完全自控。

- PostHog（開源/雲/可自託管）
  - 優點：產品分析 + Session Replay + 自訂事件，EU 託管可選；擴充性佳。
  - 缺點：雲方案費用、功能學習曲線略高。

- Hotjar / LogRocket / FullStory
  - 優點：體驗成熟；LogRocket/FullStory 偏工程調試（前端錯誤、網路紀錄）。
  - 缺點：通常為付費；原始數據掌控度有限。

最小整合（Next.js App Router）：

Clarity：
```tsx
// src/nextjs/app/layout.tsx
'use client'
import Script from 'next/script';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Script id="ms-clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window, document, "clarity", "script", "YOUR_CLARITY_ID");`}
        </Script>
        {children}
      </body>
    </html>
  );
}
```

PostHog：
```bash
cd src/nextjs
npm i posthog-js
```
```tsx
// src/nextjs/app/layout.tsx
'use client'
import { useEffect } from 'react';
import posthog from 'posthog-js';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
        capture_pageview: true,
        autocapture: true,
        disable_session_recording: false
      });
    }
  }, []);
  return (<html lang="en"><body>{children}</body></html>);
}
```

環境變數建議：
```
NEXT_PUBLIC_POSTHOG_KEY=xxxx
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com  # 或自託管/歐盟託管端點
```

### 方案 B：半自建（PostHog + 自訂座標事件）

- 使用 PostHog 以取得 Session Replay 與自動事件蒐集，另外針對游標與點擊加上自訂事件，搭配節流/取樣與批次上傳。

自訂 Hook 範例（點擊與低頻游標移動）：
```tsx
'use client'
import { useEffect } from 'react';
import posthog from 'posthog-js';

export function usePointerCapture(sampleHz = 10) {
  useEffect(() => {
    let last = 0;
    const onMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - last < 1000 / sampleHz) return;
      last = now;
      posthog.capture('mouse_move', {
        x: e.clientX, y: e.clientY,
        page: location.pathname,
        vw: innerWidth, vh: innerHeight,
        sx: scrollX, sy: scrollY
      });
    };
    const onClick = (e: MouseEvent) => {
      const el = e.target as Element | null;
      posthog.capture('click_xy', {
        x: e.clientX, y: e.clientY,
        selector: el ? el.tagName.toLowerCase() : undefined,
        page: location.pathname
      });
    };
    addEventListener('pointermove', onMove, { passive: true });
    addEventListener('click', onClick, { passive: true, capture: true });
    return () => {
      removeEventListener('pointermove', onMove);
      removeEventListener('click', onClick, true as any);
    };
  }, [sampleHz]);
}
```

### 方案 C：全自建（Next.js API + Supabase）

- 完整掌控資料與結構，適合自定熱圖/漏斗/分群；但需自行維運與分析。

前端 Hook（節流 + 批次 + sendBeacon）：
```tsx
// src/nextjs/lib/useUserTracking.ts
'use client'
import { useEffect } from 'react';

export function useUserTracking({ enabled = true, sampleHz = 10 } = {}) {
  useEffect(() => {
    if (!enabled) return;
    let sid = localStorage.getItem('sid') || crypto.randomUUID();
    localStorage.setItem('sid', sid);
    const q: any[] = [];
    let last = 0;

    const onMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - last < 1000 / sampleHz) return;
      last = now;
      q.push({ t: Date.now(), type: 'pointer_move', x: e.clientX, y: e.clientY, page: location.pathname, vw: innerWidth, vh: innerHeight, sx: scrollX, sy: scrollY });
    };
    const onClick = (e: MouseEvent) => {
      const el = e.target as Element | null;
      q.push({ t: Date.now(), type: 'click', x: e.clientX, y: e.clientY, selector: el ? el.tagName.toLowerCase() : undefined, page: location.pathname });
    };
    const flush = () => {
      if (!q.length) return;
      const batch = q.splice(0, q.length);
      navigator.sendBeacon('/api/analytics', JSON.stringify({ sid, events: batch }));
    };

    const iv = setInterval(flush, 2000);
    addEventListener('pointermove', onMove, { passive: true });
    addEventListener('click', onClick, { passive: true, capture: true });
    addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });

    return () => {
      clearInterval(iv);
      removeEventListener('pointermove', onMove);
      removeEventListener('click', onClick, true as any);
    };
  }, [enabled, sampleHz]);
}
```

API 路由（批次接收；之後可接 Supabase）：
```ts
// src/nextjs/app/api/analytics/route.ts
import { NextResponse } from 'next/server';
export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body || typeof body.sid !== 'string' || !Array.isArray(body.events)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    // TODO: 寫入 Supabase（建議表：web_events）
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
```

建議的 Supabase 表結構：
```sql
create table public.web_events (
  id bigserial primary key,
  sid text not null,
  event_type text not null,
  ts timestamptz not null default now(),
  page text not null,
  x int, y int,
  viewport_w int, viewport_h int,
  scroll_x int, scroll_y int,
  selector text,
  meta jsonb
);
```

## 隱私、法規與遮罩

- 同意機制：預設停用追蹤，取得使用者同意（GDPR/CCPA）後啟用；以 cookie/localStorage 記錄。
- PII 遮罩：不記錄輸入內容；可在敏感區塊加入 `data-analytics-mask` 或使用第三方遮罩屬性（如 PostHog 的 `data-ph-no-capture`）。
- 去識別化：匿名 IP、以 UUID 標記 session；資料保存週期（例如 30/90 天）。
- 地域合規：若需 EU 合規，選擇 PostHog EU 或自託管；Clarity 啟用遮罩與最小化資料收集。

## 效能與品質

- 節流/取樣：游標 5–10 Hz 足以畫熱圖；避免高頻上傳。
- 批次/後送：`sendBeacon` + 2 秒一批；頁面隱藏時強制 flush。
- 被動監聽：使用 `passive: true` 降低主執行緒阻塞。
- Pointer Events：同時覆蓋滑鼠/觸控；必要時 `pointerrawupdate`（需更嚴格節流）。

## 決策建議

- 追求「最快上線、零成本」：先上 Microsoft Clarity 驗證需求與價值。
- 追求「可分析產品轉化、事件可擴充」：PostHog（雲/EU 或自託管）+ 自訂事件 Hook。
- 追求「資料完全自控、高度定製」：全自建（Next.js API + Supabase）。

## 待辦清單（Next steps）

1. 選擇方案（A/B/C）。
2. 設定環境變數與金鑰（如 `NEXT_PUBLIC_POSTHOG_KEY`）。
3. 在 `src/nextjs/app/layout.tsx` 接入腳本或 Hook；於需要的頁面掛載追蹤 Hook。
4. 若採 C 方案：建立 `app/api/analytics` 與 Supabase 表 `public.web_events`；串接寫入。
5. 新增同意管理（banner/設定頁），預設停用，取得同意後啟用。
6. 為敏感區塊加遮罩屬性，檢查回放畫面無敏感資訊。
7. 設定資料保存週期與匯出策略；建立儀表盤（熱圖、漏斗、分群）。

## 版本紀錄

- v0.1（初稿）：新增三種導入路線、隱私/效能建議與最小代碼範例。



# 22: 行情按需抓取與快取

**What to build:** 提供按需抓取服務：抓取服務或 CLI 收到某個系統魚種時，只抓該魚種的主要新鮮官方代碼（必要時含 `1xxx` 例外），取得最近交易日或指定日期範圍的資料，正規化後 upsert；沒有每日全量 job。提供手動 CLI（`npm run market:fetch -- <species_id> [--date YYYY-MM-DD]`、`--status`），成功後 prune 90 天以前資料。（規格：G-15、AC-1、AC-2、ADR 0004）

**Blocked by:** 21

**Status:** ready-for-human

- [x] 第一次透過 CLI 或抓取服務抓某魚種會打上游並寫入 `market_prices`；第二次在 TTL 內不再打上游。
- [x] 上游以 `TypeNo`、`StartDate`／`EndDate` 篩選；`TypeNo` 不支援逗號多代碼，逐碼抓；回傳的 `品種代碼` 必須等於請求代碼。
- [x] `魚貨名稱 = 休市`、`品種代碼 <= 0`、`平均價 <= 0`、`交易量 <= 0` 的列不寫入。
- [x] 民國年 `1151022` 轉 `2026-10-22`。
- [x] 同一交易日重跑不產生重複列，只更新既有資料。
- [x] 最新交易日快取 30 分鐘；過去日期不變；查無資料做 30 分鐘 negative cache；同一魚種同時查詢只發一次 request。
- [x] 上游失敗不得清空既有行情；`market_fetch_state` 記錄最後檢查時間、最後交易日、筆數、狀態與錯誤。
- [x] 指定日期範圍（行情卡 7／30 個交易日）只抓該魚種的日期範圍，不抓全量；`days=30` 需抓足夠日曆日以涵蓋 30 個交易日。
- [x] CLI 可抓單一魚種或指定日期、可看狀態；成功後刪除 90 天以前的行情與狀態。
- [x] 02／04／05／07 與測試同步。

## Comments

- 2026-10-27：已實作。抓取服務在 `backend/lib/market/fetch.js`，CLI 為 `npm run market:fetch -- <species_id> [--date YYYY-MM-DD] [--days 7|30]`、`--status`。

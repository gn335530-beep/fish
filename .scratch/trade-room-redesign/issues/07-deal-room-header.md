# 07: 交易房標題列：對方名稱、評價星星、電話

**What to build:** 交易房標題列顯示頭像、對方名稱、名稱下方的五顆評價星星、`撥打電話`＋電話號碼，以及`☰`、`─`、`✕`。星星依對方 `rating_score` 顯示，半星以 0.5 為單位；`review_count` 為 0 或 `rating_score` 為 0 時顯示空心星＋`尚無評價`。星星不可點，`aria-label` 為「評價 X 分，Y 則」。電話使用 `tel:` 連結，文字為`撥打電話`＋號碼；沒有電話時顯示「電話未提供」且不可點。移除電話橫幅、v7 與狀態副標。交易房摘要與單筆訂單的對方資料需包含 `rating_score`、`review_count`、`username`。

**Blocked by:** 01（前置重構：拆分面板、交易房與卡片模組）、06（聊天室外殼）

**Status:** resolved

- [x] 交易房標題列顯示對方名稱、名稱下方五顆星、`撥打電話`＋號碼與`☰`、`─`、`✕`。
- [x] 星星依 `rating_score` 顯示半星；沒有評價時顯示空心星＋`尚無評價`。
- [x] 星星不可點，並提供「評價 X 分，Y 則」的無障礙名稱。
- [x] 有電話時使用 `tel:` 連結；沒有電話時顯示「電話未提供」且不可點。
- [x] 交易房不再顯示電話橫幅、v7 或狀態副標。
- [x] 房間摘要與單筆訂單的對方資料都包含 `rating_score`、`review_count`、`username`。
- [x] 相關前後端測試已更新，`npm test` 通過，所有程式碼檔案不超過 200 行。

## Comments

- 2026-11-01：新增 `views/deal-room-header.js`，由 `main.js` 在交易房設定面板標題為對方名稱，副標顯示星星與電話；星星沿用 ticket 01 的 `renderStars`，補上半星 CSS。`views/deal.js` 移除電話橫幅。後端 `routes/deals.js` 的 `peer` 改用 `publicUser`，單筆訂單與交易房摘要都帶 `rating_score`、`review_count`、`username`。

# 04: 聊天面板外殼單一來源

**What to build:** 使用者在首頁、商品列表、登入頁與交易房看到同一個聊天面板外殼。面板、標題列、內文區與頁尾的尺寸、圓角、背景、陰影、grid、overflow 與 transition 只由 chat-frame 負責；deal-bot 只留浮動開啟鈕、badge、bot 容器與手機版定位。載入順序不再決定外觀。

**Blocked by:** 01

**Status:** resolved

- [x] 面板外殼與其標題列、內文區、頁尾的尺寸與 skin 只由一個樣式模組定義。
- [x] deal-bot 不再重複定義面板、標題列、內文區或頁尾的同一組屬性。
- [x] 首頁、商品列表、登入頁的面板開啟後尺寸、圓角、背景與關閉狀態一致；交易房面板仍會取代浮動商品條。
- [x] 桌機與手機的 Playwright 案例通過；沒有水平溢出或面板跳版。
- [x] 合併後檔案不超過 200 行；過長已依外殼／內容拆檔。
- [x] `npm test` 與 `npm run test:e2e` 通過。

## Comments

- 2026-11-10：`chat-frame.css` 成為面板與標題列唯一來源；內文區與頁尾因檔案超過 200 行拆到 `chat-frame-input.css`，仍只由 chat-frame 模組家族定義。`deal-bot.css` 只留 `.fm-bot`、`.fm-toggle`、badge 與手機定位；`chat-bubbles.css` 只留訊息氣泡、空狀態與收件匣。新增 `chat-frame.spec.js` 比對三個頁面的面板、標題列、內文區、頁尾 computed style，並驗證交易房展開送交易面板後取代商品條。`deal-bot`、`chat-frame`、`chat-frame-input`、`chat-bubbles` 已提版。


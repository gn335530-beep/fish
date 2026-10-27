# 16: 刪除死 CSS

**What to build:** 移除全站無引用的聊天觸發與賣家卡片樣式，頁面外觀不變。

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] `grep -rn "chat-trigger\|seller-card" frontend` 無結果。
- [x] 首頁、商品列表、登入頁的外觀與互動不變。
- [x] 仍被使用的樣式已搬回對應 CSS；`npm test` 全綠。

**Source:** `.scratch/fish-platform/remediation-plan.md` 的「D7」（對應既有票 02）。

## Comments

2026-10-27 完成。刪除 `features.css` 中全站無引用的 `.chat-trigger`、`.seller-card`（含 `__av`）樣式；grep 無殘留，沒有需要搬移的共用樣式。未實際開瀏覽器做視覺比對，但刪除的選擇器沒有任何 HTML／JS 引用。

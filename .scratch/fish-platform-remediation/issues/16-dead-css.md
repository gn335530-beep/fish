# 16: 刪除死 CSS

**What to build:** 移除全站無引用的聊天觸發與賣家卡片樣式，頁面外觀不變。

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `grep -rn "chat-trigger\|seller-card" frontend` 無結果。
- [ ] 首頁、商品列表、登入頁的外觀與互動不變。
- [ ] 仍被使用的樣式已搬回對應 CSS；`npm test` 全綠。

**Source:** `.scratch/fish-platform/remediation-plan.md` 的「D7」（對應既有票 02）。

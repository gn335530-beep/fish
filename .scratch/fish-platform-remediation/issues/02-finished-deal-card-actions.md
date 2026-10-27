# 02: 已成交與已取消的協議卡不再顯示操作

**What to build:** 訂單成交、取消或逾時後，協議卡只顯示狀態，不再出現同意／退回／取消原因選單；進行中的訂單仍可依身分操作。

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] 成交卡、已取消卡、已逾時卡沒有同意／退回按鈕，也沒有取消原因選單與「取消協議」。
- [x] 待回覆與協商中的卡仍可依身分操作。
- [x] 對已結束訂單送操作不再出現 409；前端直接不提供操作。
- [x] 卡片本體仍顯示金額、地點、時間與狀態。

**Source:** `.scratch/fish-platform/remediation-plan.md` 的「S2」（對應既有票 17）。

## Comments

2026-10-27 完成。`deal-state.js` 新增 `isActionable`（僅 `PENDING_REVIEW`／`NEGOTIATING`）；協議卡動作改用它，成交、取消與逾時卡只顯示狀態。`frontend/test/deal-actions.test.js` 補上成交、取消與協商中三種案例。

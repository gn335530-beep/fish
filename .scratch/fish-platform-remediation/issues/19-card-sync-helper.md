# 19: 協議／評價卡片同步共用 helper

**What to build:** 協議卡與評價卡都用同一個「依 seq 更新最新卡片」的 helper，不再各自維護排序與更新邏輯。

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] 只剩一份「排序訊息、更新最新卡片」的實作。
- [ ] 協議卡與評價卡的行為、歷史卡保留規則不變。
- [ ] `deal-response.test.js`、`reviews.test.js` 通過。

**Source:** `.scratch/fish-platform/remediation-plan.md` 的「R3」。

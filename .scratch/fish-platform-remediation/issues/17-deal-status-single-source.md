# 17: 訂單狀態與前端文案單一來源

**What to build:** 後端與前端的訂單狀態清單、可操作狀態與顯示文案各只有一份定義，其餘檔案以 import 使用。

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `ACTIVE_STATUS`、`CANCELLABLE` 這類清單只保留一份定義。
- [ ] 前端狀態文案只剩一份 map，交易歷史、協議卡與協議表單共用。
- [ ] 狀態常數放在獨立模組，不與既有的狀態轉換模組形成循環依賴。
- [ ] `deal-*.test.js` 全數通過；`npm test` 全綠。

**Source:** `.scratch/fish-platform/remediation-plan.md` 的「R1」。

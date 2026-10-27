# 07: 行情對照名稱與別名以魚種清單為準

**What to build:** 行情對照端點的顯示名稱與別名已改由魚種清單帶出，但沒有測試鎖定，文件也還沒記錄已接受的顯示變更。補上鎖定測試：每個行情代碼的顯示名稱等於魚種清單名稱、別名等於魚種清單別名，代碼集合、分類與養殖旗標維持不變。API 文件註明名稱來源，並記錄已接受的顯示變更（七星鱸改為海鱸、鯖魚改為白腹鯖、小卷改為澎湖小卷、巴攏改為竹筴魚）；原 ticket 的 Comments 同步註明此變更與理由。

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] 每個行情代碼的顯示名稱等於魚種清單名稱，別名等於魚種清單別名。
- [x] 行情代碼集合、分類與養殖旗標維持不變。
- [x] API 文件註明行情對照的名稱來源與已接受的顯示變更。
- [x] 原 ticket 的 Comments 記錄顯示變更與理由。
- [x] 行情對照與行情查詢測試全綠。

**Source:** `.scratch/review-followups/spec.md` 的「魚種與行情對照」與「文件」。

## Comments

2026-10-28 完成（commit `e0c02d1`）。`market-mappings.test.js` 逐筆鎖定 `official_name` 等於魚種清單 `name`、`aliases` 等於 `alias`，並明確鎖定 28 個代碼集合、分類與五種養殖旗標。新增已接受顯示變更測試：海鱸、白腹鯖、澎湖小卷、竹筴魚。`docs/api/README.md` 新增「行情對照名稱」段落，`docs/spec/05-api.md` 同步註明名稱來源與變更；原 ticket 23 的 Comments 已補上變更與理由。

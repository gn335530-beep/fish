# 05: 編輯草稿時說「取消上架」會進確認流程

**What to build:** 在修改草稿的欄位輸入中說「取消上架」「取消販售」「不賣了」時，助手進入取消上架的確認與刪助手房流程；只說「取消」時仍只取消本次修改。

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] 編輯重量時說「取消上架」→ 出現確認卡；確認後清掉草稿並刪除目前助手房。
- [x] 說「取消」→ 回到修改前草稿，不刪房。
- [x] 非編輯狀態的取消上架行為不變。
- [x] 測試涵蓋兩種語意。

**Source:** `.scratch/fish-platform/remediation-plan.md` 的「S5」（對應既有票 33）。

## Comments

2026-10-27 完成。`rules.js` 新增 `isCancelListing`（取消上架／取消販售／不賣了／不要賣了），`editText` 先讓這些句子落到 `continueListing → requestCancel`；只說「取消」仍取消本次修改。欄位選擇階段（`choosing_edit`）也走同一確認流程，確認卡出現時會清掉 editing／choosing_edit。`frontend/test/listing-batch.test.js` 涵蓋取消上架與只取消修改兩種語意。

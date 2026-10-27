# 04: 尾數納入批次追問，後續一次只問一項

**What to build:** 釣客說「我要賣花枝」時，助手一次列出重量、尾數、處理方式、照片；釣客只回部分後，助手一次只問一個缺項，不再重複一次問全部。

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] 魚種剛確定時，批次提示包含重量、尾數、處理方式、照片。
- [x] 只回部分欄位後，助手只問下一個缺項。
- [x] 尾數不再被批次提示漏掉。
- [x] 修改草稿與價格引導流程不受影響。
- [x] 測試涵蓋「一次列出四項」與「後續一次一項」。

**Source:** `.scratch/fish-platform/remediation-plan.md` 的「S4」（對應既有票 28）。

## Comments

2026-10-27 完成。`DETAIL_ORDER`／`DETAIL_LABELS` 補上尾數；`advance()` 只在魚種確定後第一次列出四項並記 `detail_asked`，之後每次只問下一個缺項。魚種未定時仍只問魚種。`frontend/test/listing-batch.test.js` 涵蓋批次四項與後續單項追問。

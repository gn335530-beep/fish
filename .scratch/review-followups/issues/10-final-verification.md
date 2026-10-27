# 10: 全量測試、行數上限與範圍外修正紀錄確認

**What to build:** 為這輪收斂做最後守門：跑完整測試、確認所有程式碼檔案不超過 200 行、確認五個測試斷層都有新案例，並確認兩個已上線但無 ticket 的合理修正已留下紀錄。這張票不新增功能，只驗證前面各票合併後的結果沒有新債。

**Blocked by:** 01, 02, 03, 04, 05, 06, 07, 08, 09

**Status:** ready-for-agent

- [ ] `npm test` 全綠，涵蓋後端與前端測試。
- [ ] 所有程式碼檔案不超過 200 行，且沒有為符合行數而不合理壓縮。
- [ ] 五個斷層都有本輪新案例：後端 HTTP、前端共用狀態、前端視圖渲染、前端共用格式、魚種對照。
- [ ] spec 與 remediation README 已記錄兩個已接受的範圍外修正（登出清除本機 token、登入頁法規強調）。
- [ ] 人工驗收結果已寫回對應 ticket 的 Comments。
- [ ] spec 的 Testing Decisions 沒有未涵蓋的案例。

**Source:** `.scratch/review-followups/spec.md` 的「Testing Decisions」與「完成條件」。

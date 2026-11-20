# 04: 文件對齊與最終驗證

**What to build:** 讓文件與已鎖定的行為一致：living spec 的流程章節寫明改版前建立且沒有識別碼的草稿在第一次以文字修改欄位時取得識別碼，未修改前仍只有前端防連點；UI 章節寫明失敗 toast 一律顯示、面板提示只在原本送出的助手房仍是目前房間時出現；roadmap 的防重複驗收條件補上舊草稿 lazy backfill。原批次 spec 的 Comments 加註舊草稿與失敗提示兩點由 follow-up spec 取代。最後跑完整測試與 200 行檢查。

**Blocked by:** 02, 03

**Status:** resolved

- [x] living spec 流程章節寫明舊草稿第一次以文字修改取得識別碼，未修改前只有前端防連點。
- [x] living spec UI 章節寫明失敗 toast 與面板提示的分房規則。
- [x] roadmap 防重複驗收條件補上舊草稿 lazy backfill。
- [x] 原批次 spec 的 Comments 註記「舊草稿回填」與「失敗提示」兩點由 follow-up spec 取代。
- [x] 文件不再出現與 lazy backfill 或失敗提示行為衝突的敘述。
- [x] `npm test` 全綠；所有修改檔案不超過 200 行。

## Comments

- 2026-11-20：`docs/spec/03-flows.md` F2 步驟 12 補上舊草稿 lazy backfill、需要文字修改欄位才會補值，以及只改照片不補值；`docs/spec/06-ui.md` 草稿卡改寫失敗提示分房規則；`docs/spec/07-roadmap.md` AC-60 補上舊草稿補值；原批次 `.scratch/publish-dedup/spec.md` 加 Comments 標記兩點由 follow-up spec 取代，未改寫歷史本文。`npm test` 694 通過；所有修改程式檔案低於 200 行。

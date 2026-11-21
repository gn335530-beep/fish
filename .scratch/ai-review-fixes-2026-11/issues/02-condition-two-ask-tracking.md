# 02: 處理方式「兩次回問」後端追蹤與強制

**What to build:** 讓處理方式「兩次回問後才提議縮短版」由後端追蹤與強制，不再只靠模型自發遵守。conversation context 新增草稿層級的回問計數（整數、預設 0）；模型輸出新增「是否回問處理方式」訊號（布林）；提議縮短版只在回問計數 ≥ 2 時接受，否則丟棄提議並降級成回問。回問計數在處理方式寫入有效值後歸零。

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] conversation context 新增回問計數欄位，預設 0、不需資料遷移，且與其他草稿欄位互不影響。
- [x] 模型輸出的回問訊號經輸出解析驗證（布林）。
- [x] 回問訊號為真時回問計數遞增；處理方式寫入有效值（含錯字修正或經同意的縮短）時歸零。
- [x] 回問計數 < 2 時的提議被丟棄並降級成回問；≥ 2 時提議被接受（沿用既有同意後才套用流程）。
- [x] 提示詞同步：回問時送出訊號、提議前確認計數達兩次。
- [x] 新增測試：計數遞增、未達兩次提議被拒、達兩次提議接受、有效值寫入後歸零。
- [x] `npm test` 全綠（844/848；4 個失敗為 `market-cli.test.js` 的既有失敗，與本批無關），所有檔案 ≤ 200 行。

## Comments

- 2026-11-22：後端在 `listing.js` 新增 `condition_ask_count` 計算與 `condition_proposal` 的兩次回問閘門（< 2 丟棄並降級 ask）；`listing-validate.js` 驗證 `condition_ask` 為布林；`history.js` 把 `condition_ask_count` 送進模型 context；`listing-prompt.js` 同步 schema 與規則。前端 `listing-llm.js` 把 `condition_ask_count` 寫回 context。既有測試「處理方式縮短提議存入 contract 但不改草稿」補上 `condition_ask_count: 2` 以符合新規。

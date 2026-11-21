# 01: 修正紀錄欄位白名單獨立

**What to build:** 釣客上架時，尾數／整批售價／每台斤售價不再被當成「錯字修正」：模型送出的修正紀錄若帶這類欄位，整輪被拒，契約與 spec 一致。做法是把「可修正欄位」與「草稿變更欄位」分開定義，並在解析階段就拒絕，而不是放到套用階段才靜默丟棄。

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] 修正紀錄的欄位驗證只接受魚種與處理方式；尾數、整批售價、每台斤售價的修正項目使整輪被拒。
- [x] 草稿變更欄位不受影響，仍接受全部五個欄位。
- [x] 新增測試：`corrections` 帶 `price`（或 `quantity`／`price_per_taijin`）欄位時回傳 `LLM_GUARD_REJECTED`。
- [x] `npm test` 全綠（844/848；4 個失敗為 `market-cli.test.js` 的既有失敗，與本批無關），所有檔案 ≤ 200 行。

## Comments

- 2026-11-22：在 `listing-validate.js` 新增 `CORRECTION_FIELDS = ["fish_species", "condition"]`，`validateCorrections` 改用它，解析階段就拒絕尾數／售價欄位。新增測試「修正紀錄不接受白名單以外的欄位」。

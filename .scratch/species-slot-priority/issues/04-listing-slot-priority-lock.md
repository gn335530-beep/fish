# 04: 上架魚種槽位「模型優先」鎖定

**What to build:** 確認上架流程已對模型的 `fish_species` 與 `species_code` 都模型優先寫進草稿；若有缺口補齊，並以測試鎖住。這張票以「確認＋補測」為主，不應改動上架流程的魚種來源邏輯（該流程已模型優先）。

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] 模型回傳 `fish_species`／`species_code` 時，兩者都寫進草稿（含代碼）
- [x] 模型未回魚種槽位時，仍以規則式抽取填補
- [x] 若現有測試未覆蓋「SELL 的 `species_code` 槽位」，補上測試鎖住
- [x] `npm test` 全綠

## Comments

2026-11-24 完成。SELL 流程本來就會把 `draftSlots(llm)`（含 `fish_species`、`species_code`）疊在 `extractSlots` 之上，無需改動 production 程式。既有測試只覆蓋 `fish_species`，因此於 `ai-sell-slots.test.js` 補兩個測試：模型同時給魚種與代碼時兩者都寫進草稿；模型沒回魚種時仍由規則式抽取補上。`npm test` 874 項全綠。

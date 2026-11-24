# 01: 抽出共用「魚種來源」helper（prefactor）

**What to build:** 把「從模型 slots 讀出並正規化 `fish_species`／`species_code`」的邏輯抽成單一 helper，行情回覆與導購回覆都改用；統一兩處命名（`hintedName`／`hinted`），並收斂行情回覆對規則式魚名抽取的重複呼叫。這張票是純重構，不改任何可觀察行為，完成後既有測試必須全綠，讓後續「代碼優先」變更只需動一處。

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] 單一 helper 回傳正規化後的魚種名稱（trim 後字串或空）與代碼（只在非空且為正整數時回傳，否則視為未提供）
- [x] 行情回覆與導購回覆改用該 helper，不再各自重複實作
- [x] 命名統一，不再有 `hinted`／`hintedName` 混用
- [x] 行情回覆對規則式魚名抽取只呼叫一次
- [x] `npm test` 全綠，行為與改動前一致

## Comments

2026-11-24 完成。新增 `hintedSpecies(hints)`（`llm-slots.js`）：`fish_species` 正規化為 trim 後名稱，`species_code` 只接受非空正整數。行情與導購改用它，移除 `hintedName`／`hinted` 混用；行情對規則式魚名抽取只呼叫一次，載入字典後的重試改用 `findCatalogName`。`npm test` 872 項全綠。

# 02: 行情 `species_code` 優先查價

**What to build:** 當模型在 slots 回傳有效的 `species_code` 時，行情回覆直接依代碼查價，不再先做規則式名稱抽取；代碼查無時顯示「查無此魚種代碼」。模型只回 `fish_species`、或兩者皆無時，維持既有的名稱查價／規則式抽取。

**Blocked by:** 01（共用魚種來源 helper）

**Status:** resolved

- [x] 模型回傳 `species_code`（句子裡有可被誤抽的魚名）→ 依代碼查價，不採規則式誤抽名稱
- [x] 模型同時回傳 `species_code` 與 `fish_species` → 以代碼為準
- [x] 模型只回 `fish_species` → 依名稱查價（既有行為不變）
- [x] 模型兩者皆無 → 規則式抽取 fallback 不變
- [x] 代碼查無 → 回「查無此魚種代碼」
- [x] 於 AI 回覆流程接縫與行情 fallback 接縫補上測試（先例見 spec 的 Testing Decisions）

## Comments

2026-11-24 完成。行情在模型提供有效 `species_code` 時直接依代碼查價，優先於名稱與規則式抽取；未提供代碼時才走名稱與 `findSpeciesMention`／`findCatalogName`，代碼查無沿用「查無此魚種代碼」。新增 `frontend/test/ai-species-code-priority.test.js` 覆蓋代碼優先、代碼＋名稱、名稱優先、無 slots fallback 與代碼查無。`npm test` 872 項全綠。

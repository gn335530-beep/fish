# 魚種槽位模型優先（species_code 補齊）

**Status:** ready-for-agent

**Source:** 2026-11-24 對工作目錄未提交變更（vs HEAD）的 Standards／Spec 雙軸 review 收斂。

## Problem Statement

助手房的行情、導購與上架流程，魚種槽位改為「模型優先」的契約（ADR-0011、`docs/spec/03-flows.md`）目前只完成一半：模型回傳的 `fish_species` 已在行情與導購優先採用，但模型回傳的 `species_code` 沒有被優先採用——行情只在規則式抽取完全抽不到名稱時才用代碼（當成最後的 fallback），導購則完全忽略代碼。當模型給了 `species_code`、但使用者句子裡仍抽得出（可能錯誤的）魚種名稱時，程式會走名稱查價或名稱篩選，跳過更精確的官方代碼。

此外，文件裡兩處測試檔數目彼此矛盾且都與現況不符，容易誤導。

## Solution

把「魚種槽位模型優先」契約補完：行情與導購都優先採用模型的 `species_code`（其次 `fish_species`），只有模型停用、失敗或未提供對應槽位時，才退回規則式抽取。上架流程已是模型優先，維持不動。文件中的測試檔數目改為與實際一致，或改以質化描述取代易漂移的數字。

## User Stories

1. 作為釣客，我想問行情時若模型已給官方代碼，就依代碼查價，以便不會因為句子裡的魚名被誤抽而查錯魚。
2. 作為釣客，我想模型同時回傳 `species_code` 與 `fish_species` 時以代碼為準，以便得到最精確的行情。
3. 作為釣客，我想模型只回 `fish_species` 時仍以該名稱優先查價，以便口語魚名也能正確查價。
4. 作為釣客，我想模型沒回任何魚種槽位時仍能從句子抽魚名查價，以便模型不提供時功能不壞。
5. 作為釣客，我想模型停用或失敗時行情照舊由規則引擎完成，以便離線仍有行情。
6. 作為釣客，我想模型給的官方代碼在字典查不到時看到「查無此魚種代碼」，以便錯誤能被發現而非拿到假行情。
7. 作為買家，我想找魚時若模型已給官方代碼，就依代碼對應的官方名稱篩選商品，以便不會被句子裡的錯字魚名帶偏。
8. 作為買家，我想模型只回 `fish_species` 時以該名稱優先篩選，以便口語找魚也準。
9. 作為買家，我想模型沒回魚種槽位時仍能從句子抽魚名找魚，以便模型不提供時功能不壞。
10. 作為買家，我想沒有官方代碼的既有商品仍能依名稱被找到，以便代碼優先不會漏掉舊商品。
11. 作為釣客，我想上架時模型的 `fish_species` 與 `species_code` 都優先寫進草稿，以便上架魚種也以模型為準（既有行為，維持並鎖住）。
12. 作為釣客，我想上架時模型沒回魚種槽位時仍用規則抽取，以便離線也能上架。
13. 作為維護者，我想行情、導購與上架三處「模型優先、規則 fallback」的魚種來源邏輯一致且單一，以便日後只改一處。
14. 作為維護者，我想文件中的測試檔數目與實際一致（或不再硬編容易漂移的數字），以便文件不誤導。

## Implementation Decisions

- **魚種來源優先序統一**：行情與導購採用同一優先序——模型的 `species_code` > 模型的 `fish_species` > 規則式抽取（`findSpeciesMention`／`findCatalogName`）。上架流程維持現有 `draftSlots` 覆寫，視為已滿足此序，不改動。
- **行情依代碼查價**：模型回傳非空且可解析為正整數的 `species_code` 時，直接走「依代碼查價」路徑，不再先做規則式名稱抽取；代碼查無時沿用既有 `SPECIES_NOT_FOUND` 文案。模型只回 `fish_species`、或兩者皆無時，才走名稱查價／抽取。
- **導購依代碼篩選**：模型回傳 `species_code` 時，先用已載入的官方代碼字典把代碼解析成官方名稱，再以該名稱篩選商品；解析不出來時退回 `fish_species`，再退回規則式名稱。沒有代碼的既有商品仍依名稱比對，不因代碼優先而漏掉。
- **共用魚種來源 helper**：把「從模型 slots 讀出正規化的 `fish_species`／`species_code`」抽成單一 helper，行情與導購共用；兩處命名統一（不再一個 `hintedName`、一個 `hinted`）。行情裡對規則式魚名抽取的重複呼叫也收斂成一次。
- **代碼有效性**：`species_code` 只在非空、可解析為正整數時才視為「已提供」，其餘視為未提供，走 fallback。
- **數字防護不變**：價格、尾數等平台數字的地面防護不因魚種槽位來源不同而放寬（沿用 ADR-0011）。
- **文件同步**：更新 ADR-0011 與 `docs/spec/03-flows.md` 對應條目（若措辭需微調以反映代碼優先）；把 `docs/spec/07-roadmap.md` 風險表與 `.scratch/postgres-migration/spec.md` 的測試檔數目改成一致且正確（或改為質化描述，不硬編會漂移的數字）。
- 任一程式檔因新增 helper 或邏輯逼近 200 行時，依職責拆分，不壓縮湊行數。

## Testing Decisions

### 什麼是好測試
只測外部可觀察行為（回覆文字、卡片、發出的行情／商品請求、草稿 context），不測私有 helper 名稱、不測內部呼叫堆疊，也不為測試拆模組。

### 接縫
主接縫沿用 frontend 的 `setupAiTest`（AI 回覆流程）：注入假 `aiReply`（含 `slots.fish_species`／`species_code`），驅動 `flow.submitText`，斷言訊息、卡片、發出的請求與 context。fallback 案例沿用 `market-chat.test.js`／`shopping.test.js` 低層 `handleText` 接縫。先例：`ai-intents.test.js`、`ai-sell-slots.test.js`、`ai-listing-species-flow.test.js`、`market-chat.test.js`。

### 必測
- 行情：模型只給 `species_code`（句子裡有可被誤抽的魚名）→ 依代碼查價，不依誤抽名稱。
- 行情：模型同時給 `species_code` 與 `fish_species` → 依代碼查價。
- 行情：模型只給 `fish_species` → 依名稱查價（既有行為，保留）。
- 行情：模型兩者皆無 → 規則式抽取仍可用（既有 fallback，保留）。
- 行情：代碼查無 → `SPECIES_NOT_FOUND` 文案。
- 導購：模型給 `species_code` → 依代碼對應官方名稱篩選出對的商品。
- 導購：模型只給 `fish_species` → 依名稱篩選（既有）。
- 導購：兩者皆無 → 規則式名稱 fallback（既有）。
- 上架：模型的 `fish_species`／`species_code` 都寫進草稿（既有行為鎖住；已有測試，不足再補）。
- 完成後 `npm test` 全綠，所有程式檔 ≤ 200 行。

## Out of Scope

- 後端魚種解析、官方代碼字典或行情查價邏輯的變更（本次純前端行為）。
- 價格、尾數等平台數字防護的任何放寬。
- 上架流程的魚種來源改動（已模型優先，維持不動）。
- Postgres 遷移的實作（`.scratch/postgres-migration/` 是設計文件，本 spec 只處理其中測試檔數目的不一致）。
- 把「魚種來源優先序」做成跨前後端的單一來源（跨語言，弱重複，暫不動）。

## Further Notes

- 本次變更中行情與導購的 `fish_species` 優先已在工作樹實作（未提交），本 spec 是在其上補齊 `species_code` 優先與文件／清理，而非重寫。
- 上架流程在 review 中被誤報為「未動」，實際已透過 `draftSlots` 對兩個槽位都模型優先且有測試；本 spec 只要求「確認並鎖住」，不要求改動。
- 依 AGENTS.md 的文件同步規範，任何行為變更需同步 ADR 與 `docs/spec/`；本 spec 的文件同步項目涵蓋之。

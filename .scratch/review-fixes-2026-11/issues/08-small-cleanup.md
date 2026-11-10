# 08: 小型清理：協議卡定義列、行情卡價格縮放與色票 tokenize

**What to build:** 在不改變畫面的前提下，讓協議卡的最終價格列重用既有的定義列 helper；把行情卡的價格縮放魔數集中到一處並加註它與字級幾何的關係；移除已移除元件的投機性契約註解與多餘 class。把推薦卡與行情卡硬寫的卡片專用色值改成變數，數值保持完全相同（例如按鈕藍仍是 `#3561C0`、hover 仍是 `#2B4FA3`），不統一成既有 accent token。

**Blocked by:** 01（前置 CSS 收斂）

**Status:** resolved

- [x] 協議卡最終價格列與其他定義列使用同一個 helper，輸出外觀不變。
- [x] 行情卡價格縮放常數集中且有註解，不再散落魔數。
- [x] 已移除的 `<select>` 契約註解與多餘 class 已清掉。
- [x] 卡片專用色值已改用變數，數值與現在完全相同，畫面不變。
- [x] `npm test` 通過，所有程式碼檔案不超過 200 行。

## Comments

- 2026-11-10：`definitionRow` 增加選用的 `className`／`strong`，協議卡最終價格列改用它，輸出 HTML 不變並補上精確測試。行情卡價格縮放集中為 `PRICE_GEOMETRY`（含最小縮放），註明 48px 字級與卡片可用寬度。移除 `fm-msg__bubble--bare` 多餘 class 與「舊 select」契約註解；走勢線改用 `.fm-market__line` 的 CSS 變數。行情卡與推薦卡的專用色值改成 `--market-*`／`--product-*` 變數，數值維持原樣；同步更新 CSS 快取版本。

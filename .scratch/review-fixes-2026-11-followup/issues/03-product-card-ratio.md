# 03: 商品卡照片比例單一來源

**What to build:** 買家在首頁與商品列表看到 `3:2` 的商品卡照片框，照片完整顯示；維護者改照片比例時只需要改 catch-card 照片樣式一處。base card media 不再宣告 `4/5`，也不再保留只被 catch-card 使用的 dead 屬性。

**Blocked by:** 01

**Status:** resolved

- [x] base card media 不再有 `4/5` 的 aspect-ratio。
- [x] catch-card 的 `3:2` 是照片框比例的唯一來源。
- [x] Playwright 在首頁與商品列表量到照片框比例為 `3:2`，照片沒有被裁切。
- [x] 桌機與手機的商品卡外觀與改動前一致；沒有水平溢出。
- [x] `npm test` 與 `npm run test:e2e` 通過。
- [x] 修改後的程式碼檔案不超過 200 行。

## Comments

- 2026-11-10：`layout.css` 移除只被 catch-card 使用的 `.card__media` 4/5、position、background、overflow 與通用 img 規則；`product-card-photo.css` 補上 `overflow: hidden`，照片框比例只剩 catch-card 的 `3/2`。新增 Playwright 幾何斷言（首頁與商品列表、桌機與手機）量到 `3:2`、照片 `object-fit: contain` 且不超出框線；照片框截圖 baseline 在改 CSS 前建立，改動後比對通過。


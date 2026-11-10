# 07: 首頁行數回到安全水位

**What to build:** 首頁目前正好 200 行，任何新增都會超過專案的 200 行上限。以不改畫面的方式把一個靜態範例區塊或重複 markup 抽出／簡化，讓首頁低於上限並保留現有內容與互動。

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] 首頁檔案低於 200 行，留有後續修改空間。
- [x] 首頁內容、版面與互動與現在一致。
- [x] `npm test` 通過。

## Comments

- 2026-11-10：把「平台怎麼運作」的五個靜態步驟改成每個 `tl__item` 一行的精簡 markup，內容仍留在 HTML，不依賴 JS；`index.html` 由 199 行降到 175 行。新增 `home-timeline.test.js` 鎖定 200 行上限、五個步驟與所有標題／說明文案。`docs/spec/07-roadmap.md` 的 R-12 同步標記已完成。

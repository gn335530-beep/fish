# 09: 舊文件與程式對齊

**What to build:** 把仍在流傳的舊文件改成與現況一致：後端 README 不再宣稱有訂單／評價 API；API 文件不再列出已刪除的端點，也不再同時說某端點唯讀又有寫入；兩份 superseded 文件維持歷史定位，不誤導實作者。（規格：R-1）

**Blocked by:** 01～08

**Status:** resolved

- [x] 後端 README 描述的功能與實際路由一致，沒有不存在的訂單／評價 API。
- [x] API 文件不再列出舊商品端點，且同一端點的權限與副作用描述一致。
- [x] 兩份 superseded 文件有清楚標記，讀者知道以本規格文件為準。
- [x] 文件中的端點清單與程式實際提供的一致。

## Comments

- 2026-10-25：已實作。`backend/README.md` 改列實際路由（auth／products／species／conversations／chat／uploads），訂單與評價標為尚無 API。`docs/api/README.md` 改寫為前端用戶端說明，移除舊商品端點與 `createFish`／`deleteFish`／`updateFish`／`updateProfile`，並標明 API 契約以 `docs/spec/05-api.md` 為準。`docs/spec/05-api.md` 移除 `/api/fish/data`、加入 `GET /api/species`。兩份舊計畫文件改為清楚的 superseded stub，指向 `docs/spec/`。根目錄 `README.md` 也改為「一支釣」。

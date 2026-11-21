# 04: 前後端 intent 常數對應文件化

**What to build:** 前後端 intent 常數各別維護（受前後端模組系統隔離限制，本批不做完全單一來源）。在兩處加互相指向的註記，說明對應關係與「改一邊要同步另一邊」，避免未來改動漏同步。無行為變化。

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] 後端 intent 常數處與前端 intent 常數處各加互相指向的註記。
- [ ] 註記標明：intent 集合、平台意圖、回覆意圖，以及草稿欄位清單的對應。
- [ ] 無行為變化；`npm test` 全綠，所有檔案 ≤ 200 行。

## Comments

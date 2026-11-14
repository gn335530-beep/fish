# 07: 網路來源與 WEB 升級

**What to build:** 用過網路資料的回答一律被視為網路回答並顯示資料來源；一般知識回答與平台回答永遠不顯示來源。模型自稱 `CHAT` 但實際呼叫了 `web_search` 時，後端把最終 intent 升級為 `WEB`。

**Blocked by:** 01（後端 AI service 拆分與錯誤一致化）

**Status:** ready-for-agent

- [ ] `web_search` 成功且取得至少一個合法來源、模型 intent 不是平台意圖時，最終 intent 為 `WEB`，`sources` 最多 3 個 `{ title, url }`。
- [ ] `CHAT` 永遠回 `sources: []`；平台意圖也永遠不帶來源。
- [ ] 升級發生在輸出驗證與數字防護之前，網路回答套用 `WEB` 的嚴格數字防護。
- [ ] 模型自行提供的來源一律丟棄，來源只由後端的 `web_search` 結果產生。
- [ ] 前端只依後端回傳的 `sources` 畫來源卡，最多 3 個且只接受 http(s)。
- [ ] 端點與前端測試涵蓋「CHAT＋web_search 升級」與「CHAT 無來源」。
- [ ] 領域、API、流程與 UI 文件同步 `CHAT`／`WEB` 的界線與來源卡規則。

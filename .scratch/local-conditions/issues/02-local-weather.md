# 02: 在地天氣查詢

**What to build:** 使用者問「今天／明天／這週天氣」時，助手依縣市取得 Open-Meteo 天氣資料，回覆天氣現象、現在氣溫、今日高低溫、降雨機率、風速風向。天氣問題只回天氣，不附海況或潮汐；查不到時明確說查不到，不猜數字。AI 文字支援換行顯示。

**Blocked by:** 01（助手地區上下文與暫存縣市）.

**Status:** resolved

- [x] 台灣縣市的天氣問題使用 Open-Meteo Weather，時區為 Asia/Taipei。
- [x] 回覆包含天氣現象、現在氣溫、今日高低溫、降雨機率、風速風向；依使用者問的時間範圍回答今天、明天或這週。
- [x] 天氣問題不包含海況、風浪或潮汐。
- [x] 明確縣市優先於設定縣市；缺少縣市時沿用 01 的反問與暫存流程。
- [x] 上游逾時、無資料或格式錯誤時明確說「查不到即時天氣」，不產生未經工具支持的數字。
- [x] 模型輸出的氣象數字以工具結果為依據，現有數字防護不會誤擋。
- [x] AI 文字氣泡保留換行，天氣回覆可分行閱讀。
- [x] 測試以假 Open-Meteo 回應覆蓋成功、明確覆寫、缺縣市、逾時與無資料；不呼叫真實網路。
- [x] 相關文件已同步；新增與修改的程式碼檔案不超過 200 行。

## Comments

- 2026-11-20：由 `local-conditions` 設計拆分。
- 2026-11-20：完成。新增 `lib/conditions/places.js`（22 縣市座標與縣市→海域對照）、`normalize.js`（WMO 現象、風向、蒲福風級、7 日預報）、`open-meteo.js`（可注入 fetcher 的 Weather／Marine 讀取）與 `lib/ai/tools/conditions.js`；`get_local_conditions` 納入工具目錄，天氣／海況數字進入既有數字依據。天氣上限為 7 日預報，逾時或無資料由 `service.js` 直接回「查不到即時天氣」。`chat-bubbles.css` 加上 `white-space: pre-wrap` 保留換行。測試見 `ai-tools-weather.test.js`；`npm test` 全數通過。
- 2026-11-20：review 後把換行樣式限定在 `.fm-msg__text`，卡片不受影響；system prompt 加上 Asia/Taipei 目前日期，讓今天／明天／這週有依據；非台灣地點改走網路且不注入設定縣市（完整國外流程仍由 ticket 08 收斂）。

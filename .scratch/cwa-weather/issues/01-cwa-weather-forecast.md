# 01: CWA 官方天氣預報

**What to build:** 助手房的天氣問題改用中央氣象署 `F-D0047-091` 的 7 日縣市預報，回覆天氣現象、今日最高／最低溫、降雨機率、風速風向與未來幾天預報。這一張先不接自動氣象站；目前氣溫明確顯示「目前氣溫暫無資料」，不拿 12 小時平均預報溫度冒充。CWA 預報失敗、逾時、格式錯誤或缺少 `CWA_API_KEY` 時回「查不到即時天氣」，不 fallback 回 Open-Meteo。海況、海溫與潮汐維持原本行為。

**Blocked by:** local-conditions-review-followup 01–08（地區分類與平台優先、非地區工具護欄、國外天氣逾時、來源請求、潮汐降級、在地數字防護、模式強制、文件驗證）。先完成這些再開始，避免同一段天氣分類、數字防護與來源流程衝突。

**Status:** resolved

- [ ] 台灣縣市天氣問題使用 `F-D0047-091`，以縣市名稱查詢；`T`、`Wx`、`MaxT`、`MinT`、`PoP12h`、`WS`、`WD` 正確解析。
- [ ] 12 小時分段整理成每日資料；今天、明天與這週都能用工具回傳的 7 日預報回答。
- [ ] 目前氣溫欄位為 `null` 時，回覆明確說「目前氣溫暫無資料」，不得使用 `F-D0047-091` 的 `T` 冒充。
- [ ] 明確縣市優先於設定縣市；缺少縣市時沿用既有反問與對話暫存流程。
- [ ] 天氣問題只回天氣，不包含海況、浪或潮汐。
- [ ] `F-D0047-091` 逾時、5xx、格式錯誤或缺少 `CWA_API_KEY` 時回「查不到即時天氣」，且不呼叫 Open-Meteo 天氣端點。
- [ ] 海況問題仍使用 Open-Meteo Marine／Weather 與 CWA 潮汐；天氣切換不造成海況回歸。
- [ ] 要求來源時，天氣來源卡列中央氣象署天氣預報；預設仍不顯示來源、回覆文字沒有 URL。
- [ ] 模型自行產生的氣溫、降雨機率或風級若不在工具結果中，會被既有數字防護擋下。
- [ ] 測試以假 CWA（預報端點）、假 Gemini、假 Open-Meteo 與假 Tavily 覆蓋成功、明確縣市、缺縣市、預報失敗、缺金鑰、海況回歸與來源請求；不呼叫真實網路。
- [ ] 相關文件先同步；最終文件一致性由 03 驗收。
- [ ] 新增與修改的程式碼檔案不超過 200 行。

## Comments

- 2026-11-21：由 `cwa-weather` spec 拆分；依建議 A，排在 `local-conditions-review-followup` 01–08 之後。
- 2026-11-21：完成。新增 `conditions/cwa-forecast.js` 與 `cwa-forecast-summary.js` 解析 F-D0047-091，12 小時分段合併成 7 日資料；`get_local_conditions` 天氣模式改走 CWA，缺少金鑰、逾時、5xx 或格式錯誤回「查不到即時天氣」，不呼叫 Open-Meteo。`current_temperature_c` 維持 `null`，後端在 `validate.js` 保證補上「目前氣溫暫無資料」；天氣來源卡改列中央氣象署天氣預報。測試見 `ai-tools-weather.test.js`，其餘天氣／來源／模式測試改用假 CWA；`npm test` 782 全綠。文件同步到流程、API、roadmap、根目錄與 backend README、ADR-0011。程式碼檔案最大 200 行（`validate.js`）。
- 2026-11-21：review follow-up。修正 `台北市`／`台中市`／`台南市`／`台東縣` 的 CWA 查詢名稱：F-D0047-091 只接受「臺」，改以 `CWA_CITY_NAME` 映射送出，本地仍以正規化縣市比對；真實 API 已確認四縣市可取得預報。另移除未使用的 `taipeiDate` export、維持 Open-Meteo 數值解析原行為、還原海況來源標題，並補天氣模式的未支持數字測試 `ai-weather-number-guard.test.js`。

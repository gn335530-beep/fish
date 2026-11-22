# 04: CWA 潮汐 API v2 格式（`TideForecasts`）

**What to build:** 中央氣象署潮汐開放資料回應格式改版後，潮汐資料源改解析新版 `TideForecasts`（每筆含 `Location` 與 `TimePeriods.Daily`），滿潮／乾潮從 Daily 的 `Time` 讀取。缺資料、格式錯誤或缺金鑰時仍回「潮汐暫無資料」，不編造時間。

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] 潮汐資料源改解析新版 `TideForecasts` 結構（Location 攤平成陣列、Daily 讀潮汐時間）。
- [x] 更新測試 fixture 為新格式，既有潮汐測試改對新結構。
- [x] 修正 `normalizeSeaArea` 對未知海域回空字串、不擲錯。
- [x] 文件：潮汐 v2 為內部格式變更，使用者可見行為不變；spec 已描述「潮汐來源為中央氣象署」與「格式錯誤回潮汐暫無資料」，不需另補 docs/spec。

## Comments

- 2026-11-22：實作已存在於工作樹；潮汐解析與 fixture 已切到 v2，缺資料／格式錯誤路徑沿用既有降級。此票無 docs/spec 變更。

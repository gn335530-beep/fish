# 03: 指定日期查行情會回補最近交易日

**What to build:** 冷資料庫用 `date=` 查行情（例如星期日）時，系統回上一個有交易的日期與實際 `trade_date`，不是空結果；CLI 的 `--date` 同樣生效。

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] 冷資料庫查星期日，回上一個交易日，`trade_date` 是實際交易日。
- [x] 不回填到未來日期；查詢仍只取 `<= date` 的最近一筆。
- [x] 既有「該日有沒有資料」檢查與 in-flight 去重不被繞過；同一天不會重複抓取。
- [x] 新增測試從空資料庫開始，不先塞舊資料。
- [x] CLI `--date` 與 API 行為一致。

**Source:** `.scratch/fish-platform/remediation-plan.md` 的「S3」（對應既有票 23 第 4 點）。

## Comments

2026-10-27 完成。`ensureDate` 在指定日無資料時改抓 `date - 7`～`date`，查詢仍只取 `<= date` 的最近一筆並回實際 `trade_date`；`hasPricesForDate`、`stateCovers`、range cache 與 in-flight 去重都保留。新增 `backend/test/market-date-backfill.test.js`；CLI 測試改為讓假上游依日期區間篩選，並以冷資料庫驗證 `--date 2026-10-25` 回 `2026-10-22`。

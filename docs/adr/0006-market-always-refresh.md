# 行情查詢每次重抓，不用 TTL 擋掉請求

原本 `/api/market/prices` 依 30 分鐘 TTL、過去日期快取與 negative cache 決定是否打上游。實務上曾因手動刪除 `market_prices` 但保留 `market_fetch_state`，狀態仍寫著 `last_status: "ok"`，查詢便一直跳過抓取，最後回 `NO_TRADE_DATA`、畫面顯示「暫無行情」。

為了讓行情查詢的結果可預期，查詢 API 改成每次請求都重抓上游：成功後 upsert `market_prices` 與更新 `market_fetch_state`；上游失敗且本機已有資料時回舊資料，只有完全沒有資料才回 `UPSTREAM_UNAVAILABLE`。手動 CLI 仍保留原本的快取行為，避免重複抓取。

**Status**: accepted（2026-10-28）

**Considered Options**:

- 保留 30 分鐘 TTL，只修「state 說成功但資料不存在」的判斷：負載最小，但使用者仍可能看到最多 30 分鐘前的資料。
- 查詢 API 每次重抓，CLI 保留快取（採用）：行為直覺，刪除快取後下一次查詢就會恢復；代價是每次查詢多 0.5–2 秒與更高的上游流量。
- 完全移除快取：連 CLI 也每次重抓，但手動工具與測試會失去離線／重跑保護。

**Consequences**:

- 每次 AI 問行情、上架行情卡都會打一次上游；上架行情卡已改成只抓 30 日一次，避免原本 30 日＋7 日兩次請求。
- in-flight 去重仍保留：同魚種、同範圍的並行請求只發一次。
- 上游失敗時回傳上次成功的行情與交易日期，不把舊資料偽裝成當日資料。
- `market_fetch_state` 若說 `ok` 但 `market_prices` 已無對應資料，一律視為失效並重抓。
- 行情 API 的延遲與上游可用性直接相關；這是刻意用新鮮度換取穩定性。

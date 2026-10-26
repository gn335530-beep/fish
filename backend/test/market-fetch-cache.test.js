/* 行情抓取（快取）：TTL、negative cache、in-flight 去重與日期範圍。 */

const test = require("node:test");
const assert = require("node:assert/strict");
require("./client");

const repository = require("../lib/market/repository");
const upstream = require("../lib/market/upstream");
const fetchService = require("../lib/market/fetch");
const { addDays, toRocDate, todayIso } = require("../lib/market/dates");
const { raw, useRows, resetMarket, mapping } = require("./market-test-helpers");

test.beforeEach(resetMarket);

test("TTL 內第二次不再打上游；超過 30 分鐘會重新抓", async function () {
  const fetcher = useRows([raw()]);
  await fetchService.ensureLatest(mapping);
  const second = await fetchService.ensureLatest(mapping);
  assert.equal(second.cached, true);
  assert.equal(fetcher.calls, 1);

  repository.saveState(2201, "grouper", {
    last_checked_at: new Date(Date.now() - fetchService.TTL_MS - 1000).toISOString(),
    last_latest_at: new Date(Date.now() - fetchService.TTL_MS - 1000).toISOString()
  });
  fetchService.resetCache();
  await fetchService.ensureLatest(mapping);
  assert.equal(fetcher.calls, 2);
});

test("negative cache 在 30 分鐘內有效，之後會重試", async function () {
  const fetcher = useRows([]);
  const first = await fetchService.ensureLatest(mapping);
  assert.equal(first.status, "no_data");
  assert.equal(repository.getState(2201).last_status, "no_data");

  await fetchService.ensureLatest(mapping);
  assert.equal(fetcher.calls, 1);

  repository.saveState(2201, "grouper", {
    last_checked_at: new Date(Date.now() - fetchService.TTL_MS - 1000).toISOString(),
    last_latest_at: new Date(Date.now() - fetchService.TTL_MS - 1000).toISOString()
  });
  fetchService.resetCache();
  await fetchService.ensureLatest(mapping);
  assert.equal(fetcher.calls, 2);
});

test("同一魚種同時查詢只發一次上游 request", async function () {
  let calls = 0;
  upstream.setFetcher(function () {
    calls += 1;
    return new Promise(function (resolve) {
      setTimeout(function () {
        resolve({ ok: true, json: async function () { return [raw()]; } });
      }, 20);
    });
  });
  const results = await Promise.all([
    fetchService.ensureLatest(mapping),
    fetchService.ensureLatest(mapping)
  ]);
  assert.equal(calls, 1);
  assert.equal(results[0].status, "ok");
  assert.equal(results[1].status, "ok");
});

test("最近交易日只抓最近視窗，並標記 latest 快取", async function () {
  const fetcher = useRows([raw()]);
  await fetchService.ensureLatest(mapping);
  const url = fetcher.urls[0];
  assert.match(url, /StartDate=115\d{4}/);
  assert.match(url, /EndDate=115\d{4}/);
  const state = repository.getState(2201);
  assert.ok(state.last_latest_at);
});

test("指定日期抓取不會讓最近交易日誤用快取", async function () {
  const fetcher = useRows([
    raw({ "交易日期": "1151020", "平均價": 111 }),
    raw({ "交易日期": "1151022", "平均價": 222 })
  ]);
  await fetchService.ensureDate(mapping, "2026-10-20");
  assert.equal(fetcher.calls, 1);

  const latest = await fetchService.ensureLatest(mapping);
  assert.equal(fetcher.calls, 2);
  assert.equal(latest.status, "ok");
  assert.equal(repository.latestTradeDate("grouper"), "2026-10-22");
});

test("最近交易日視窗內的查無資料可 negative cache", async function () {
  const fetcher = useRows([]);
  await fetchService.ensureLatest(mapping);
  assert.equal(repository.getState(2201).last_status, "no_data");

  const second = await fetchService.ensureDate(mapping, addDays(todayIso(), -3));
  assert.equal(second.cached, true);
  assert.equal(fetcher.calls, 1);
});

test("日期範圍換算成民國年，30 個交易日抓足夠日曆日", async function () {
  const end = "2026-10-22";
  const fetcher = useRows([]);
  await fetchService.ensureHistory(mapping, end, 30);
  assert.equal(fetcher.calls, 1);
  const url = fetcher.urls[0];
  assert.match(url, /StartDate=115\d{4}/);
  assert.match(url, /EndDate=1151022/);

  const startMatch = url.match(/StartDate=(\d{7})/);
  const startIso = Number(startMatch[1].slice(0, 3)) + 1911 + "-" +
    startMatch[1].slice(3, 5) + "-" + startMatch[1].slice(5, 7);
  assert.ok(startIso <= addDays(end, -42), "30 個交易日至少需 42 個日曆日");

  assert.equal(
    upstream.buildUrl({ code: 2201, from: "2026-10-01", to: "2026-10-22" }),
    upstream.SOURCE_URL + "?$top=10000&$skip=0&TypeNo=2201&StartDate=1151001&EndDate=1151022"
  );
  assert.equal(toRocDate("2026-10-22"), "1151022");
});

test("過去日期範圍在重啟後仍使用快取，不再打上游", async function () {
  const fetcher = useRows([raw()]);
  await fetchService.ensureHistory(mapping, "2026-10-22", 30);
  assert.equal(fetcher.calls, 1);

  fetchService.resetCache();
  const second = await fetchService.ensureHistory(mapping, "2026-10-22", 30);
  assert.equal(second.cached, true);
  assert.equal(fetcher.calls, 1);
});

test("過去日期已有行情時不再打上游", async function () {
  const fetcher = useRows([raw()]);
  await fetchService.ensureDate(mapping, "2026-10-22");
  assert.equal(fetcher.calls, 1);

  fetchService.resetCache();
  const second = await fetchService.ensureDate(mapping, "2026-10-22");
  assert.equal(second.cached, true);
  assert.equal(fetcher.calls, 1);
});

test("negative cache 也可以覆蓋過去日期", async function () {
  const fetcher = useRows([]);
  await fetchService.ensureDate(mapping, "2026-10-20");
  assert.equal(fetcher.calls, 1);
  fetchService.resetCache();
  const second = await fetchService.ensureDate(mapping, "2026-10-20");
  assert.equal(second.cached, true);
  assert.equal(fetcher.calls, 1);
});

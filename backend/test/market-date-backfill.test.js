/* 指定日期查行情：冷資料庫往回補最近交易日，查詢仍只取 <= date。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop } = require("./client");
const upstream = require("../lib/market/upstream");
const repository = require("../lib/market/repository");
const fetchService = require("../lib/market/fetch");
const { rocToIso } = require("../lib/market/dates");
const { raw, resetMarket, getPrices } = require("./market-test-helpers");

function rocOf(url, name) {
  const match = url.match(new RegExp(name + "=(\\d{7})"));
  return match ? rocToIso(match[1]) : "";
}

/* 假上游只回請求區間內的資料，模擬真實 API 的日期篩選。 */
function useRangeRows(rows) {
  const state = { calls: 0, urls: [] };
  upstream.setFetcher(async function (url) {
    state.calls += 1;
    state.urls.push(url);
    const from = rocOf(url, "StartDate");
    const to = rocOf(url, "EndDate");
    return {
      ok: true,
      json: async function () {
        return rows.filter(function (row) {
          const date = rocToIso(row["交易日期"]);
          return date >= from && date <= to;
        });
      }
    };
  });
  return state;
}

test.before(start);
test.after(stop);
test.beforeEach(resetMarket);

test("冷資料庫查星期日回上一個交易日與實際 trade_date", async function () {
  const fetcher = useRangeRows([raw({ "交易日期": "1151023", "平均價": 333 })]);
  const res = await getPrices("species_id=grouper&region=高雄市&date=2026-10-25");

  assert.equal(res.status, 200);
  assert.equal(res.body.data.found, true);
  assert.equal(res.body.data.trade_date, "2026-10-23");
  assert.equal(res.body.data.price_per_kg, 333);
  assert.equal(fetcher.calls, 1);
  assert.match(fetcher.urls[0], /StartDate=1151018/);
  assert.match(fetcher.urls[0], /EndDate=1151025/);
});

test("回補範圍不會取到指定日期之後的行情", async function () {
  useRangeRows([
    raw({ "交易日期": "1151023", "平均價": 100 }),
    raw({ "交易日期": "1151026", "平均價": 999 })
  ]);
  const res = await getPrices("species_id=grouper&date=2026-10-25");

  assert.equal(res.body.data.trade_date, "2026-10-23");
  assert.equal(res.body.data.price_per_kg, 100);
});

test("同一天回補後再查不再打上游", async function () {
  const fetcher = useRangeRows([raw({ "交易日期": "1151023", "平均價": 333 })]);
  const query = "species_id=grouper&date=2026-10-25";
  await getPrices(query);
  assert.equal(fetcher.calls, 1);

  fetchService.resetCache();
  const second = await getPrices(query);
  assert.equal(second.body.data.trade_date, "2026-10-23");
  assert.equal(fetcher.calls, 1);
});

test("同一天並行查詢只發一次上游 request", async function () {
  let calls = 0;
  upstream.setFetcher(function () {
    calls += 1;
    return new Promise(function (resolve) {
      setTimeout(function () {
        resolve({
          ok: true,
          json: async function () {
            return [raw({ "交易日期": "1151023", "平均價": 333 })];
          }
        });
      }, 20);
    });
  });

  const query = "species_id=grouper&date=2026-10-25";
  const results = await Promise.all([getPrices(query), getPrices(query)]);

  assert.equal(calls, 1);
  assert.equal(results[0].body.data.trade_date, "2026-10-23");
  assert.equal(results[1].body.data.trade_date, "2026-10-23");
  assert.equal(repository.allPrices().length, 1);
});

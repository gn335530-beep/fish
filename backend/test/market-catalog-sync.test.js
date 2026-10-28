/* 官方代碼字典同步：分頁、過濾、24 小時快取與失敗沿用舊字典。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop } = require("./client");
const { raw, usePages, useFailure, resetCatalog, getCodes, store, sync } =
  require("./market-catalog-helpers");

test.before(start);
test.after(stop);
test.beforeEach(resetCatalog);

test("第一次查詢自動同步，24 小時內不再抓上游", async function () {
  const fetcher = usePages([[raw({ "魚貨名稱": "土魠" })]]);
  const first = await getCodes("土魠魚");
  assert.equal(first.status, 200);
  assert.equal(first.body.data.candidates[0].species_code, 2141);
  const callsAfterSync = fetcher.calls;

  const second = await getCodes("土魠");
  assert.equal(second.status, 200);
  assert.equal(fetcher.calls, callsAfterSync);
});

test("同一代碼跨日期出現的名稱都能查到", async function () {
  usePages([[
    raw({ "交易日期": "1151020", "魚貨名稱": "土魠" }),
    raw({ "交易日期": "1151022", "魚貨名稱": "土魠魚" })
  ]]);
  const first = await getCodes("土魠魚");
  assert.equal(first.status, 200);
  assert.equal(first.body.data.candidates[0].species_code, 2141);

  const second = await getCodes("土魠");
  assert.equal(second.status, 200);
  assert.equal(second.body.data.candidates[0].species_code, 2141);
});

test("分頁取得超過單次上限的資料", async function () {
  const firstPage = [];
  for (let i = 0; i < sync.PAGE_SIZE; i += 1) {
    firstPage.push(raw({ "品種代碼": 1000 + i, "魚貨名稱": "魚" + i }));
  }
  const fetcher = usePages(function (skip) {
    if (skip === 0) return firstPage;
    if (skip === sync.PAGE_SIZE) return [raw({ "魚貨名稱": "土魠" })];
    return [];
  });
  const res = await getCodes("土魠");
  assert.equal(res.status, 200);
  assert.equal(res.body.data.candidates[0].species_code, 2141);
  assert.equal(fetcher.calls, 3);
  assert.match(fetcher.urls[0], /%24skip=0|\$skip=0/);
  assert.match(fetcher.urls[1], /skip=10000/);
  assert.match(fetcher.urls[2], /skip=10001/);
});

test("排除 3xxx 凍結與 6xxx 加工代碼，保留新鮮代碼", async function () {
  usePages([[
    raw({ "品種代碼": 3010, "魚貨名稱": "冷凍土魠" }),
    raw({ "品種代碼": 6010, "魚貨名稱": "加工土魠" }),
    raw({ "品種代碼": 1010, "魚貨名稱": "新鮮土魠" })
  ]]);
  assert.equal((await getCodes("冷凍土魠")).status, 404);
  assert.equal((await getCodes("加工土魠")).status, 404);

  const fresh = await getCodes("新鮮土魠");
  assert.equal(fresh.status, 200);
  assert.equal(fresh.body.data.candidates[0].species_code, 1010);

  const all = await getCodes();
  assert.equal(all.status, 200);
  assert.equal(all.body.data.candidates.length, 1);
});

test("查無名稱回 SPECIES_NOT_FOUND", async function () {
  usePages([[raw()]]);
  const res = await getCodes("不存在的魚");
  assert.equal(res.status, 404);
  assert.equal(res.body.code, "SPECIES_NOT_FOUND");
});

test("完全沒有字典且同步失敗時回 CATALOG_UNAVAILABLE", async function () {
  useFailure();
  const res = await getCodes("土魠");
  assert.equal(res.status, 503);
  assert.equal(res.body.code, "CATALOG_UNAVAILABLE");
});

test("同步失敗但已有舊字典時，查詢仍可用且不反覆重試", async function () {
  usePages([[raw({ "魚貨名稱": "土魠" })]]);
  assert.equal((await getCodes("土魠")).status, 200);

  store.saveState({
    last_synced_at: new Date(Date.now() - sync.TTL_MS - 1000).toISOString(),
    last_attempt_at: new Date(Date.now() - sync.TTL_MS - 1000).toISOString()
  });
  sync.reset();
  const failure = useFailure();

  const res = await getCodes("土魠");
  assert.equal(res.status, 200);
  assert.equal(res.body.data.candidates[0].official_name, "土魠");
  assert.equal(store.getState().last_status, "error");

  const again = await getCodes("土魠");
  assert.equal(again.status, 200);
  assert.equal(failure.calls, 1);
});

test("上游成功但回空資料時，不覆蓋既有字典", async function () {
  usePages([[raw({ "魚貨名稱": "土魠" })]]);
  assert.equal((await getCodes("土魠")).status, 200);

  store.saveState({
    last_synced_at: new Date(Date.now() - sync.TTL_MS - 1000).toISOString(),
    last_attempt_at: new Date(Date.now() - sync.TTL_MS - 1000).toISOString()
  });
  sync.reset();
  usePages([[]]);

  const res = await getCodes("土魠");
  assert.equal(res.status, 200);
  assert.equal(res.body.data.candidates[0].official_name, "土魠");
  assert.equal(store.getState().last_status, "error");
});

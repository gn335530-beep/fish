/* 行情市場對照：21 個市場；舊魚種代碼端點、集合與舊欄位已移除。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, call } = require("./client");
const markets = require("../lib/market/markets");
const { seedMarketMappings } = require("../lib/market/bootstrap");
const { all, setAll } = require("../lib/store");

test.after(stop);
test.before(start);

test("市場對照端點有 21 筆，含縣市與 verified 旗標", async function () {
  const res = await call("GET", "/api/market/markets");
  assert.equal(res.status, 200);
  const rows = res.body.data;
  assert.equal(rows.length, 21);

  const byName = {};
  for (const row of rows) {
    assert.ok(row.market_name);
    assert.ok(row.region);
    assert.equal(typeof row.verified, "boolean");
    byName[row.market_name] = row;
  }
  assert.equal(byName["岡山"].region, "高雄市");
  assert.equal(byName["台北"].region, "台北市");
  assert.ok(rows.some(function (row) { return row.verified === false; }));
  assert.ok(rows.some(function (row) { return row.verified === true; }));
});

test("啟動時寫入市場對照，舊魚種代碼集合不再存在", function () {
  assert.deepEqual(all("market_locations"), markets.markets());
  assert.deepEqual(all("species_market_codes"), []);
});

test("舊魚種代碼端點已移除", async function () {
  const res = await call("GET", "/api/market/species-codes");
  assert.equal(res.status, 404);
});

test("啟動時清除舊行情與抓取狀態的 species_id", function () {
  setAll("market_prices", [{ id: "mkt_old", species_code: 2201, species_id: "grouper" }]);
  setAll("market_fetch_state", [{ id: "mfs_2201", species_code: 2201, species_id: "grouper" }]);
  seedMarketMappings();
  assert.equal("species_id" in all("market_prices")[0], false);
  assert.equal("species_id" in all("market_fetch_state")[0], false);
});

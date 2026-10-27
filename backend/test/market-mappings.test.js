/* 行情對照表：28 個主要新鮮代碼、21 個市場，且魚種識別碼與 species.js 一致。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, call } = require("./client");
const species = require("../lib/species");
const mappings = require("../lib/market/mappings");
const { all } = require("../lib/store");

test.after(stop);
test.before(start);

test("主要新鮮代碼端點公開且涵蓋全部 28 個系統魚種", async function () {
  const res = await call("GET", "/api/market/species-codes");
  assert.equal(res.status, 200);
  const rows = res.body.data;
  assert.equal(rows.length, 28);
  assert.equal(rows.length, species.SPECIES.length);

  const ids = rows.map(function (row) { return row.species_id; });
  assert.deepEqual(ids.slice().sort(), species.SPECIES.map(function (item) { return item.id; }).sort());
  assert.equal(new Set(rows.map(function (row) { return row.code; })).size, 28);

  for (const row of rows) {
    assert.ok(species.byId(row.species_id));
    assert.equal(typeof row.code, "number");
    assert.ok(row.official_name);
    assert.ok(["1", "2", "4", "5"].includes(row.category));
    assert.ok(Array.isArray(row.aliases));
    assert.equal(typeof row.is_aquaculture, "boolean");
  }
});

test("只使用新鮮代碼：1xxx 限三種魚，沒有 3xxx 凍結與 6xxx 加工", function () {
  const codes = mappings.speciesCodes().map(function (row) { return row.code; });
  const firstThousand = codes.filter(function (code) { return code >= 1000 && code < 2000; });
  assert.deepEqual(firstThousand.sort(), [1031, 1041, 1073]);
  for (const code of codes) {
    assert.ok(!(code >= 3000 && code < 4000), "不可有凍結代碼 " + code);
    assert.ok(!(code >= 6000 && code < 7000), "不可有加工代碼 " + code);
    const category = String(code).charAt(0);
    assert.ok(["1", "2", "4", "5"].includes(category), "代碼分類錯誤 " + code);
  }
});

test("養殖旗標只標五種魚，香魚與白蝦不標", function () {
  const rows = mappings.speciesCodes();
  const flagged = rows.filter(function (row) { return row.is_aquaculture; })
    .map(function (row) { return row.species_id; }).sort();
  assert.deepEqual(flagged, ["clam", "eel", "milkfish", "oyster", "seabass"].sort());

  const byId = {};
  for (const row of rows) byId[row.species_id] = row;
  assert.equal(byId.grouper.code, 2201);
  assert.equal(byId.seabass.code, 1073);
  assert.equal(byId.milkfish.code, 1041);
  assert.equal(byId.eel.code, 1031);
  assert.equal(byId.oyster.code, 5012);
  assert.equal(byId.clam.code, 5022);
  assert.equal(byId.sweetfish.is_aquaculture, false);
  assert.equal(byId.shrimp.is_aquaculture, false);
});

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

test("啟動時把兩份對照表寫入 db，且與程式內建內容一致", function () {
  assert.deepEqual(all("species_market_codes"), mappings.speciesCodes());
  assert.deepEqual(all("market_locations"), mappings.markets());
});

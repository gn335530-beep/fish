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
    const item = species.byId(row.species_id);
    assert.ok(item);
    assert.equal(typeof row.code, "number");
    assert.equal(row.official_name, item.name);
    assert.deepEqual(row.aliases, item.alias);
    assert.ok(["1", "2", "4", "5"].includes(row.category));
    assert.equal(row.category, String(row.code).charAt(0));
    assert.equal(typeof row.is_aquaculture, "boolean");
  }
});

test("行情代碼集合維持不變", function () {
  const expected = [
    1031, 1041, 1073, 2011, 2012, 2015, 2051, 2074, 2079, 2113, 2114,
    2163, 2166, 2169, 2181, 2201, 2271, 2291, 2331, 2341, 2440, 2571,
    2631, 4015, 4131, 4513, 5012, 5022
  ];
  const codes = mappings.speciesCodes().map(function (row) { return row.code; })
    .sort(function (a, b) { return a - b; });
  assert.deepEqual(codes, expected);
});

test("已接受的顯示名稱變更以魚種清單為準", function () {
  const rows = mappings.speciesCodes();
  const rowById = {};
  for (const row of rows) rowById[row.species_id] = row;

  assert.equal(rowById.seabass.official_name, "海鱸");
  assert.equal(rowById.mackerel.official_name, "白腹鯖");
  assert.equal(rowById.squid.official_name, "澎湖小卷");
  assert.equal(rowById.scad.official_name, "竹筴魚");
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

  const rowById = {};
  for (const row of rows) rowById[row.species_id] = row;
  assert.equal(rowById.grouper.code, 2201);
  assert.equal(rowById.seabass.code, 1073);
  assert.equal(rowById.milkfish.code, 1041);
  assert.equal(rowById.eel.code, 1031);
  assert.equal(rowById.oyster.code, 5012);
  assert.equal(rowById.clam.code, 5022);
  assert.equal(rowById.sweetfish.is_aquaculture, false);
  assert.equal(rowById.shrimp.is_aquaculture, false);
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

/* 官方代碼字典查詢：精確名稱、常見別名、數字代碼、多候選與養殖旗標。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop } = require("./client");
const { raw, seedCatalog, resetCatalog, getCodes } = require("./market-catalog-helpers");

test.before(start);
test.after(stop);
test.beforeEach(resetCatalog);

const ROWS = [
  raw({ "品種代碼": 2141, "魚貨名稱": "土魠" }),
  raw({ "品種代碼": 2201, "魚貨名稱": "石斑魚" }),
  raw({ "品種代碼": 2202, "魚貨名稱": "龍膽石斑" }),
  raw({ "品種代碼": 1073, "魚貨名稱": "七星鱸" }),
  raw({ "品種代碼": 1041, "魚貨名稱": "虱目魚" }),
  raw({ "品種代碼": 4015, "魚貨名稱": "養殖白蝦" }),
  raw({ "品種代碼": 1051, "魚貨名稱": "吳郭魚" }),
  raw({ "品種代碼": 1021, "魚貨名稱": "鮭魚" })
];

function seed() {
  seedCatalog(ROWS);
}

test("精確官方名稱、常見別名與數字代碼都能查到", async function () {
  seed();

  const byName = await getCodes("土魠");
  assert.equal(byName.status, 200);
  assert.equal(byName.body.data.candidates[0].species_code, 2141);

  const byAlias = await getCodes("土魠魚");
  assert.equal(byAlias.status, 200);
  assert.deepEqual(byAlias.body.data.candidates.map(function (row) {
    return row.species_code;
  }), [2141]);

  const byNumber = await getCodes("2141");
  assert.equal(byNumber.status, 200);
  assert.equal(byNumber.body.data.candidates[0].official_name, "土魠");
});

test("吳郭魚與鮭魚等官方名稱也能查到候選", async function () {
  seed();
  assert.equal((await getCodes("吳郭魚")).body.data.candidates[0].species_code, 1051);
  assert.equal((await getCodes("鮭魚")).body.data.candidates[0].species_code, 1021);
});

test("石斑這類名稱回傳多個候選，順序固定且不自動選第一個", async function () {
  seed();
  const res = await getCodes("石斑");
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.data.candidates.map(function (row) {
    return row.official_name;
  }), ["石斑魚", "龍膽石斑"]);
});

test("同名多代碼時全部回傳並以代碼排序", async function () {
  seedCatalog([
    raw({ "品種代碼": 2202, "魚貨名稱": "石斑" }),
    raw({ "品種代碼": 2201, "魚貨名稱": "石斑" })
  ]);
  const res = await getCodes("石斑");
  assert.deepEqual(res.body.data.candidates.map(function (row) {
    return row.species_code;
  }), [2201, 2202]);
});

test("候選包含代碼、官方名稱與養殖旗標", async function () {
  seed();
  const seabass = await getCodes("海鱸");
  assert.equal(seabass.status, 200);
  assert.deepEqual(seabass.body.data.candidates[0], {
    species_code: 1073,
    official_name: "七星鱸",
    aliases: [],
    category: "1",
    is_aquaculture: true,
    last_seen_date: "2026-10-22"
  });

  const shrimp = (await getCodes("養殖白蝦")).body.data.candidates[0];
  assert.equal(shrimp.is_aquaculture, true);
});

test("省略 q 時回傳完整字典", async function () {
  seed();
  const res = await getCodes();
  assert.equal(res.status, 200);
  assert.equal(res.body.data.candidates.length, 8);
  assert.equal(res.body.data.query, null);
});

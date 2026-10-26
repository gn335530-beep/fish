/* 對話行情問答：意圖、地區預設、養殖標記、查無資料與不猜測。 */

import test from "node:test";
import assert from "node:assert/strict";

const SPECIES = [
  { id: "grouper", name: "石斑", alias: [], category: "fish", texture: "", bones: "刺少", cooking: ["清蒸"] },
  { id: "seabass", name: "海鱸", alias: [], category: "fish", texture: "", bones: "刺少", cooking: ["清蒸"] }
];

let market = { found: false, reason: "NO_TRADE_DATA" };
let calls = [];

globalThis.window = {
  HaisenAPI: {
    listSpecies: async function () { return SPECIES; },
    request: async function (path) {
      calls.push(path);
      if (path.indexOf("/api/species") === 0) return { data: SPECIES };
      if (path.indexOf("/api/market/prices") === 0) {
        if (market instanceof Error) throw market;
        return { data: market };
      }
      throw new Error("unexpected path: " + path);
    }
  }
};

const { loadSpecies } = await import("../assets/js/demo/ai/species.js");
const { handleText } = await import("../assets/js/demo/ai/service.js");
await loadSpecies();

function textOf(result) {
  return result.replies.map(function (reply) { return reply.text || ""; }).join("\n");
}

function marketCalls() {
  return calls.filter(function (path) { return path.indexOf("/api/market/prices") === 0; });
}

function found(overrides) {
  return Object.assign({
    found: true,
    species_id: "grouper",
    scope: "city",
    region: "高雄市",
    trade_date: "2026-10-22",
    price_per_kg: 52.4,
    price_per_taijin: 31.4,
    is_aquaculture: false,
    source: "農業部漁產品交易行情",
    source_url: "https://example.test",
    fetched_at: "2026-10-27T00:00:00.000Z",
    quality: "official"
  }, overrides || {});
}

test.beforeEach(function () {
  calls = [];
  market = { found: false, reason: "NO_TRADE_DATA" };
});

test("問石斑多少錢時使用個人檔案縣市並回平均價、日期與來源", async function () {
  market = found();
  const result = await handleText(null, "石斑現在多少錢", { city: "高雄市" });
  const text = textOf(result);
  assert.match(text, /依你的地區（高雄市）/);
  assert.match(text, /31\.4 元／台斤/);
  assert.match(text, /2026-10-22/);
  assert.match(text, /高雄市平均/);
  assert.match(text, /農業部漁產品交易行情/);
  assert.doesNotMatch(text, /大約/);
  assert.equal(marketCalls().length, 1);
  assert.match(decodeURIComponent(marketCalls()[0]), /region=高雄市/);
});

test("問句指定縣市時覆蓋個人檔案縣市", async function () {
  market = found({ region: "澎湖縣", scope: "city", price_per_kg: 80, price_per_taijin: 48 });
  await handleText(null, "澎湖縣石斑多少錢", { city: "高雄市" });
  assert.match(decodeURIComponent(marketCalls()[0]), /region=澎湖縣/);
});

test("指定縣市無資料時說明改用全國平均", async function () {
  market = found({ scope: "national", region: "澎湖縣", price_per_kg: 50, price_per_taijin: 30 });
  const text = textOf(await handleText(null, "澎湖縣石斑多少錢", { city: "高雄市" }));
  assert.match(text, /澎湖縣目前沒有資料，改以全國平均/);
  assert.match(text, /30 元／台斤/);
  assert.match(text, /全國平均/);
});

test("沒有縣市時用全國平均並說明", async function () {
  market = found({ scope: "national", region: null });
  const result = await handleText(null, "石斑多少錢", { city: "" });
  const text = textOf(result);
  assert.match(text, /還沒填縣市，以全國平均查詢/);
  assert.match(text, /全國平均/);
  assert.doesNotMatch(decodeURIComponent(marketCalls()[0]), /region=/);
});

test("養殖魚種回覆含養殖價格", async function () {
  market = found({ species_id: "seabass", is_aquaculture: true, price_per_kg: 205.7, price_per_taijin: 123.4 });
  const text = textOf(await handleText(null, "海鱸現在多少錢", { city: "高雄市" }));
  assert.match(text, /123\.4 元／台斤/);
  assert.match(text, /養殖價格/);
});

test("查無交易資料時只說沒有行情，不出現價格數字", async function () {
  market = { found: false, reason: "NO_TRADE_DATA" };
  const text = textOf(await handleText(null, "石斑現在多少錢", { city: "高雄市" }));
  assert.match(text, /目前沒有今天的石斑行情/);
  assert.doesNotMatch(text, /\d|元／|大約/);
});

test("上游失敗時說暫時無法取得行情", async function () {
  market = { found: false, reason: "UPSTREAM_UNAVAILABLE" };
  const text = textOf(await handleText(null, "石斑現在多少錢", { city: "高雄市" }));
  assert.match(text, /暫時無法取得石斑的行情/);
  assert.doesNotMatch(text, /\d|元／/);
});

test("沒有指定魚種時請使用者補充，不呼叫行情 API", async function () {
  const text = textOf(await handleText(null, "今天行情如何", { city: "高雄市" }));
  assert.match(text, /請問想查哪一種魚的行情/);
  assert.equal(marketCalls().length, 0);
});

test("未知魚種不呼叫行情 API，也不給數字", async function () {
  const text = textOf(await handleText(null, "白鯧現在多少錢", { city: "高雄市" }));
  assert.match(text, /目前沒有白鯧的行情/);
  assert.equal(marketCalls().length, 0);
  assert.doesNotMatch(text, /\d|元／|大約/);
});

test("未知魚種前有縣市時，不會把縣市當成魚名", async function () {
  const text = textOf(await handleText(null, "澎湖縣白鯧現在多少錢", { city: "高雄市" }));
  assert.match(text, /目前沒有白鯧的行情/);
  assert.doesNotMatch(text, /澎湖縣白鯧/);
  assert.equal(marketCalls().length, 0);
});

test("只說最近行情時請使用者補充魚種", async function () {
  const text = textOf(await handleText(null, "最近行情如何", { city: "高雄市" }));
  assert.match(text, /請問想查哪一種魚的行情/);
  assert.equal(marketCalls().length, 0);
});

test("已對照但無行情時說沒有行情", async function () {
  market = { found: false, reason: "NO_MAPPING" };
  const text = textOf(await handleText(null, "石斑現在多少錢", { city: "高雄市" }));
  assert.match(text, /目前沒有石斑的行情/);
  assert.doesNotMatch(text, /\d|元／/);
});

test("行情 API 連線失敗時說暫時無法取得", async function () {
  market = new Error("network");
  const text = textOf(await handleText(null, "石斑現在多少錢", { city: "高雄市" }));
  assert.match(text, /暫時無法取得石斑的行情/);
});

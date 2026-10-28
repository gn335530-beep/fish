/* 對話行情問答：官方代碼字典、單一候選、多候選追問、查無與無交易。 */

import test from "node:test";
import assert from "node:assert/strict";

const CATALOG = [
  { species_code: 2141, official_name: "土魠", aliases: ["土魠魚"], is_aquaculture: false },
  { species_code: 1051, official_name: "吳郭魚", aliases: [], is_aquaculture: false },
  { species_code: 1021, official_name: "鮭魚", aliases: [], is_aquaculture: false },
  { species_code: 2201, official_name: "石斑魚", aliases: [], is_aquaculture: false },
  { species_code: 2202, official_name: "龍膽石斑", aliases: [], is_aquaculture: false }
];

let market = null;
let calls = [];

function apiError(body, status) {
  const error = new Error(body.message || body.code);
  error.status = status || 400;
  error.data = body;
  return error;
}

function quote(overrides) {
  return Object.assign({
    found: true,
    species_code: 2141,
    species_id: null,
    official_name: "土魠",
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

globalThis.window = {
  HaisenAPI: {
    request: async function (path) {
      calls.push(path);
      if (path.indexOf("/api/market/codes") === 0) {
        return { data: { query: null, candidates: CATALOG } };
      }
      if (path.indexOf("/api/market/quote") === 0) {
        if (market instanceof Error) throw market;
        return { data: market };
      }
      if (path.indexOf("/api/market/prices") === 0) {
        const url = new URL("http://test" + path);
        const code = Number(url.searchParams.get("code"));
        if (market instanceof Error) throw market;
        const name = CATALOG.find(function (row) { return row.species_code === code; });
        return { data: quote({ species_code: code, official_name: name ? name.official_name : "土魠" }) };
      }
      throw new Error("unexpected path: " + path);
    }
  }
};

const { handleText } = await import("../assets/js/demo/ai/service.js");

function textOf(result) {
  return result.replies.map(function (reply) { return reply.text || ""; }).join("\n");
}

function quoteCalls() {
  return calls.filter(function (path) {
    return path.indexOf("/api/market/quote") === 0 || path.indexOf("/api/market/prices") === 0;
  });
}

test.beforeEach(function () {
  calls = [];
  market = quote();
});

test("土魠魚用個人檔案縣市查價，回覆含代碼、官方名稱、均價、日期與來源", async function () {
  const result = await handleText(null, "土魠魚現在多少錢", { city: "高雄市" });
  const text = textOf(result);
  assert.match(text, /土魠/);
  assert.match(text, /代碼 2141/);
  assert.match(text, /31\.4 元／台斤/);
  assert.match(text, /2026-10-22/);
  assert.match(text, /高雄市平均/);
  assert.match(text, /農業部漁產品交易行情/);
  assert.match(text, /依你的地區（高雄市）/);
  assert.equal(quoteCalls().length, 1);
  assert.match(decodeURIComponent(quoteCalls()[0]), /q=土魠魚/);
});

test("吳郭魚與鮭魚等不在舊清單的魚種也能查詢", async function () {
  market = quote({ species_code: 1051, official_name: "吳郭魚" });
  const first = await handleText(null, "吳郭魚多少錢", { city: "高雄市" });
  assert.match(textOf(first), /吳郭魚/);
  assert.match(textOf(first), /代碼 1051/);

  market = quote({ species_code: 1021, official_name: "鮭魚" });
  const second = await handleText(null, "鮭魚多少錢", { city: "高雄市" });
  assert.match(textOf(second), /鮭魚/);
  assert.match(textOf(second), /代碼 1021/);
});

test("石斑回傳候選不自動選第一個，下一句可選擇並完成查詢", async function () {
  market = apiError({
    code: "AMBIGUOUS_SPECIES",
    message: "魚種名稱對到多個代碼",
    candidates: [
      { species_code: 2201, official_name: "石斑魚" },
      { species_code: 2202, official_name: "龍膽石斑" }
    ]
  }, 409);

  const asked = await handleText(null, "石斑多少錢", { city: "高雄市" });
  const text = textOf(asked);
  assert.match(text, /石斑魚（2201）/);
  assert.match(text, /龍膽石斑（2202）/);
  assert.equal(asked.context.market_pending.candidates.length, 2);

  market = quote({ species_code: 2202, official_name: "龍膽石斑" });
  const picked = await handleText(asked.context, "龍膽石斑", { city: "高雄市" });
  assert.match(textOf(picked), /龍膽石斑/);
  assert.match(textOf(picked), /代碼 2202/);
  assert.equal(picked.context.market_pending, null);
  assert.match(decodeURIComponent(quoteCalls().pop()), /code=2202/);
});

test("查無魚種代碼時回明確訊息，不出現價格數字", async function () {
  market = apiError({ code: "SPECIES_NOT_FOUND", message: "查無此魚種代碼" }, 404);
  const text = textOf(await handleText(null, "白鯧現在多少錢", { city: "高雄市" }));
  assert.match(text, /查無此魚種代碼/);
  assert.match(text, /白鯧/);
  assert.doesNotMatch(text, /元／|大約|平均價/);
});

test("有代碼但無交易時回暫無行情", async function () {
  market = { found: false, reason: "NO_TRADE_DATA", species_code: 2141, official_name: "土魠" };
  const text = textOf(await handleText(null, "土魠魚多少錢", { city: "高雄市" }));
  assert.equal(text, "暫無行情");
  assert.doesNotMatch(text, /\d|元／/);
});

test("上游失敗時不編造數字", async function () {
  market = new Error("network");
  const text = textOf(await handleText(null, "土魠魚多少錢", { city: "高雄市" }));
  assert.equal(text, "暫無行情");
});

test("沒有指定魚種時請使用者補充，不呼叫行情 API", async function () {
  const text = textOf(await handleText(null, "今天行情如何", { city: "高雄市" }));
  assert.match(text, /請問想查哪一種魚的行情/);
  assert.equal(quoteCalls().length, 0);
});

test("未知魚種前有縣市時，不會把縣市當成魚名", async function () {
  market = apiError({ code: "SPECIES_NOT_FOUND", message: "查無此魚種代碼" }, 404);
  const text = textOf(await handleText(null, "澎湖縣白鯧現在多少錢", { city: "高雄市" }));
  assert.match(text, /查無此魚種代碼/);
  assert.doesNotMatch(text, /澎湖縣白鯧/);
});

test("字典不可用時回明確訊息", async function () {
  market = apiError({ code: "CATALOG_UNAVAILABLE", message: "尚未同步" }, 503);
  const text = textOf(await handleText(null, "土魠魚多少錢", { city: "高雄市" }));
  assert.match(text, /無法取得官方魚種代碼/);
  assert.doesNotMatch(text, /元／/);
});

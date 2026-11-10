/* 對話行情問答測試共用：官方字典、行情回應、API 呼叫紀錄與回覆擷取。 */

const CATALOG = [
  { species_code: 2141, official_name: "土魠", aliases: ["土魠魚"], is_aquaculture: false },
  { species_code: 1051, official_name: "吳郭魚", aliases: [], is_aquaculture: false },
  { species_code: 1021, official_name: "鮭魚", aliases: [], is_aquaculture: false },
  { species_code: 2201, official_name: "石斑魚", aliases: [], is_aquaculture: false },
  { species_code: 2202, official_name: "龍膽石斑", aliases: [], is_aquaculture: false }
];

let market = null;
const calls = [];

export function apiError(body, status) {
  const error = new Error(body.message || body.code);
  error.status = status || 400;
  error.data = body;
  return error;
}

function history(days) {
  const rows = [];
  for (let i = 0; i < days; i += 1) {
    rows.push({
      trade_date: "2026-09-" + String(i + 1).padStart(2, "0"),
      price_per_kg: 50 + i,
      price_per_taijin: 30 + i
    });
  }
  return rows;
}

export function quote(overrides) {
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
    quality: "official",
    history: history(30)
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

export const service = await import("../assets/js/demo/ai/service.js");

export function setMarket(value) {
  market = value;
}

export function resetFixture() {
  market = quote();
  calls.length = 0;
}

export function marketCalls() {
  return calls.filter(function (path) {
    return path.indexOf("/api/market/quote") === 0 || path.indexOf("/api/market/prices") === 0;
  });
}

export function textOf(result) {
  return result.replies.map(function (reply) { return reply.text || ""; }).join("\n");
}

export function cardOf(result) {
  const reply = result.replies.find(function (item) {
    return item.card && item.card.type === "market_quote";
  });
  return reply ? reply.card : null;
}

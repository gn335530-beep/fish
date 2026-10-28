/* 上架行情卡測試共用：官方字典、行情回應與 API 呼叫紀錄。 */

const CATALOG = [
  { species_code: 2141, official_name: "土魠", aliases: ["土魠魚"], is_aquaculture: false },
  { species_code: 2166, official_name: "花枝", aliases: [], is_aquaculture: false },
  { species_code: 1073, official_name: "海鱸", aliases: [], is_aquaculture: true },
  { species_code: 2201, official_name: "石斑魚", aliases: [], is_aquaculture: false },
  { species_code: 2202, official_name: "龍膽石斑", aliases: [], is_aquaculture: false }
];

const HISTORY = [];
for (let i = 0; i < 30; i += 1) {
  HISTORY.push({
    trade_date: "2026-09-" + String(i + 1).padStart(2, "0"),
    price_per_kg: 300 + i,
    price_per_taijin: 180 + i
  });
}

let market = null;
const calls = [];

function catalogFor(query) {
  if (!query) return CATALOG;
  if (query === "石斑") {
    return CATALOG.filter(function (row) { return row.official_name.indexOf("石斑") !== -1; });
  }
  return CATALOG.filter(function (row) {
    return row.official_name === query || (row.aliases || []).indexOf(query) !== -1;
  });
}

globalThis.window = {
  HaisenAPI: {
    request: async function (path) {
      calls.push(path);
      if (path.indexOf("/api/market/codes") === 0) {
        const url = new URL("http://test" + path);
        const query = url.searchParams.get("q") || "";
        return { data: { query: query || null, candidates: catalogFor(query) } };
      }
      if (path.indexOf("/api/market/quote") === 0) {
        const url = new URL("http://test" + path);
        const name = url.searchParams.get("q") || "";
        if (market instanceof Error) throw market;
        if (!CATALOG.some(function (row) { return row.official_name === name; })) {
          const error = new Error("查無此魚種代碼");
          error.status = 404;
          error.data = { code: "SPECIES_NOT_FOUND" };
          throw error;
        }
      }
      if (path.indexOf("/api/market/prices") === 0 || path.indexOf("/api/market/quote") === 0) {
        if (market instanceof Error) throw market;
        if (market && market.found) {
          const url = new URL("http://test" + path);
          const code = Number(url.searchParams.get("code")) || 2166;
          const row = CATALOG.find(function (item) { return item.species_code === code; }) || CATALOG[0];
          const days = Number(url.searchParams.get("days")) || 0;
          const data = Object.assign({}, market, {
            species_code: code,
            official_name: row.official_name
          });
          if (days) data.history = (market.history || []).slice(-days);
          return { data: data };
        }
        return { data: market };
      }
      throw new Error("unexpected path: " + path);
    }
  }
};

export const service = await import("../assets/js/demo/ai/service.js");
export const editing = await import("../assets/js/demo/ai/editing.js");
const { loadCatalog } = await import("../assets/js/demo/ai/species-catalog.js");
await loadCatalog();

export function quote(overrides) {
  return Object.assign({
    found: true,
    species_code: 2166,
    official_name: "花枝",
    scope: "city",
    region: "高雄市",
    trade_date: "2026-10-22",
    price_per_kg: 333.3,
    price_per_taijin: 200,
    is_aquaculture: false,
    source: "農業部漁產品交易行情",
    source_url: "https://example.test",
    fetched_at: "2026-10-27T00:00:00.000Z",
    quality: "official",
    history: HISTORY
  }, overrides || {});
}

export function setMarket(value) {
  market = value;
}

export function resetCalls() {
  calls.length = 0;
}

export function resetFixture() {
  market = quote();
  calls.length = 0;
}

export function marketCalls() {
  return calls.filter(function (path) {
    return path.indexOf("/api/market/prices") === 0 || path.indexOf("/api/market/quote") === 0;
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

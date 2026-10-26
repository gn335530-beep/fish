/* 上架行情卡測試共用：魚種、行情回應與 API 呼叫紀錄。 */

const SPECIES = [
  { id: "cuttlefish", name: "花枝", alias: [], category: "ceph", texture: "", bones: "無刺", cooking: ["炒"] },
  { id: "seabass", name: "海鱸", alias: [], category: "fish", texture: "", bones: "刺少", cooking: ["清蒸"] }
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

globalThis.window = {
  HaisenAPI: {
    listSpecies: async function () { return SPECIES; },
    request: async function (path) {
      calls.push(path);
      if (path.indexOf("/api/species") === 0) return { data: SPECIES };
      if (path.indexOf("/api/market/prices") === 0) {
        if (market instanceof Error) throw market;
        if (market && market.found) {
          const url = new URL("http://test" + path);
          const speciesId = url.searchParams.get("species_id");
          const days = Number(url.searchParams.get("days")) || 0;
          const data = Object.assign({}, market, { species_id: speciesId });
          if (days) data.history = (market.history || []).slice(-days);
          return { data: data };
        }
        return { data: market };
      }
      throw new Error("unexpected path: " + path);
    }
  }
};

export const { loadSpecies } = await import("../assets/js/demo/ai/species.js");
export const service = await import("../assets/js/demo/ai/service.js");
export const editing = await import("../assets/js/demo/ai/editing.js");
await loadSpecies();

export function quote(overrides) {
  return Object.assign({
    found: true,
    species_id: "cuttlefish",
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
  return calls.filter(function (path) { return path.indexOf("/api/market/prices") === 0; });
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

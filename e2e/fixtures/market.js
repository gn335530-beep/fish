/* 行情卡固定資料：測試不連真實批發行情，也不依賴當日市場。 */

function history30() {
  const start = Date.UTC(2026, 8, 23);
  return Array.from({ length: 30 }, function (_, index) {
    const day = new Date(start + index * 86400000).toISOString().slice(0, 10);
    return {
      trade_date: day,
      price_per_kg: 110 + (index % 10),
      price_per_taijin: 183 + (index % 10) * 3
    };
  });
}

const CANDIDATES = Object.freeze([
  { species_code: 2166, official_name: "花枝", aliases: ["花枝"], is_aquaculture: false },
  { species_code: 2201, official_name: "土魠魚", aliases: ["土魠", "土魠魚"], is_aquaculture: false }
]);

const QUOTE = Object.freeze({
  found: true,
  species_code: 2166,
  official_name: "花枝",
  species_name: "花枝",
  scope: "city",
  region: "高雄市",
  trade_date: "2026-10-22",
  price_per_kg: 120,
  price_per_taijin: 200,
  is_aquaculture: false,
  source: "農業部 漁業署",
  source_url: "https://data.moa.gov.tw/",
  history: [
    { trade_date: "2026-10-16", price_per_kg: 114, price_per_taijin: 190 },
    { trade_date: "2026-10-17", price_per_kg: 117, price_per_taijin: 195 },
    { trade_date: "2026-10-18", price_per_kg: 120, price_per_taijin: 200 },
    { trade_date: "2026-10-19", price_per_kg: 123, price_per_taijin: 205 },
    { trade_date: "2026-10-20", price_per_kg: 126, price_per_taijin: 210 },
    { trade_date: "2026-10-21", price_per_kg: 123, price_per_taijin: 205 },
    { trade_date: "2026-10-22", price_per_kg: 120, price_per_taijin: 200 }
  ],
  history_30: history30(),
  high: 210,
  low: 190,
  high_30: 210,
  low_30: 183
});

module.exports = {
  CANDIDATES: CANDIDATES,
  QUOTE: QUOTE
};

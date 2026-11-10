/* 行情卡固定資料：測試不連真實批發行情，也不依賴當日市場。 */

const CANDIDATES = Object.freeze([
  { code: 2166, official_name: "花枝", aliases: ["花枝"], is_aquaculture: false },
  { code: 2201, official_name: "土魠魚", aliases: ["土魠", "土魠魚"], is_aquaculture: false }
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
  high: 210,
  low: 190
});

module.exports = {
  CANDIDATES: CANDIDATES,
  QUOTE: QUOTE
};

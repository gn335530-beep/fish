/* 把官方原始列轉成 market_prices：只留平均價與交易量都大於 0 的新鮮交易列。 */

const { rocToIso } = require("./dates");
const upstream = require("./upstream");

function priceId(tradeDate, code, marketName) {
  return "mkt_" + tradeDate.replace(/-/g, "") + "_" + code + "_" + marketName;
}

function normalizeRows(rawRows, mapping, fetchedAt) {
  const byId = new Map();
  for (const raw of rawRows || []) {
    const code = Number(raw["品種代碼"]);
    if (code !== Number(mapping.code)) continue;

    const name = String(raw["魚貨名稱"] === undefined ? "" : raw["魚貨名稱"]).trim();
    if (name === "休市") continue;

    const price = Number(raw["平均價"]);
    const volume = Number(raw["交易量"]);
    if (!Number.isFinite(price) || !Number.isFinite(volume) || price <= 0 || volume <= 0) continue;

    const tradeDate = rocToIso(raw["交易日期"]);
    const marketName = String(raw["市場名稱"] === undefined ? "" : raw["市場名稱"]).trim();
    if (!tradeDate || !marketName) continue;

    const id = priceId(tradeDate, code, marketName);
    byId.set(id, {
      id: id,
      species_code: code,
      species_id: mapping.species_id,
      species_name: name,
      market_name: marketName,
      trade_date: tradeDate,
      price_per_kg_avg: price,
      volume_kg: volume,
      is_aquaculture: mapping.is_aquaculture === true,
      source: upstream.SOURCE,
      source_url: upstream.SOURCE_URL,
      fetched_at: fetchedAt,
      quality: "official"
    });
  }
  return [...byId.values()];
}

module.exports = { normalizeRows: normalizeRows };

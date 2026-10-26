/* 行情查詢：先決定交易日與 scope，再以交易量加權算縣市／全國平均與歷史序列。 */

const repository = require("./repository");
const mappings = require("./mappings");

const KG_PER_TAIJIN = 0.6;

function round1(value) {
  return Math.round(value * 10) / 10;
}

function taijinPrice(pricePerKg) {
  return round1(pricePerKg * KG_PER_TAIJIN);
}

function averageRows(rows) {
  let volume = 0;
  let amount = 0;
  for (const row of rows) {
    const weight = Number(row.volume_kg);
    const price = Number(row.price_per_kg_avg);
    if (!Number.isFinite(weight) || !Number.isFinite(price) || weight <= 0) continue;
    volume += weight;
    amount += price * weight;
  }
  return volume > 0 ? amount / volume : null;
}

function verifiedMarketsFor(region) {
  return mappings.markets().filter(function (row) {
    return row.verified === true && row.region === region;
  }).map(function (row) { return row.market_name; });
}

function pickScope(speciesId, tradeDate, region) {
  const rows = repository.pricesForDate(speciesId, tradeDate);
  if (!region) return { scope: "national", rows: rows, region: null };
  const markets = verifiedMarketsFor(region);
  const cityRows = rows.filter(function (row) { return markets.indexOf(row.market_name) !== -1; });
  if (cityRows.length > 0) return { scope: "city", rows: cityRows, region: region };
  return { scope: "national", rows: rows, region: region };
}

function responseSource(rows) {
  let source = null;
  for (const row of rows) {
    if (!source || String(row.fetched_at || "") > String(source.fetched_at || "")) source = row;
  }
  return {
    source: source ? source.source : null,
    source_url: source ? source.source_url : null,
    fetched_at: source ? source.fetched_at : null,
    quality: source ? source.quality : null
  };
}

function historyFor(speciesId, scope, region, endDate, days) {
  const markets = scope === "city" ? verifiedMarketsFor(region) : null;
  const dates = repository.tradeDates(speciesId, endDate).slice().reverse();
  const points = [];
  for (const tradeDate of dates) {
    if (points.length >= days) break;
    const rows = repository.pricesForDate(speciesId, tradeDate).filter(function (row) {
      return markets === null || markets.indexOf(row.market_name) !== -1;
    });
    const avg = averageRows(rows);
    if (avg === null) continue;
    points.push({
      trade_date: tradeDate,
      price_per_kg: round1(avg),
      price_per_taijin: taijinPrice(avg)
    });
  }
  return points.reverse();
}

function buildResult(options) {
  const mapping = mappings.mappingBySpecies(options.speciesId);
  if (!mapping) return { found: false, reason: "NO_MAPPING", species_id: options.speciesId };

  const tradeDate = repository.latestTradeDate(options.speciesId, options.date || null);
  if (!tradeDate) {
    return { found: false, reason: "NO_TRADE_DATA", species_id: options.speciesId };
  }

  const picked = pickScope(options.speciesId, tradeDate, options.region);
  const avg = averageRows(picked.rows);
  if (avg === null) {
    return { found: false, reason: "NO_TRADE_DATA", species_id: options.speciesId };
  }

  const data = {
    found: true,
    species_id: options.speciesId,
    scope: picked.scope,
    region: picked.region,
    trade_date: tradeDate,
    price_per_kg: round1(avg),
    price_per_taijin: taijinPrice(avg),
    is_aquaculture: mapping.is_aquaculture === true
  };
  Object.assign(data, responseSource(picked.rows));
  if (options.includeHistory) {
    data.history = historyFor(options.speciesId, picked.scope, picked.region, tradeDate, options.days || 7);
  }
  return data;
}

module.exports = {
  buildResult: buildResult,
  averageRows: averageRows,
  round1: round1
};

/* market_prices 與 market_fetch_state 的存取；查詢只讀這裡，不直接碰 db。 */

const { all, findById, insert, patch, remove } = require("../store");
const { addDays, maxDate, todayIso } = require("./dates");

function stateId(code) {
  return "mfs_" + code;
}

function upsertPrices(rows) {
  let written = 0;
  for (const row of rows) {
    const existing = findById("market_prices", row.id);
    if (existing) {
      patch("market_prices", existing.id, row);
    } else {
      insert("market_prices", row);
    }
    written += 1;
  }
  return written;
}

function getState(code) {
  return findById("market_fetch_state", stateId(code));
}

function saveState(code, speciesId, changes) {
  const existing = getState(code);
  if (existing) return patch("market_fetch_state", existing.id, changes);
  return insert("market_fetch_state", Object.assign({
    id: stateId(code),
    species_code: Number(code),
    species_id: speciesId,
    last_checked_at: null,
    last_trade_date: null,
    last_row_count: 0,
    last_status: "",
    last_error: null,
    last_error_at: null,
    last_range_from: null,
    last_range_to: null,
    last_latest_at: null
  }, changes));
}

function allStates() {
  return all("market_fetch_state");
}

function allPrices() {
  return all("market_prices");
}

function pricesForDate(speciesId, tradeDate) {
  return allPrices().filter(function (row) {
    return row.species_id === speciesId && row.trade_date === tradeDate;
  });
}

function hasPricesForDate(speciesId, tradeDate) {
  return allPrices().some(function (row) {
    return row.species_id === speciesId && row.trade_date === tradeDate;
  });
}

function latestTradeDate(speciesId, onOrBefore) {
  let latest = null;
  for (const row of allPrices()) {
    if (row.species_id !== speciesId) continue;
    if (onOrBefore && row.trade_date > onOrBefore) continue;
    latest = maxDate(latest, row.trade_date);
  }
  return latest;
}

function tradeDates(speciesId, onOrBefore) {
  const dates = new Set();
  for (const row of allPrices()) {
    if (row.species_id !== speciesId) continue;
    if (onOrBefore && row.trade_date > onOrBefore) continue;
    dates.add(row.trade_date);
  }
  return [...dates].sort();
}

function pruneOlderThan(days) {
  const cutoff = addDays(todayIso(), -days);
  let removed = 0;
  for (const row of allPrices()) {
    if (row.trade_date < cutoff) {
      remove("market_prices", row.id);
      removed += 1;
    }
  }
  for (const state of allStates()) {
    const lastChecked = String(state.last_checked_at || "");
    if (!lastChecked || lastChecked.slice(0, 10) < cutoff) {
      remove("market_fetch_state", state.id);
      removed += 1;
    }
  }
  return removed;
}

module.exports = {
  upsertPrices: upsertPrices,
  getState: getState,
  saveState: saveState,
  allStates: allStates,
  allPrices: allPrices,
  pricesForDate: pricesForDate,
  hasPricesForDate: hasPricesForDate,
  latestTradeDate: latestTradeDate,
  tradeDates: tradeDates,
  pruneOlderThan: pruneOlderThan
};

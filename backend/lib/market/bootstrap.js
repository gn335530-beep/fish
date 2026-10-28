/* 啟動時把程式內建的市場對照同步到 db，並移除舊魚種對照集合。 */

const { all, setAll, dropCollection } = require("../store");
const markets = require("./markets");

function syncTable(collection, rows) {
  if (JSON.stringify(all(collection)) !== JSON.stringify(rows)) setAll(collection, rows);
}

/* 舊行情資料曾以 species_id 標記；啟動時清掉，查詢只認 species_code。 */
function stripSpeciesId(collection) {
  const rows = all(collection);
  if (!rows.some(function (row) { return Object.prototype.hasOwnProperty.call(row, "species_id"); })) return;
  setAll(collection, rows.map(function (row) {
    const next = Object.assign({}, row);
    delete next.species_id;
    return next;
  }));
}

function seedMarketMappings() {
  dropCollection("species_market_codes");
  syncTable("market_locations", markets.markets());
  stripSpeciesId("market_prices");
  stripSpeciesId("market_fetch_state");
}

module.exports = { seedMarketMappings: seedMarketMappings };

/* 啟動時把程式內建的唯讀對照表同步到 db；內容相同就不重寫檔案。 */

const { all, setAll } = require("../store");
const mappings = require("./mappings");

function syncTable(collection, rows) {
  if (JSON.stringify(all(collection)) !== JSON.stringify(rows)) setAll(collection, rows);
}

function seedMarketMappings() {
  syncTable("species_market_codes", mappings.speciesCodes());
  syncTable("market_locations", mappings.markets());
}

module.exports = { seedMarketMappings: seedMarketMappings };

/* 行情對照表（唯一來源）：系統魚種 → 一個主要新鮮官方代碼，市場簡稱 → 縣市。
   魚種名稱與別名只來自 ../species.js，這裡只補官方代碼、分類與養殖旗標。 */

const species = require("../species");

const CODE_BY_SPECIES = {
  amberjack: { code: 2079, category: "2" },
  seabream: { code: 2011, category: "2" },
  grouper: { code: 2201, category: "2" },
  tuna: { code: 2114, category: "2" },
  seabass: { code: 1073, category: "1" },
  mackerel: { code: 2331, category: "2" },
  squid: { code: 2166, category: "2" },
  redseabream: { code: 2012, category: "2" },
  blackbream: { code: 2015, category: "2" },
  yellowfin: { code: 2113, category: "2" },
  dolphinfish: { code: 2291, category: "2" },
  scad: { code: 2074, category: "2" },
  ribbonfish: { code: 2341, category: "2" },
  threadfin: { code: 2271, category: "2" },
  bigeye: { code: 2051, category: "2" },
  tilefish: { code: 2181, category: "2" },
  rockfish: { code: 2440, category: "2" },
  leatherjacket: { code: 2571, category: "2" },
  cuttlefish: { code: 2163, category: "2" },
  octopus: { code: 2169, category: "2" },
  lobster: { code: 4131, category: "4" },
  crab: { code: 4513, category: "4" },
  shrimp: { code: 4015, category: "4" },
  oyster: { code: 5012, category: "5" },
  clam: { code: 5022, category: "5" },
  milkfish: { code: 1041, category: "1" },
  eel: { code: 1031, category: "1" },
  sweetfish: { code: 2631, category: "2" }
};

const AQUACULTURE_SPECIES = ["seabass", "milkfish", "eel", "oyster", "clam"];

const MARKET_LOCATIONS = [
  { market_name: "三重", region: "新北市", verified: true, note: "" },
  { market_name: "佳里", region: "台南市", verified: true, note: "" },
  { market_name: "台中", region: "台中市", verified: true, note: "" },
  { market_name: "台北", region: "台北市", verified: true, note: "" },
  { market_name: "台南", region: "台南市", verified: true, note: "" },
  { market_name: "嘉義", region: "嘉義市", verified: true, note: "" },
  { market_name: "埔心", region: "彰化縣", verified: true, note: "彰化縣埔心魚市場" },
  { market_name: "基隆", region: "基隆市", verified: true, note: "" },
  { market_name: "岡山", region: "高雄市", verified: true, note: "" },
  { market_name: "彰化", region: "彰化縣", verified: true, note: "" },
  { market_name: "斗南", region: "雲林縣", verified: true, note: "" },
  { market_name: "新港", region: "台東縣", verified: false, note: "台東成功新港魚市場；同名地點另有嘉義新港，待確認" },
  { market_name: "新營", region: "台南市", verified: true, note: "" },
  { market_name: "新竹", region: "新竹市", verified: true, note: "" },
  { market_name: "桃園", region: "桃園市", verified: true, note: "" },
  { market_name: "梓官", region: "高雄市", verified: true, note: "" },
  { market_name: "澎湖", region: "澎湖縣", verified: true, note: "" },
  { market_name: "興達港", region: "高雄市", verified: true, note: "" },
  { market_name: "花蓮", region: "花蓮縣", verified: true, note: "" },
  { market_name: "苗栗", region: "苗栗縣", verified: true, note: "" },
  { market_name: "高雄", region: "高雄市", verified: true, note: "" }
];

function speciesCodes() {
  const unknown = Object.keys(CODE_BY_SPECIES).filter(function (id) {
    return !species.byId(id);
  });
  if (unknown.length > 0) throw new Error("行情對照含未知魚種：" + unknown.join(", "));
  return species.SPECIES.filter(function (item) {
    return Boolean(CODE_BY_SPECIES[item.id]);
  }).map(function (item) {
    const mapping = CODE_BY_SPECIES[item.id];
    return {
      code: mapping.code,
      official_name: item.name,
      species_id: item.id,
      is_aquaculture: AQUACULTURE_SPECIES.indexOf(item.id) !== -1,
      category: mapping.category,
      aliases: item.alias
    };
  });
}

function mappingBySpecies(speciesId) {
  return speciesCodes().find(function (row) { return row.species_id === speciesId; }) || null;
}

function locationByMarket(marketName) {
  return MARKET_LOCATIONS.find(function (row) { return row.market_name === marketName; }) || null;
}

module.exports = {
  speciesCodes: speciesCodes,
  mappingBySpecies: mappingBySpecies,
  markets: function () { return MARKET_LOCATIONS.map(function (row) { return Object.assign({}, row); }); },
  locationByMarket: locationByMarket
};

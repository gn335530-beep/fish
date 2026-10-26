/* 行情對照表（唯一來源）：系統魚種 → 一個主要新鮮官方代碼，市場簡稱 → 縣市。
   魚種清單本身仍來自 ../species.js，這裡只補官方代碼與養殖旗標。 */

const species = require("../species");

const CODE_BY_SPECIES = {
  amberjack: { code: 2079, official_name: "紅魽", category: "2", aliases: ["紅甘", "紅魽魚"] },
  seabream: { code: 2011, official_name: "加鱲", category: "2", aliases: ["嘉鱲", "真鯛", "嘉鱲魚", "加臘"] },
  grouper: { code: 2201, official_name: "石斑魚", category: "2", aliases: ["玳瑁石斑", "石斑"] },
  tuna: { code: 2114, official_name: "黑鮪", category: "2", aliases: ["黑鮪魚", "鮪魚"] },
  seabass: { code: 1073, official_name: "七星鱸", category: "1", is_aquaculture: true, aliases: ["海鱸", "鱸魚", "七星鱸"] },
  mackerel: { code: 2331, official_name: "鯖魚", category: "2", aliases: ["白腹鯖", "鯖魚"] },
  squid: { code: 2166, official_name: "小卷", category: "2", aliases: ["澎湖小卷", "小卷", "軟絲", "透抽"] },
  redseabream: { code: 2012, official_name: "赤宗", category: "2", aliases: ["赤鯮"] },
  blackbream: { code: 2015, official_name: "黑鯛", category: "2", aliases: ["黑格"] },
  yellowfin: { code: 2113, official_name: "黃鰭鮪", category: "2", aliases: [] },
  dolphinfish: { code: 2291, official_name: "暑魚", category: "2", aliases: ["鬼頭刀", "鱰魚", "飛烏虎"] },
  scad: { code: 2074, official_name: "巴闌", category: "2", aliases: ["竹筴魚", "巴攏", "竹莢魚"] },
  ribbonfish: { code: 2341, official_name: "白帶魚", category: "2", aliases: [] },
  threadfin: { code: 2271, official_name: "午仔魚", category: "2", aliases: [] },
  bigeye: { code: 2051, official_name: "紅目鰱", category: "2", aliases: ["紅目"] },
  tilefish: { code: 2181, official_name: "馬頭魚", category: "2", aliases: [] },
  rockfish: { code: 2440, official_name: "石狗公", category: "2", aliases: [] },
  leatherjacket: { code: 2571, official_name: "剝皮魚", category: "2", aliases: [] },
  cuttlefish: { code: 2163, official_name: "花枝", category: "2", aliases: [] },
  octopus: { code: 2169, official_name: "章魚", category: "2", aliases: [] },
  lobster: { code: 4131, official_name: "龍蝦海", category: "4", aliases: ["龍蝦"] },
  crab: { code: 4513, official_name: "三點仔", category: "4", aliases: ["三點蟹"] },
  shrimp: { code: 4015, official_name: "白蝦", category: "4", aliases: ["蝦"] },
  oyster: { code: 5012, official_name: "牡蠣養", category: "5", is_aquaculture: true, aliases: ["牡蠣", "蚵"] },
  clam: { code: 5022, official_name: "文蛤養", category: "5", is_aquaculture: true, aliases: ["文蛤", "蛤"] },
  milkfish: { code: 1041, official_name: "虱目魚", category: "1", is_aquaculture: true, aliases: [] },
  eel: { code: 1031, official_name: "白鰻", category: "1", is_aquaculture: true, aliases: ["鰻魚"] },
  sweetfish: { code: 2631, official_name: "香魚", category: "2", aliases: [] }
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
      official_name: mapping.official_name,
      species_id: item.id,
      is_aquaculture: AQUACULTURE_SPECIES.indexOf(item.id) !== -1,
      category: mapping.category,
      aliases: mapping.aliases
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

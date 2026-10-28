/* 市場簡稱 → 縣市對照（唯一來源）；未確認市場不參與縣市平均。 */

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

function markets() {
  return MARKET_LOCATIONS.map(function (row) { return Object.assign({}, row); });
}

function locationByMarket(marketName) {
  return MARKET_LOCATIONS.find(function (row) { return row.market_name === marketName; }) || null;
}

module.exports = {
  markets: markets,
  locationByMarket: locationByMarket
};

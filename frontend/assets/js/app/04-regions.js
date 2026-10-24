/* 漁獲列表的地區篩選：以縣市為單位；「全部」以空字串表示。 */
const CITY_ORDER = [
  "基隆市", "台北市", "新北市", "桃園市", "新竹市", "新竹縣",
  "苗栗縣", "台中市", "彰化縣", "南投縣", "雲林縣", "嘉義市",
  "嘉義縣", "台南市", "高雄市", "屏東縣", "宜蘭縣", "花蓮縣",
  "台東縣", "澎湖縣", "金門縣", "連江縣"
];

function normalizeRegion(value){
  return CITY_ORDER.indexOf(value) === -1 ? "" : value;
}

/* 顯示與比對統一用「台」，並容納舊資料的「臺」。 */
function normalizeCityName(value){
  return String(value || "").replace(/臺/g, "台");
}

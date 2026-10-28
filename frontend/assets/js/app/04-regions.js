/* 漁獲列表的地區篩選：以縣市為單位；「全部」以空字串表示。
   清單與文字正規化來自 shared/regions-data.js，不在此另存一份。 */
const CITY_ORDER = globalThis.TAIWAN_REGIONS || [];

function normalizeRegion(value){
  return CITY_ORDER.indexOf(value) === -1 ? "" : value;
}

function normalizeCityName(value){
  return globalThis.HaisenRegionText.normalizeCityName(value);
}

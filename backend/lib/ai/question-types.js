/* 助手問題類型：分類與地區上下文共用同一套關鍵詞，避免兩邊漂移。 */

const { CITIES, normalizeArea } = require("../regions");

const WEATHER = /(天氣|氣象|下雨|降雨|氣溫|溫度|風速|風向)/;
const SEA = /(海況|浪況|浪高|浪向|浪週期|海浪|風浪|海溫)/;
const TIDE = /(潮汐|潮水|滿潮|乾潮)/;
const FISHING = /((適合|可以|能不能|能|要注意|注意什麼)[^。？！]{0,8}(釣魚|海釣|磯釣|去海邊)|釣魚嗎|磯釣嗎)/;
const LOCAL_INFO = /(新聞|颱風|即時|最新|交通|路況|活動|在地)/;
const NEARBY = /(附近|這裡|這邊)/;
const TEMPORAL = /(今天|今日|現在|目前)/;
const FOREIGN = /(東京|大阪|京都|北海道|沖繩|首爾|釜山|北京|上海|廈門|香港|澳門|新加坡|曼谷|雪梨|倫敦|巴黎|紐約|洛杉磯|溫哥華|多倫多|日本|韓國|中國|美國|加拿大|英國|法國|德國|澳洲|紐西蘭|泰國|越南|菲律賓|馬來西亞|印尼)/;

const PLACE_QUERY = /([\u4e00-\u9fff]{1,15}?)(?:的)?(?:天氣|氣象|氣溫|溫度|下雨|降雨|海況|浪況)/;
const LEADING = /^(?:請問|想問|想查|查一下|查詢|幫我|今天|今日|明天|明日|後天|這週|這周|本週|本周|現在|目前|最近|近期|的)+/;
const GENERIC_PLACE = /(台灣|臺灣|全台|全省|北部|中部|南部|東部|西部|外島|離島|山區|平地|沿海|海邊|外海|附近|這裡|這邊|當地|在地|馬祖)/;

function isWeatherQuestion(text) {
  return WEATHER.test(String(text || ""));
}

function isSeaQuestion(text) {
  return SEA.test(String(text || ""));
}

function isLocalInfoQuestion(text) {
  return LOCAL_INFO.test(String(text || ""));
}

function isFishingQuestion(text) {
  return FISHING.test(String(text || ""));
}

function isTideQuestion(text) {
  return TIDE.test(String(text || ""));
}

/* 海況、潮汐與釣魚建議共用同一個完整海況包。 */
function isSeaTopicQuestion(text) {
  return isSeaQuestion(text) || isTideQuestion(text) || isFishingQuestion(text);
}

function isRegionQuestion(text) {
  const value = String(text || "");
  return WEATHER.test(value) || SEA.test(value) || TIDE.test(value) || FISHING.test(value) ||
    LOCAL_INFO.test(value) || NEARBY.test(value);
}

function isTemporalQuestion(text) {
  return TEMPORAL.test(String(text || ""));
}

/* 有明確地名但不是台灣縣市時走網路；沒有地名的「今天天氣」仍用設定縣市。 */
function hasForeignPlace(text) {
  const source = normalizeArea(text);
  if (FOREIGN.test(source)) return true;
  const match = source.match(PLACE_QUERY);
  if (!match) return false;
  let prefix = match[1];
  let previous;
  do {
    previous = prefix;
    prefix = prefix.replace(LEADING, "");
  } while (previous !== prefix && prefix);
  if (!prefix || GENERIC_PLACE.test(prefix)) return false;
  const taiwanCity = CITIES.some(function (city) {
    return prefix.indexOf(city) !== -1 || prefix.indexOf(city.slice(0, -1)) !== -1;
  });
  return !taiwanCity;
}

module.exports = {
  isWeatherQuestion: isWeatherQuestion,
  isSeaQuestion: isSeaQuestion,
  isLocalInfoQuestion: isLocalInfoQuestion,
  isFishingQuestion: isFishingQuestion,
  isTideQuestion: isTideQuestion,
  isSeaTopicQuestion: isSeaTopicQuestion,
  isRegionQuestion: isRegionQuestion,
  isTemporalQuestion: isTemporalQuestion,
  hasForeignPlace: hasForeignPlace
};

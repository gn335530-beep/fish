/* 助手地區上下文：只有地區問題才帶縣市；缺縣市或海域時反問，暫存在目前對話。 */

const { CITIES, normalizeRegion } = require("../regions");
const places = require("../conditions/places");
const regionStore = require("./region-store");

const REGION_QUESTION = /(天氣|氣象|下雨|降雨|氣溫|溫度|風速|風向|海況|浪況|浪高|浪向|浪週期|海浪|風浪|海溫|潮汐|潮水|滿潮|乾潮|新聞|交通|路況|活動|附近|這裡|這邊|在地)/;
const WEATHER_QUESTION = /(天氣|氣象|下雨|降雨|氣溫|溫度|風速|風向)/;
const SEA_QUESTION = /(海況|浪況|浪高|浪向|浪週期|海浪|風浪|海溫)/;

function normalize(text) {
  return String(text || "").replace(/臺/g, "台");
}

function cityInText(text) {
  const source = normalize(text);
  const exact = CITIES.filter(function (city) {
    return source.indexOf(city) !== -1;
  })[0];
  if (exact) return exact;
  const short = CITIES.filter(function (city) {
    return source.indexOf(city.slice(0, -1)) !== -1;
  })[0];
  return short || "";
}

function cityOnly(text, city) {
  if (!city) return false;
  const rest = normalize(text)
    .split(city).join("")
    .split(city.slice(0, -1)).join("")
    .replace(/[，,。.!！?？、:：;；\s]/g, "");
  return rest === "";
}

/* 回傳這一輪是否為地區問題、縣市與海域，以及是否需要反問或確認。 */
function prepare(options) {
  const conversationId = options.conversationId;
  const text = options.text;
  const explicit = cityInText(text);
  const asked = regionStore.wasAsked(conversationId);
  const stored = regionStore.cityOf(conversationId);
  const profile = normalizeRegion(options.user && options.user.city);
  const sea = SEA_QUESTION.test(String(text || ""));
  const explicitSea = places.seaAreaInText(text);
  const active = REGION_QUESTION.test(String(text || "")) || Boolean(explicit);

  if (asked && explicit) {
    regionStore.rememberCity(conversationId, explicit);
    regionStore.clearAsked(conversationId);
    if (cityOnly(text, explicit)) {
      return { active: true, city: explicit, mode: "", seaArea: "", askCity: false, askSea: false, ackCity: explicit };
    }
  }
  if (asked && !explicit && !active) regionStore.clearAsked(conversationId);

  const city = explicit || stored || profile || "";
  if (active && !city && !(sea && explicitSea)) {
    regionStore.markAsked(conversationId);
    return { active: true, city: "", mode: "", seaArea: "", askCity: true, askSea: false, ackCity: "" };
  }

  const seaArea = explicitSea || (sea ? places.seaAreaForCity(city) : "");
  if (sea && !seaArea) {
    return { active: true, city: city, mode: "sea", seaArea: "", askCity: false, askSea: true, ackCity: "" };
  }
  const mode = sea ? "sea" : (WEATHER_QUESTION.test(String(text || "")) ? "weather" : "");
  return {
    active: active, city: city, mode: mode, seaArea: seaArea,
    askCity: false, askSea: false, ackCity: ""
  };
}

function promptLine(place) {
  return "\n\n本輪地區問題的地點是「" + place + "」。只使用這個縣市或海域回答天氣、海況或在地資訊，不要自行推測區或地址。";
}

module.exports = {
  prepare: prepare,
  promptLine: promptLine,
  cityInText: cityInText,
  isRegionQuestion: function (text) { return REGION_QUESTION.test(String(text || "")); }
};

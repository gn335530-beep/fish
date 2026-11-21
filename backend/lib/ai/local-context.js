/* 助手地區上下文：只有地區問題才帶縣市；缺縣市或海域時反問，暫存在目前對話。 */

const { CITIES, normalizeArea, normalizeRegion } = require("../regions");
const places = require("../conditions/places");
const questions = require("./question-types");
const regionStore = require("./region-store");

function cityInText(text) {
  const source = normalizeArea(text);
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
  const rest = normalizeArea(text)
    .split(city).join("")
    .split(city.slice(0, -1)).join("")
    .replace(/[，,。.!！?？、:：;；\s]/g, "");
  return rest === "";
}

function cityForTurn(options) {
  return cityInText(options.text) ||
    regionStore.cityOf(options.conversationId) ||
    normalizeRegion(options.user && options.user.city) ||
    "";
}

/* 回傳這一輪是否為地區問題、縣市與海域，以及是否需要反問或確認。 */
function prepare(options) {
  const conversationId = options.conversationId;
  const text = options.text;
  const explicit = cityInText(text);
  const asked = regionStore.wasAsked(conversationId);
  const sea = questions.isSeaTopicQuestion(text);
  const explicitSea = places.seaAreaInText(text);
  const foreign = !explicit && !explicitSea && questions.hasForeignPlace(text);

  if (foreign) {
    if (asked) regionStore.clearAsked(conversationId);
    return { active: false, city: "", mode: "", seaArea: "", askCity: false, askSea: false, ackCity: "" };
  }

  const active = questions.isRegionQuestion(text) || Boolean(explicit);
  if (asked && explicit) {
    regionStore.rememberCity(conversationId, explicit);
    regionStore.clearAsked(conversationId);
    if (cityOnly(text, explicit)) {
      return { active: true, city: explicit, mode: "", seaArea: "", askCity: false, askSea: false, ackCity: explicit };
    }
  }
  if (asked && !explicit && !active) regionStore.clearAsked(conversationId);

  const city = cityForTurn({ text: text, conversationId: conversationId, user: options.user });
  if (active && !city && !(sea && explicitSea)) {
    regionStore.markAsked(conversationId);
    return { active: true, city: "", mode: "", seaArea: "", askCity: true, askSea: false, ackCity: "" };
  }

  const seaArea = explicitSea || (sea ? places.seaAreaForCity(city) : "");
  if (sea && !seaArea) {
    return { active: true, city: city, mode: "sea", seaArea: "", askCity: false, askSea: true, ackCity: "" };
  }
  const mode = sea ? "sea" : (questions.isWeatherQuestion(text) ? "weather" : "");
  return {
    active: active, city: city, mode: mode, seaArea: seaArea,
    askCity: false, askSea: false, ackCity: ""
  };
}

function dateLine(at) {
  const time = Number.isFinite(at) ? at : Date.now();
  const date = new Date(time + 8 * 3600 * 1000).toISOString().slice(0, 10);
  return "\n\n目前日期（Asia/Taipei）：" + date + "。";
}

function promptLine(place) {
  return "\n\n本輪地區問題的地點是「" + place + "」。只使用這個縣市或海域回答天氣、海況或在地資訊，不要自行推測區或地址。";
}

module.exports = {
  prepare: prepare,
  dateLine: dateLine,
  promptLine: promptLine,
  cityInText: cityInText,
  cityForTurn: cityForTurn
};

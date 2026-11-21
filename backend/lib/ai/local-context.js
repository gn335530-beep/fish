/* 助手地區上下文：只有地區問題才帶縣市；需要縣市卻缺少時反問，暫存在目前對話。 */

const { CITIES, normalizeArea, normalizeRegion } = require("../regions");
const places = require("../conditions/places");
const questions = require("./question-types");
const { isPlatformText } = require("./classify");
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

/* active 決定是否把縣市放進 prompt；needsCity 決定是否反問；usesLocalTool 決定是否開放在地工具。 */
function turn(values) {
  return Object.assign({
    active: false, needsCity: false, usesLocalTool: false, city: "", mode: "", seaArea: "",
    askCity: false, askSea: false, ackCity: ""
  }, values || {});
}

/* 回傳這一輪的在地上下文、縣市與海域，以及是否需要反問或確認。 */
function prepare(options) {
  const conversationId = options.conversationId;
  const text = options.text;
  const asked = regionStore.wasAsked(conversationId);

  /* 平台意圖永遠優先：不反問縣市、不帶縣市，也不強制在地工具。 */
  if (isPlatformText(text)) {
    if (asked) regionStore.clearAsked(conversationId);
    return turn();
  }

  const explicit = cityInText(text);
  const sea = questions.isSeaTopicQuestion(text);
  const explicitSea = places.seaAreaInText(text);
  const foreign = !explicit && !explicitSea && questions.hasForeignPlace(text);

  if (foreign) {
    if (asked) regionStore.clearAsked(conversationId);
    return turn();
  }

  const needsCity = questions.isRegionQuestion(text);
  const onlyCity = Boolean(explicit) && cityOnly(text, explicit);
  const active = needsCity || questions.isLocalInfoQuestion(text) || Boolean(explicit);
  if (asked && explicit) {
    regionStore.rememberCity(conversationId, explicit);
    regionStore.clearAsked(conversationId);
    if (onlyCity) {
      return turn({
        active: true, usesLocalTool: true, city: explicit, ackCity: explicit
      });
    }
  }
  if (asked && !explicit && !needsCity) regionStore.clearAsked(conversationId);

  const city = cityForTurn({ text: text, conversationId: conversationId, user: options.user });
  if (needsCity && !city && !(sea && explicitSea)) {
    regionStore.markAsked(conversationId);
    return turn({ active: true, needsCity: true, askCity: true });
  }

  const seaArea = explicitSea || (sea ? places.seaAreaForCity(city) : "");
  if (sea && !seaArea) {
    return turn({
      active: true, needsCity: true, usesLocalTool: true, city: city, mode: "sea", askSea: true
    });
  }
  const mode = sea ? "sea" : (questions.isWeatherQuestion(text) ? "weather" : "");
  return turn({
    active: active, needsCity: needsCity, usesLocalTool: needsCity || onlyCity,
    city: city, mode: mode, seaArea: seaArea
  });
}

function toolContext(local) {
  if (!local || !local.usesLocalTool) return null;
  return { mode: local.mode, city: local.city, seaArea: local.seaArea };
}

function dateLine(at) {
  const time = Number.isFinite(at) ? at : Date.now();
  const date = new Date(time + 8 * 3600 * 1000).toISOString().slice(0, 10);
  return "\n\n目前日期（Asia/Taipei）：" + date + "。";
}

function promptLine(place) {
  return "\n\n本輪在地資訊的地點是「" + place + "」。只使用這個縣市或海域回答天氣、海況或在地資訊，不要自行推測區或地址。";
}

module.exports = {
  prepare: prepare,
  toolContext: toolContext,
  dateLine: dateLine,
  promptLine: promptLine,
  cityInText: cityInText,
  cityForTurn: cityForTurn
};

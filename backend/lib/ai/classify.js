/* 第一輪工具選擇：平台意圖優先；在地天氣／海況用條件工具，時效與國外地點上網。 */

const questions = require("./question-types");
const places = require("../conditions/places");

const PLATFORM = /(我要賣|想賣|上架|販售|下架|取消上架|修改草稿|改尾數|改價格|行情|均價|平均價|魚價|售價|價錢|價格|多少錢)/;
const PRODUCT = /(推薦|想找|想買|預算|有什麼[^？?]{0,20}(魚|海鮮)|附近有什麼|找[^。？！]{0,8}(魚|海鮮)|挑[^。？！]{0,8}(魚|海鮮))/;

function isPlatformText(text) {
  return PLATFORM.test(String(text || ""));
}

function forceToolFor(text, options) {
  const value = String(text || "");
  const webEnabled = Boolean(options && options.webEnabled);
  if (PLATFORM.test(value)) return null;
  if (questions.isSeaTopicQuestion(value)) {
    if (places.seaAreaInText(value)) return "get_local_conditions";
    return questions.hasForeignPlace(value)
      ? (webEnabled ? "web_search" : null)
      : "get_local_conditions";
  }
  if (questions.isWeatherQuestion(value)) {
    return questions.hasForeignPlace(value)
      ? (webEnabled ? "web_search" : null)
      : "get_local_conditions";
  }
  if (questions.isLocalInfoQuestion(value)) return webEnabled ? "web_search" : null;
  if (PRODUCT.test(value)) return "search_products";
  if (questions.isTemporalQuestion(value) && webEnabled) return "web_search";
  return null;
}

module.exports = { forceToolFor: forceToolFor, isPlatformText: isPlatformText };

/* 第一輪工具選擇：平台意圖優先交給規則；時效性問題強制上網，商品問題強制查商品。 */

const PLATFORM = /(我要賣|想賣|上架|販售|下架|取消上架|修改草稿|改尾數|改價格|行情|均價|平均價|魚價|售價|價錢|價格|多少錢)/;
const WEB = /(天氣|新聞|颱風|下雨|氣溫|即時|最新)/;
const PRODUCT = /(推薦|想找|想買|預算|有什麼[^？?]{0,20}(魚|海鮮)|附近有什麼|找[^。？！]{0,8}(魚|海鮮)|挑[^。？！]{0,8}(魚|海鮮))/;
const TEMPORAL = /(今天|今日|現在|目前)/;

function forceToolFor(text, options) {
  const value = String(text || "");
  const webEnabled = Boolean(options && options.webEnabled);
  if (PLATFORM.test(value)) return null;
  if (WEB.test(value)) return webEnabled ? "web_search" : null;
  if (PRODUCT.test(value)) return "search_products";
  if (TEMPORAL.test(value) && webEnabled) return "web_search";
  return null;
}

module.exports = { forceToolFor: forceToolFor };

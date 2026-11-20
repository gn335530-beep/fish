/* 第一輪工具選擇：平台意圖優先；在地天氣／海況用條件工具，時效與國外地點上網。 */

const PLATFORM = /(我要賣|想賣|上架|販售|下架|取消上架|修改草稿|改尾數|改價格|行情|均價|平均價|魚價|售價|價錢|價格|多少錢)/;
const WEATHER = /(天氣|氣象|下雨|降雨|氣溫|溫度|風速|風向|海況|浪況|浪高|浪向|浪週期|海浪|風浪|海溫)/;
const FOREIGN = /(東京|大阪|京都|北海道|沖繩|首爾|釜山|北京|上海|廈門|香港|澳門|新加坡|曼谷|雪梨|倫敦|巴黎|紐約|洛杉磯|日本|韓國|中國|美國|加拿大|英國|法國|德國|澳洲|紐西蘭|泰國|越南|菲律賓|馬來西亞|印尼)/;
const LOCAL = /(新聞|颱風|即時|最新|交通|路況|活動|在地)/;
const PRODUCT = /(推薦|想找|想買|預算|有什麼[^？?]{0,20}(魚|海鮮)|附近有什麼|找[^。？！]{0,8}(魚|海鮮)|挑[^。？！]{0,8}(魚|海鮮))/;
const TEMPORAL = /(今天|今日|現在|目前)/;

function forceToolFor(text, options) {
  const value = String(text || "");
  const webEnabled = Boolean(options && options.webEnabled);
  const localEnabled = !options || options.localEnabled !== false;
  if (PLATFORM.test(value)) return null;
  if (WEATHER.test(value)) {
    if (FOREIGN.test(value)) return webEnabled ? "web_search" : null;
    if (localEnabled) return "get_local_conditions";
    return webEnabled ? "web_search" : null;
  }
  if (LOCAL.test(value)) return webEnabled ? "web_search" : null;
  if (PRODUCT.test(value)) return "search_products";
  if (TEMPORAL.test(value) && webEnabled) return "web_search";
  return null;
}

module.exports = { forceToolFor: forceToolFor };

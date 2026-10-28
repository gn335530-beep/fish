/* 行情 API：對話層與行情卡共用，統一經 HaisenAPI.request。 */

import { request } from "./request.js";

/* 以代碼查行情；候選選定後用這支，避免同名再次變成多候選。 */
export function getMarketQuoteByCode(code, region, days) {
  const params = new URLSearchParams({ code: String(code) });
  if (region) params.set("region", region);
  if (days) {
    params.set("include", "history");
    params.set("days", String(days));
  }
  return request("/api/market/prices?" + params.toString());
}

/* 名稱或別名查行情：後端完成查代碼與查價。 */
export function getMarketQuote(name, region, days) {
  const params = new URLSearchParams({ q: String(name) });
  if (region) params.set("region", region);
  if (days) {
    params.set("include", "history");
    params.set("days", String(days));
  }
  return request("/api/market/quote?" + params.toString());
}

/* 查官方代碼字典；省略 query 回傳完整字典。 */
export function lookupSpecies(query) {
  const suffix = query ? "?q=" + encodeURIComponent(String(query)) : "";
  return request("/api/market/codes" + suffix);
}

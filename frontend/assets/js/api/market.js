/* 行情 API：對話層與行情卡共用，統一經 HaisenAPI.request。 */

import { request } from "./request.js";

/* 行情查詢：公開端點；可選縣市與 history 天數（7／30）。 */
export function getMarketPrice(speciesId, region, days) {
  const params = new URLSearchParams({ species_id: speciesId });
  if (region) params.set("region", region);
  if (days) {
    params.set("include", "history");
    params.set("days", String(days));
  }
  return request("/api/market/prices?" + params.toString());
}

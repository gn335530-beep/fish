/* 地區正規化與解析：對話與上架流程使用；classic 頁面沿用 04-regions.js。 */

import "./regions-data.js";

const TAIWAN_REGIONS = globalThis.TAIWAN_REGIONS || [];
const regionText = globalThis.HaisenRegionText;

export function normalizeCityName(value) {
  return regionText.normalizeCityName(value);
}

/* 取文字中最長的縣市名稱；去掉縣市尾字後仍可比對，例如「高雄」。 */
export function findRegion(text) {
  const normalized = normalizeCityName(text);
  const hits = TAIWAN_REGIONS.filter(function (region) {
    const short = region.replace(/[市縣]$/, "");
    return normalized.indexOf(region) !== -1 || normalized.indexOf(short) !== -1;
  });
  hits.sort(function (a, b) { return b.length - a.length; });
  return hits[0] || "";
}

/* 農業部漁產品交易行情上游：只組查詢與取回原始列，正規化留給 fetch 服務。 */

const { toRocDate } = require("./dates");

const SOURCE = "農業部漁產品交易行情";
const SOURCE_URL = "https://data.moa.gov.tw/Service/OpenData/FromM/AquaticTransData.aspx";
const TIMEOUT_MS = 15000;

let fetcher = null;

/* 測試可注入 fetcher；傳 null 恢復使用全域 fetch。 */
function setFetcher(fn) {
  fetcher = fn || null;
}

function baseUrl() {
  return process.env.FISHMATCH_MARKET_UPSTREAM || SOURCE_URL;
}

function buildUrl(options) {
  const parts = ["$top=10000", "$skip=0", "TypeNo=" + encodeURIComponent(String(options.code))];
  if (options.from) parts.push("StartDate=" + toRocDate(options.from));
  if (options.to) parts.push("EndDate=" + toRocDate(options.to));
  const base = baseUrl();
  return base + (base.indexOf("?") === -1 ? "?" : "&") + parts.join("&");
}

async function fetchRows(options) {
  const doFetch = fetcher || globalThis.fetch;
  const response = await doFetch(buildUrl(options), {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS)
  });
  if (response && response.ok === false) {
    throw new Error("行情上游 HTTP " + response.status);
  }
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error("行情上游格式錯誤");
  return data;
}

module.exports = {
  SOURCE: SOURCE,
  SOURCE_URL: SOURCE_URL,
  setFetcher: setFetcher,
  buildUrl: buildUrl,
  fetchRows: fetchRows
};

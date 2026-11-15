/* 農業部漁產品交易行情上游：只組查詢與取回原始列，正規化留給 fetch 服務。 */

const { toRocDate } = require("./dates");
const deadline = require("../deadline");

const SOURCE = "農業部漁產品交易行情";
const SOURCE_URL = "https://data.moa.gov.tw/Service/OpenData/FromM/AquaticTransData.aspx";
const DEFAULT_TIMEOUT_MS = 15000;

let fetcher = null;

/* 測試可注入 fetcher；傳 null 恢復使用全域 fetch。 */
function setFetcher(fn) {
  fetcher = fn || null;
}

function baseUrl() {
  return process.env.FISHMATCH_MARKET_UPSTREAM || SOURCE_URL;
}

function buildUrl(options) {
  const parts = ["$top=" + (options.top || 10000), "$skip=" + (options.skip || 0)];
  if (options.code) parts.push("TypeNo=" + encodeURIComponent(String(options.code)));
  if (options.from) parts.push("StartDate=" + toRocDate(options.from));
  if (options.to) parts.push("EndDate=" + toRocDate(options.to));
  const base = baseUrl();
  return base + (base.indexOf("?") === -1 ? "?" : "&") + parts.join("&");
}

function timeoutError() {
  const error = new Error("行情上游逾時");
  error.name = "TimeoutError";
  error.timedOut = true;
  return error;
}

/* 只有未指定期限時才套預設值；0 或負數代表期限已用盡，交給 race 直接回逾時。 */
function requestedTimeout(options) {
  const value = options && options.timeoutMs;
  if (value === undefined || value === null) return DEFAULT_TIMEOUT_MS;
  const number = Number(value);
  return Number.isFinite(number) ? number : DEFAULT_TIMEOUT_MS;
}

/* 呼叫端期限同時中止上游請求；注入的 fetcher 不支援 signal 時仍會準時回來。 */
async function fetchRows(options) {
  const doFetch = fetcher || globalThis.fetch;
  const controller = new AbortController();
  const response = await deadline.race(function () {
    return doFetch(buildUrl(options), {
      headers: { Accept: "application/json" },
      signal: controller.signal
    });
  }, requestedTimeout(options), timeoutError());
  if (response && response.timedOut === true) {
    controller.abort();
    throw response;
  }
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

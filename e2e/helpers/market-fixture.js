/* 在瀏覽器層攔截行情 API；後端因此不會去抓公開行情上游。 */

const { CANDIDATES, QUOTE } = require("../fixtures/market");

const MARKET_PATTERN = "**/api/market/**";
const UPSTREAM_PATTERN = "https://data.moa.gov.tw/**";

function envelope(data, message) {
  return JSON.stringify({ success: true, message: message || "ok", data: data });
}

async function installMarketFixture(page) {
  await page.route(UPSTREAM_PATTERN, function (route) {
    return route.abort();
  });

  await page.route(MARKET_PATTERN, function (route) {
    const url = route.request().url();
    if (url.indexOf("/api/market/codes") !== -1) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: envelope({ query: null, candidates: CANDIDATES }, "取得魚種代碼字典成功")
      });
    }
    if (url.indexOf("/api/market/quote") !== -1 || url.indexOf("/api/market/prices") !== -1) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: envelope(QUOTE, "取得行情成功")
      });
    }
    return route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ success: false, code: "NOT_FOUND", message: "找不到資源" })
    });
  });
}

module.exports = { installMarketFixture: installMarketFixture };

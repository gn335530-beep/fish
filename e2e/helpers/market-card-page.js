/* 用真實行情卡 view 載入固定資料，測試不經對話或上游 API。 */

const fs = require("node:fs");
const path = require("node:path");
const { expect } = require("@playwright/test");

const HTML = fs.readFileSync(
  path.join(__dirname, "..", "fixtures", "market-card.html"),
  "utf8"
);

async function openMarketCardPage(page) {
  await page.route("**/__e2e/market-card", function (route) {
    return route.fulfill({
      status: 200,
      contentType: "text/html; charset=utf-8",
      body: HTML
    });
  });
  await page.goto("/__e2e/market-card");
  await page.waitForFunction(function () {
    return typeof window.renderMarketFixture === "function";
  });
}

async function renderMarketCard(page, card, days) {
  await page.evaluate(function (payload) {
    window.renderMarketFixture(payload.card, payload.days);
  }, { card: card, days: days });
  await expect(page.locator(".fm-card--market")).toBeVisible();
}

module.exports = {
  openMarketCardPage: openMarketCardPage,
  renderMarketCard: renderMarketCard
};

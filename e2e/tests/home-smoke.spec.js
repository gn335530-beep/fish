/* 首頁 smoke：兩個 viewport 都沒有水平溢出，助手面板可開關且幾何固定。 */

const { test, expect } = require("@playwright/test");
const { expectNoHorizontalOverflow, waitForFonts } = require("../helpers/layout");
const { installMarketFixture } = require("../helpers/market-fixture");
const { useTestApi } = require("../helpers/test-api");

test.beforeEach(async function ({ page }) {
  await useTestApi(page);
  await installMarketFixture(page);
});

test("首頁沒有水平溢出，助手面板可開啟與關閉", async function ({ page }) {
  const marketRequests = [];
  page.on("request", function (request) {
    if (request.url().indexOf("/api/market/") !== -1) marketRequests.push(request.url());
  });

  await page.goto("/pages/index.html");
  await expect(page.locator("#today-catch .catch-card").first()).toBeVisible();
  await waitForFonts(page);
  await expectNoHorizontalOverflow(page);

  const toggle = page.locator("#fm-toggle");
  const panel = page.locator("#fm-panel");
  await expect(panel).toBeHidden();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");

  await toggle.click();
  await expect(panel).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#fm-body")).toContainText("登入後就能用對話買魚、賣魚。");

  const box = await panel.boundingBox();
  const viewport = page.viewportSize();
  const mobile = viewport.width <= 760;
  const expectedWidth = mobile
    ? viewport.width
    : Math.min(400, Math.max(320, (viewport.width - 64) / 3));
  const expectedHeight = mobile
    ? viewport.height
    : Math.min(520, viewport.height - 120);
  expect(box.width).toBeCloseTo(expectedWidth, 0);
  expect(box.height).toBeCloseTo(expectedHeight, 0);

  await expect(panel).toHaveScreenshot("assistant-panel-open.png");

  await page.locator('#fm-panel [data-action="close"]').click();
  await expect(panel).toBeHidden();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expectNoHorizontalOverflow(page);

  expect(marketRequests, "首頁不呼叫行情 API").toEqual([]);
});

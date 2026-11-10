/* 登入 smoke：seed 買家可登入，助手面板在真實後端上可開啟。 */

const { test, expect } = require("@playwright/test");
const { loginAsBuyer } = require("../helpers/auth");
const { expectNoHorizontalOverflow } = require("../helpers/layout");
const { installMarketFixture } = require("../helpers/market-fixture");
const { useTestApi } = require("../helpers/test-api");

test.beforeEach(async function ({ page }) {
  await useTestApi(page);
  await installMarketFixture(page);
});

test("seed 買家登入後可開啟助手面板", async function ({ page }) {
  await loginAsBuyer(page);
  await expectNoHorizontalOverflow(page);

  await page.locator("#fm-toggle").click();
  await expect(page.locator("#fm-panel")).toBeVisible();
  await expect(page.locator("#fm-title")).toHaveText("AI 聊天小幫手");
  await expect(page.locator("#fm-body")).not.toContainText("登入後就能用對話買魚、賣魚。");
});

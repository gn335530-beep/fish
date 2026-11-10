/* 商品卡照片框：首頁與商品列表都必須是 3:2，且照片完整顯示。 */

const { test, expect } = require("@playwright/test");
const { expectNoHorizontalOverflow } = require("../helpers/layout");
const { installMarketFixture } = require("../helpers/market-fixture");
const { useTestApi } = require("../helpers/test-api");
const {
  waitForProductCards,
  markCardWithLoadedPhoto,
  expectPhotoFrameRatio
} = require("../helpers/product-card");

const PAGES = [
  { name: "首頁", path: "/pages/index.html", selector: "#today-catch" },
  { name: "商品列表", path: "/pages/products.html", selector: "#catch-grid" }
];

test.beforeEach(async function ({ page }) {
  await useTestApi(page);
  await installMarketFixture(page);
});

PAGES.forEach(function (target) {
  test(target.name + "的商品卡照片框為 3:2，照片完整顯示", async function ({ page }) {
    await page.goto(target.path);
    await waitForProductCards(page, target.selector);
    await expectNoHorizontalOverflow(page);
    await expectPhotoFrameRatio(page, target.selector);

    const card = await markCardWithLoadedPhoto(page, target.selector);
    await expect(card).toHaveCount(1);
    await expect(card.locator(".card__media")).toHaveScreenshot(
      "product-card-frame-" + (target.name === "首頁" ? "home" : "products") + ".png"
    );
  });
});

/* 商品卡照片框：首頁與商品列表都必須是 3:2，且照片完整顯示。 */

const { test, expect } = require("@playwright/test");
const { VISUAL_BASELINE } = require("../config");
const { expectNoHorizontalOverflow, waitForFonts } = require("../helpers/layout");
const { preparePage } = require("../helpers/prepare-page");
const {
  waitForProductCards,
  markCardWithLoadedPhoto,
  expectPhotoFrameRatio
} = require("../helpers/product-card");

const PAGES = [
  {
    name: "首頁",
    path: "/pages/index.html",
    selector: "#today-catch",
    snapshot: "product-card-frame-home.png"
  },
  {
    name: "商品列表",
    path: "/pages/products.html",
    selector: "#catch-grid",
    snapshot: "product-card-frame-products.png"
  }
];

test.beforeEach(async function ({ page }) {
  await preparePage(page);
});

PAGES.forEach(function (target) {
  test(target.name + "的商品卡照片框為 3:2，照片完整顯示", async function ({ page }) {
    await page.goto(target.path);
    await waitForProductCards(page, target.selector);
    await expectNoHorizontalOverflow(page);
    await expectPhotoFrameRatio(page, target.selector);

    if (VISUAL_BASELINE) {
      await waitForFonts(page);
      const card = await markCardWithLoadedPhoto(page, target.selector);
      await expect(card).toHaveCount(1);
      await expect(card.locator(".card__media")).toHaveScreenshot(target.snapshot);
    }
  });
});

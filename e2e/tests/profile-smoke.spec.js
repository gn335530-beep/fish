/* 個人資訊與設定 smoke：公開頁可讀、自己的頁面連到設定、未登入設定會被導到登入。 */

const { test, expect } = require("@playwright/test");
const { loginAsSeller, loginAsBuyer } = require("../helpers/auth");
const { expectNoHorizontalOverflow } = require("../helpers/layout");
const { preparePage } = require("../helpers/prepare-page");

test.beforeEach(async function ({ page }) {
  await preparePage(page);
});

test("未登入可看公開個人資訊，且不顯示電話與地址", async function ({ page }) {
  await page.goto("/pages/profile.html?id=1");
  await expect(page.locator(".profile-head__name")).toContainText("陳阿海");
  await expect(page.locator("#profile-head")).toContainText("新北市");
  await expect(page.locator("#profile-head")).toContainText("成交 7 筆");
  await expect(page.locator("#profile-head")).toContainText("買家給的評價");
  await expect(page.locator("#profile-head")).toContainText("釣客給的評價");
  await expect(page.locator("#profile-head")).not.toContainText("0912345678");
  await expect(page.locator("#profile-head")).not.toContainText("瑞芳區");
  await expect(page.locator("[data-start-room]")).toHaveText("聊聊");
  await expect(page.locator(".profile-head__avatar img")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.locator("[data-start-room]").click();
  await expect(page).toHaveURL(/\/pages\/login\.html$/);
});

test("登入後自己的個人資訊顯示設定入口、商品與評價", async function ({ page }) {
  await loginAsSeller(page);
  await page.goto("/pages/profile.html?id=1");
  await expect(page.locator(".profile-actions a")).toHaveText("編輯個人資訊");
  await expect(page.locator("#profile-head [data-start-room]")).toHaveCount(0);
  await expect(page.locator("#profile-products .catch-card").first()).toBeVisible();
  await expect(page.locator("#profile-products")).toContainText("管理商品");
  await expect(page.locator("#profile-reviews .profile-review__card").first()).toBeVisible();
  await expect(page.locator("#profile-reviews")).toContainText("買家給的評價");
  await expect(page.locator("#profile-reviews [data-review-role='buyer']")).toBeVisible();
  await page.locator("#profile-reviews [data-review-role='buyer']").click();
  await expect(page.locator("#profile-reviews [data-review-role='buyer']")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#profile-reviews .profile-review__card")).toHaveCount(1);

  await page.locator(".profile-actions a").click();
  await expect(page).toHaveURL(/\/pages\/settings\.html$/);
  await expect(page.locator("#set-name")).toHaveValue("陳阿海");
  await expect(page.locator("#set-phone")).toHaveValue("0912345678");
  await expect(page.locator("#set-city")).toHaveValue("新北市");
  await expect(page.locator("#avatar-preview img")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("別人的頁面按聊聊會開交易房；無商品的房間不顯示浮動購物車", async function ({ page }) {
  await loginAsBuyer(page);
  await page.goto("/pages/profile.html?id=3");
  await expect(page.locator("[data-start-room]")).toBeVisible();
  await page.locator("[data-start-room]").click();
  await expect(page.locator("#fm-panel")).toBeVisible();
  await expect(page.locator("#fm-title")).toHaveText("hi");
  await expect(page.locator("#fm-body")).toContainText("已開啟對話。");
  await expect(page.locator("#fm-body .fm-deal-strip")).toHaveCount(0);
});

test("自己的商品可從個人資訊下架並重新上架，卡片留在原位", async function ({ page }) {
  await loginAsSeller(page);
  const productId = await page.evaluate(async function () {
    const response = await window.HaisenAPI.request("/api/products/create", {
      method: "POST",
      auth: true,
      body: {
        fish_species: "測試魚",
        quantity: 2,
        condition: "活體",
        price: 100,
        photo_url: "/uploads/amberjack.png"
      }
    });
    return response.data.id;
  });

  try {
    await page.goto("/pages/profile.html?id=1");
    await page.locator("[data-profile-manage]").click();
    await expect(page.locator("[data-profile-manage]")).toHaveText("完成");

    const card = page.locator("#profile-products .catch-card").filter({
      has: page.locator("[data-product-id='" + productId + "']")
    }).first();
    page.once("dialog", function (dialog) { dialog.accept(); });
    await page.locator("[data-product-id='" + productId + "'][data-profile-action='delist']").click();
    await expect(card.locator(".listing__badge")).toHaveText("已下架");
    await expect(page.locator("[data-product-id='" + productId + "'][data-profile-action='relist']")).toBeVisible();

    await page.locator("[data-product-id='" + productId + "'][data-profile-action='relist']").click();
    await expect(card.locator(".listing__badge")).toHaveText("上架中");
  } finally {
    await page.evaluate(async function (id) {
      await window.HaisenAPI.request("/api/products/" + encodeURIComponent(id) + "/delist", {
        method: "POST", auth: true
      });
      await window.HaisenAPI.request("/api/products/" + encodeURIComponent(id), {
        method: "DELETE", auth: true
      });
    }, productId).catch(function () {});
  }
});

test("未登入開啟設定頁會被導到登入頁", async function ({ page }) {
  await page.goto("/pages/settings.html");
  await expect(page).toHaveURL(/\/pages\/login\.html$/);
});

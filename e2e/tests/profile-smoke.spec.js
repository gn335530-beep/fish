/* 個人資訊與設定 smoke：公開頁可讀、自己的頁面連到設定、未登入設定會被導到登入。 */

const { test, expect } = require("@playwright/test");
const { loginAsSeller } = require("../helpers/auth");
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
  await expect(page.locator("#profile-head")).not.toContainText("聊聊");
  await expect(page.locator(".profile-head__avatar img")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("登入後自己的個人資訊顯示設定入口，設定頁欄位已載入", async function ({ page }) {
  await loginAsSeller(page);
  await page.goto("/pages/profile.html?id=1");
  await expect(page.locator(".profile-actions a")).toHaveText("編輯個人資訊");
  await page.locator(".profile-actions a").click();
  await expect(page).toHaveURL(/\/pages\/settings\.html$/);
  await expect(page.locator("#set-name")).toHaveValue("陳阿海");
  await expect(page.locator("#set-phone")).toHaveValue("0912345678");
  await expect(page.locator("#set-city")).toHaveValue("新北市");
  await expect(page.locator("#avatar-preview img")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("未登入開啟設定頁會被導到登入頁", async function ({ page }) {
  await page.goto("/pages/settings.html");
  await expect(page).toHaveURL(/\/pages\/login\.html$/);
});

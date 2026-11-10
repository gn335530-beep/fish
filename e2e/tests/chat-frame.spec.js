/* 聊天面板外殼：三個頁面共用同一組尺寸與 skin，交易房仍以面板取代商品條。 */

const { test, expect } = require("@playwright/test");
const { loginAsBuyer } = require("../helpers/auth");
const { expectNoHorizontalOverflow } = require("../helpers/layout");
const { preparePage } = require("../helpers/prepare-page");

const PAGES = [
  { name: "首頁", path: "/pages/index.html" },
  { name: "商品列表", path: "/pages/products.html" },
  { name: "登入頁", path: "/pages/login.html" }
];

function shellStyles() {
  function pick(selector, properties, withRect) {
    const node = document.querySelector(selector);
    const style = getComputedStyle(node);
    const result = {};
    if (withRect) {
      const rect = node.getBoundingClientRect();
      result.width = Math.round(rect.width);
      result.height = Math.round(rect.height);
    }
    properties.forEach(function (property) {
      result[property] = style[property];
    });
    return result;
  }

  return {
    panel: pick("#fm-panel", ["borderRadius", "backgroundColor", "boxShadow", "display", "overflow"], true),
    head: pick(".fm-panel__head", ["display", "padding", "backgroundColor", "borderBottom"]),
    body: pick(".fm-panel__body", ["padding", "backgroundColor", "overflowY"]),
    foot: pick(".fm-panel__foot", ["padding", "backgroundColor"])
  };
}

test.beforeEach(async function ({ page }) {
  await preparePage(page);
});

test("首頁、商品列表與登入頁的面板外殼一致", async function ({ page }) {
  const shells = [];

  for (const target of PAGES) {
    await page.goto(target.path);
    const toggle = page.locator("#fm-toggle");
    await expect(toggle, target.name + " 應有開啟鈕").toBeVisible();
    await toggle.click();

    const panel = page.locator("#fm-panel");
    await expect(panel, target.name + " 面板應開啟").toBeVisible();
    shells.push(await page.evaluate(shellStyles));
    await expectNoHorizontalOverflow(page);

    await page.locator('#fm-panel [data-action="close"]').click();
    await expect(panel, target.name + " 面板應關閉").toBeHidden();
  }

  shells.slice(1).forEach(function (shell, index) {
    expect(shell, PAGES[index + 1].name + " 與首頁一致").toEqual(shells[0]);
  });

  const mobile = page.viewportSize().width <= 760;
  expect(shells[0].panel.borderRadius).toBe(mobile ? "0px" : "27px 24px 30px 26px");
  expect(shells[0].panel.width).toBe(mobile ? page.viewportSize().width : 400);
});

test("交易房沿用同一外殼，發送交易與加購面板會取代商品條", async function ({ page }) {
  await page.goto("/pages/products.html");
  await page.locator("#fm-toggle").click();
  const pageShell = await page.evaluate(shellStyles);
  await page.locator('#fm-panel [data-action="close"]').click();

  await loginAsBuyer(page);
  await page.goto("/pages/products.html");

  const buy = page.locator("[data-deal-product]").first();
  await expect(buy).toBeVisible();
  await buy.click();

  await expect(page.locator("#fm-panel")).toBeVisible();
  expect(await page.evaluate(shellStyles), "交易房外殼與一般頁面一致").toEqual(pageShell);

  const strip = page.locator(".fm-deal-strip");
  await expect(strip).toBeVisible();

  await page.locator('[data-action="toggle-addon"]').click();
  await expect(strip).toBeHidden();
  await expect(page.locator(".fm-deal-sheet--addon")).toBeVisible();
  await page.locator('[data-action="addon-cancel"]').click();
  await expect(strip).toBeVisible();

  await page.locator('[data-action="toggle-propose"]').click();
  await expect(strip).toBeHidden();
  await expect(page.locator(".fm-deal-sheet--propose")).toBeVisible();
});

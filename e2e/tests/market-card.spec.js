/* 行情卡價格幾何與重量試算：7／30 日、短／長價格。 */

const { test, expect } = require("@playwright/test");
const { VISUAL_BASELINE } = require("../config");
const { QUOTE } = require("../fixtures/market");
const { waitForFonts } = require("../helpers/layout");
const { preparePage } = require("../helpers/prepare-page");
const { openMarketCardPage, renderMarketCard } = require("../helpers/market-card-page");

const CASES = [
  { days: 7, price: 200, key: "7-short" },
  { days: 7, price: 1285.5, key: "7-long" },
  { days: 30, price: 200, key: "30-short" },
  { days: 30, price: 1285.5, key: "30-long" }
];

test.beforeEach(async function ({ page }) {
  await preparePage(page);
  await openMarketCardPage(page);
  await waitForFonts(page);
});

CASES.forEach(function (target) {
  test(target.days + " 日、" + target.key + " 價格不與單位重疊且不超出卡片", async function ({ page }, testInfo) {
    const card = Object.assign({}, QUOTE, { price_per_taijin: target.price });
    await renderMarketCard(page, card, target.days);

    const geometry = await page.evaluate(function () {
      const node = document.querySelector(".fm-card--market");
      const price = node.querySelector(".fm-market__price");
      const unit = node.querySelector(".fm-market__price-unit");
      const cardBox = node.getBoundingClientRect();
      const priceBox = price.getBoundingClientRect();
      const unitBox = unit.getBoundingClientRect();
      const dateBox = node.querySelector(".fm-market__date").getBoundingClientRect();
      const sourceBox = node.querySelector(".fm-market__source").getBoundingClientRect();
      const style = getComputedStyle(price);
      return {
        card: { left: cardBox.left, right: cardBox.right, top: cardBox.top, bottom: cardBox.bottom, width: cardBox.width, height: cardBox.height },
        price: { left: priceBox.left, right: priceBox.right, top: priceBox.top, bottom: priceBox.bottom },
        unit: { left: unitBox.left },
        date: { left: dateBox.left, right: dateBox.right, top: dateBox.top, bottom: dateBox.bottom },
        source: { left: sourceBox.left, right: sourceBox.right, top: sourceBox.top, bottom: sourceBox.bottom },
        fontSize: style.fontSize,
        matrixD: new DOMMatrix(style.transform).d,
        horizontal: price.style.getPropertyValue("--price-scale"),
        vertical: price.style.getPropertyValue("--price-scale-y")
      };
    });

    expect(geometry.price.right, "價格不與元/台斤重疊").toBeLessThanOrEqual(geometry.unit.left + 1);
    expect(geometry.price.left, "價格不超出卡片左緣").toBeGreaterThanOrEqual(geometry.card.left - 1);
    expect(geometry.price.right, "價格不超出卡片右緣").toBeLessThanOrEqual(geometry.card.right + 1);
    expect(geometry.price.top, "價格不超出卡片上緣").toBeGreaterThanOrEqual(geometry.card.top - 1);
    expect(geometry.price.bottom, "價格不超出卡片下緣").toBeLessThanOrEqual(geometry.card.bottom + 1);
    expect(geometry.fontSize, "字級維持 48px").toBe("48px");
    expect(geometry.date.top, "交易日期在卡片下半部").toBeGreaterThan(geometry.card.top + geometry.card.height * 0.5);
    expect(geometry.source.top, "來源固定在卡片底部區域").toBeGreaterThan(geometry.card.top + geometry.card.height * 0.85);
    expect(geometry.source.right, "來源固定在右側").toBeGreaterThan(geometry.card.left + geometry.card.width * 0.5);
    expect(geometry.date.bottom, "日期在來源上方").toBeLessThanOrEqual(geometry.source.top + 1);

    await expect(page.locator(".fm-market__label")).toHaveText("近" + target.days + "個交易日");
    await expect(page.locator(".fm-market__date")).toHaveText("2026-10-22");
    await expect(page.locator(".fm-market__source")).toHaveText("資料來源：農業部 漁業署");

    if (VISUAL_BASELINE && testInfo.project.name === "desktop") {
      await expect(page.locator(".fm-card--market")).toHaveScreenshot("market-card-" + target.key + ".png");
    }

    expect(Number(geometry.horizontal), "水平縮放由渲染輸出").not.toBeNaN();
    expect(Number(geometry.vertical), "垂直縮放由渲染輸出").toBeCloseTo(0.9, 5);
    expect(geometry.matrixD, "實際垂直縮放為 0.9").toBeCloseTo(0.9, 5);
  });
});

test("重量試算與台斤／公斤切換仍可互動", async function ({ page }) {
  await renderMarketCard(page, QUOTE, 7);
  const weight = page.locator('[data-market-weight="fixture"]');
  const reference = page.locator('[data-market-ref="fixture"]');

  await weight.fill("2");
  await expect(reference).toHaveText("NT$400");

  await page.locator('label.fm-market__unit-btn:has(input[value="kg"])').click();
  await expect(reference).toHaveText("NT$667");
});

test("沒有 inline style 的舊 markup 仍有 .9 垂直縮放", async function ({ page }) {
  await page.evaluate(function () {
    window.renderLegacyMarketPrice();
  });
  const scaleY = await page.locator("#legacy-price").evaluate(function (node) {
    return new DOMMatrix(getComputedStyle(node).transform).d;
  });
  expect(scaleY).toBeCloseTo(0.9, 5);
});

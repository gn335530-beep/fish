/* 商品卡照片框：首頁與商品列表共用同一張卡，量測使用者看到的比例。 */

const { expect } = require("@playwright/test");

async function waitForProductCards(page, selector) {
  const cards = page.locator(selector + " .catch-card");
  await expect(cards.first()).toBeVisible();
  await page.waitForFunction(function (sel) {
    const images = Array.prototype.slice.call(
      document.querySelectorAll(sel + " .catch-card img")
    );
    return images.length > 0 && images.every(function (img) { return img.complete; });
  }, selector);
}

async function markCardWithLoadedPhoto(page, selector) {
  await page.evaluate(function (sel) {
    const cards = Array.prototype.slice.call(
      document.querySelectorAll(sel + " .catch-card")
    );
    const card = cards.find(function (node) {
      const img = node.querySelector("img.catch-card__photo");
      return img && img.complete && img.naturalWidth > 0;
    });
    if (card) card.setAttribute("data-e2e-photo-card", "true");
  }, selector);
  return page.locator('[data-e2e-photo-card="true"]');
}

async function expectPhotoFrameRatio(page, selector) {
  const result = await page.evaluate(function (sel) {
    const cards = Array.prototype.slice.call(
      document.querySelectorAll(sel + " .catch-card")
    );
    for (const card of cards) {
      const img = card.querySelector("img.catch-card__photo");
      if (!img || !img.complete || img.naturalWidth === 0) continue;
      const media = card.querySelector(".card__media");
      const frame = media.getBoundingClientRect();
      const photo = img.getBoundingClientRect();
      return {
        ratio: frame.width / frame.height,
        objectFit: getComputedStyle(img).objectFit,
        inside: photo.left >= frame.left - 1 && photo.top >= frame.top - 1 &&
          photo.right <= frame.right + 1 && photo.bottom <= frame.bottom + 1
      };
    }
    return null;
  }, selector);

  expect(result, "至少一張商品照片已載入").not.toBeNull();
  expect(Math.abs(result.ratio - 3 / 2), "照片框比例為 3:2").toBeLessThan(0.02);
  expect(result.objectFit, "照片以 contain 完整顯示").toBe("contain");
  expect(result.inside, "照片不得超出照片框").toBe(true);
}

module.exports = {
  waitForProductCards: waitForProductCards,
  markCardWithLoadedPhoto: markCardWithLoadedPhoto,
  expectPhotoFrameRatio: expectPhotoFrameRatio
};

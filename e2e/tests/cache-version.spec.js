/* 樣式快取：三個頁面的本地 CSS／JS entry 都要帶版本、同檔一致且只遞增。 */

const { test, expect } = require("@playwright/test");
const { preparePage } = require("../helpers/prepare-page");

const PAGES = [
  { name: "首頁", path: "/pages/index.html" },
  { name: "商品列表", path: "/pages/products.html" },
  { name: "個人資訊", path: "/pages/profile.html?id=1" },
  { name: "登入頁", path: "/pages/login.html" }
];
const ALL_PAGES = ["首頁", "商品列表", "登入頁"];

const CACHE_LOCKED_FILES = [
  { file: "layout.css", minVersion: 9, pages: ALL_PAGES },
  { file: "product-card-photo.css", minVersion: 13, pages: ["首頁", "商品列表"] },
  /* 設定頁需要登入，未納入快取檢查；其餘公開頁都鎖定。 */
  { file: "05-product-view.js", minVersion: 14, pages: ["首頁", "商品列表", "個人資訊"] },
  { file: "chat-frame.css", minVersion: 3, pages: ALL_PAGES },
  { file: "chat-frame-content.css", minVersion: 1, pages: ALL_PAGES },
  { file: "chat-bubbles.css", minVersion: 4, pages: ALL_PAGES },
  { file: "deal-bot.css", minVersion: 9, pages: ALL_PAGES },
  { file: "market-card.css", minVersion: 17, pages: ALL_PAGES },
  { file: "components.css", minVersion: 9, pages: ALL_PAGES },
  { file: "deal-cards.css", minVersion: 9, pages: ALL_PAGES }
];

function localAssets() {
  const nodes = Array.prototype.slice.call(
    document.querySelectorAll('link[rel="stylesheet"][href], script[src]')
  );
  return nodes.map(function (node) {
    const raw = node.getAttribute("href") || node.getAttribute("src");
    const url = new URL(raw, window.location.href);
    return { path: url.pathname, version: url.searchParams.get("v") };
  }).filter(function (asset) {
    return asset.path.indexOf("/assets/") === 0;
  });
}

function versionOf(assets, file) {
  const found = assets.find(function (asset) {
    return asset.path.slice(-("/" + file).length) === "/" + file;
  });
  return found ? found.version : null;
}

function versionNumber(version) {
  return Number(String(version || "").slice(1));
}

test.beforeEach(async function ({ page }) {
  await preparePage(page);
});

test("本地 CSS／JS entry 版本完整、跨頁一致且只遞增", async function ({ page }) {
  const assetsByPage = {};

  for (const target of PAGES) {
    await page.goto(target.path);
    const assets = await page.evaluate(localAssets);
    expect(assets.length, target.name + " 應載入本地 CSS／JS").toBeGreaterThan(0);
    assets.forEach(function (asset) {
      expect(asset.version, target.name + " 的 " + asset.path + " 應帶 ?v=").toMatch(/^v\d+$/);
    });
    assetsByPage[target.name] = assets;
  }

  const paths = new Set();
  Object.values(assetsByPage).forEach(function (assets) {
    assets.forEach(function (asset) { paths.add(asset.path); });
  });
  paths.forEach(function (path) {
    const versions = Object.values(assetsByPage).map(function (assets) {
      const found = assets.find(function (asset) { return asset.path === path; });
      return found ? found.version : null;
    }).filter(Boolean);
    expect(new Set(versions).size, path + " 在不同頁面應使用相同版本").toBe(1);
  });

  CACHE_LOCKED_FILES.forEach(function (entry) {
    const versions = entry.pages.map(function (pageName) {
      return versionOf(assetsByPage[pageName], entry.file);
    });
    versions.forEach(function (version, index) {
      expect(version, entry.pages[index] + " 應載入 " + entry.file + " 且帶版本").toMatch(/^v\d+$/);
    });
    expect(new Set(versions).size, entry.file + " 在指定頁面版本應一致").toBe(1);
    expect(versionNumber(versions[0]), entry.file + " 版本只遞增且不得低於 v" + entry.minVersion)
      .toBeGreaterThanOrEqual(entry.minVersion);
  });
});

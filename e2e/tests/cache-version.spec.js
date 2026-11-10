/* 樣式快取：三個頁面的本地 CSS／JS entry 都要帶版本，且同檔版本一致。 */

const { test, expect } = require("@playwright/test");
const { preparePage } = require("../helpers/prepare-page");

const PAGES = [
  { name: "首頁", path: "/pages/index.html" },
  { name: "商品列表", path: "/pages/products.html" },
  { name: "登入頁", path: "/pages/login.html" }
];

const MODIFIED_MODULES = [
  { file: "layout.css", old: "v8" },
  { file: "product-card-photo.css", old: "v12" },
  { file: "chat-frame.css", old: "v2" },
  { file: "chat-frame-content.css", old: null },
  { file: "chat-bubbles.css", old: "v3" },
  { file: "deal-bot.css", old: "v8" },
  { file: "market-card.css", old: "v16" },
  { file: "components.css", old: "v8" },
  { file: "deal-cards.css", old: "v8" }
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

test.beforeEach(async function ({ page }) {
  await preparePage(page);
});

test("本地 CSS／JS entry 都有 ?v=，同檔在三個頁面版本一致", async function ({ page }) {
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
});

test("本批修改的樣式模組已提版且三頁一致", async function ({ page }) {
  const assetsByPage = {};

  for (const target of PAGES) {
    await page.goto(target.path);
    assetsByPage[target.name] = await page.evaluate(localAssets);
  }

  MODIFIED_MODULES.forEach(function (module) {
    const versions = Object.values(assetsByPage).map(function (assets) {
      const found = assets.find(function (asset) {
        return asset.path.indexOf("/" + module.file) !== -1;
      });
      return found ? found.version : null;
    }).filter(Boolean);

    expect(versions.length, module.file + " 應在至少一個頁面載入").toBeGreaterThan(0);
    expect(new Set(versions).size, module.file + " 三頁版本應一致").toBe(1);
    if (module.old) {
      expect(versions[0], module.file + " 不應沿用舊版 " + module.old).not.toBe(module.old);
    }
  });
});

/* API 呼叫歸位：products／market 實作只在 assets/js/api/，呼叫端直接指向它。 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

function read(path) {
  return fs.readFileSync(new URL(path, import.meta.url), "utf8");
}

const demoApi = read("../assets/js/demo/api.js");
const productsApi = read("../assets/js/api/products.js");
const marketApi = read("../assets/js/api/market.js");

const CALLERS = [
  "../assets/js/demo/flow.js",
  "../assets/js/demo/deal-order-actions.js",
  "../assets/js/demo/ai/service.js",
  "../assets/js/demo/ai/shopping.js",
  "../assets/js/demo/ai/market.js",
  "../assets/js/demo/ai/listing-market.js"
];

test("demo/api.js 不再實作 products 或 market 請求", function () {
  assert.doesNotMatch(demoApi, /export function (listProducts|getProduct|createProduct|getMarketPrice)/);
  assert.doesNotMatch(demoApi, /\/api\/products|\/api\/market\/prices/);
});

test("api/products.js 與 api/market.js 提供請求函式", function () {
  assert.match(productsApi, /export function listProducts/);
  assert.match(productsApi, /export function getProduct/);
  assert.match(productsApi, /export function createProduct/);
  assert.match(productsApi, /Object\.assign\(window\.HaisenAPI/);
  assert.match(marketApi, /export function getMarketPrice/);
});

test("products／market 呼叫端都 import assets/js/api/", function () {
  CALLERS.forEach(function (path) {
    const source = read(path);
    assert.match(source, /from "(?:\.\.\/)+api\/(?:products|market)\.js"/, path);
  });
});

test("頁面以 module 載入 products API，並在 DOM ready 後才呼叫", function () {
  ["index.html", "products.html", "product-detail.html"].forEach(function (page) {
    assert.match(read("../pages/" + page), /type="module" src="\.\.\/assets\/js\/api\/products\.js/);
  });
  assert.match(read("../assets/js/pages/index.js"), /DOMContentLoaded/);
  assert.match(read("../assets/js/pages/products.js"), /DOMContentLoaded/);
  assert.match(read("../assets/js/pages/product-detail.js"), /DOMContentLoaded/);
});

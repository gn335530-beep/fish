/* 商品生命週期測試共用：重置資料、建立商品與呼叫生命週期端點。 */

const assert = require("node:assert/strict");
const { setAll } = require("../lib/store");
const { call, tokens } = require("./client");
const { create } = require("./product-helpers");

function resetLifecycleData() {
  ["products", "deals", "conversations", "messages", "reviews", "counters"].forEach(function (name) {
    setAll(name, []);
  });
}

async function createProduct(overrides) {
  const result = await create(overrides);
  assert.equal(result.status, 201, JSON.stringify(result.body));
  return result.body.data;
}

function delist(productId, token) {
  return call("POST", "/api/products/" + productId + "/delist", {
    token: token || tokens.seller
  });
}

function relist(productId, token) {
  return call("POST", "/api/products/" + productId + "/relist", {
    token: token || tokens.seller
  });
}

function removeProduct(productId, token) {
  return call("DELETE", "/api/products/" + productId, {
    token: token || tokens.seller
  });
}

module.exports = {
  resetLifecycleData: resetLifecycleData,
  createProduct: createProduct,
  delist: delist,
  relist: relist,
  removeProduct: removeProduct
};

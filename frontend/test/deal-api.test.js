/* 洽談購買 API：每次都以本次商品取代草稿，避免舊商品留在交易房。 */

import test from "node:test";
import assert from "node:assert/strict";

let seen = null;

globalThis.window = {
  HaisenAPI: {
    request: async function (path, options) {
      seen = { path: path, options: options };
      return { data: { conversation: { id: "conv_1" } } };
    }
  }
};

const api = await import("../assets/js/demo/api.js");

test("洽談購買送出 replace_items，讓交易房只保留本次商品", async function () {
  const result = await api.initiateChannel("prd_1", 2);
  assert.equal(result.conversation.id, "conv_1");
  assert.equal(seen.path, "/api/deals/initiate-channel");
  assert.equal(seen.options.method, "POST");
  assert.equal(seen.options.body.product_id, "prd_1");
  assert.equal(seen.options.body.quantity, 2);
  assert.equal(seen.options.body.replace_items, true);
});

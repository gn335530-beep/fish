/* 洽談購買 API：加入或累加草稿，不清空其他商品。 */

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

test("洽談購買不送取代旗標，讓草稿加入或累加", async function () {
  const result = await api.initiateChannel("prd_1", 2);
  assert.equal(result.conversation.id, "conv_1");
  assert.equal(seen.path, "/api/deals/initiate-channel");
  assert.equal(seen.options.method, "POST");
  assert.equal(seen.options.body.product_id, "prd_1");
  assert.equal(seen.options.body.quantity, 2);
  assert.equal("replace_items" in seen.options.body, false);
});

/* 商品工具：只回公開商品、最多 5 筆、預設縣市、不含地址，且推薦卡只來自工具結果。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, call, tokens } = require("./client");
const h = require("./ai-reply-helpers");
const { patch } = require("../lib/store");
const { create } = require("./product-helpers");

function finalOutput(overrides) {
  return {
    text: JSON.stringify(Object.assign({
      intent: "PRODUCT_RECOMMEND",
      slots: {},
      reply_text: "找到符合條件的商品。",
      sources: [],
      tool_results: {}
    }, overrides || {}))
  };
}

function searchCall(args) {
  return { name: "search_products", args: args || {} };
}

async function askRoom(text) {
  const room = await h.createRoom(tokens.buyer);
  const message = await h.sendUser(room.id, text || "想找適合乾煎的魚");
  return { room: room, message: message };
}

test.before(start);
test.after(stop);
test.beforeEach(function () { h.reset(); });

test("商品工具只回公開商品、最多 5 筆且不含地址", async function () {
  patch("products", "prd_a", { location: "新北市瑞芳區鼻頭路 1 號" });
  await create({ fish_species: "石斑", quantity: 1, price: 1200, region: "新北市", photo_url: "/uploads/s1.jpg" });
  await create({ fish_species: "石斑", quantity: 1, price: 1300, region: "新北市", photo_url: "/uploads/s2.jpg" });
  await create({ fish_species: "石斑", quantity: 1, price: 1400, region: "新北市", photo_url: "/uploads/s3.jpg" });
  await create({ fish_species: "石斑", quantity: 1, price: 1500, region: "新北市", photo_url: "/uploads/s4.jpg" });
  await call("POST", "/api/products/prd_b/delist", { token: tokens.seller });

  h.useSequence([
    { tool_calls: [searchCall({ species: "石斑" })] },
    finalOutput()
  ]);
  const run = await askRoom();
  const data = (await h.reply(run.room.id, run.message.id)).body.data;
  const products = data.tool_results.products;

  assert.equal(data.handled, true, JSON.stringify(data));
  assert.equal(products.length, 5);
  assert.equal(products.some(function (product) { return product.id === "prd_b"; }), false);
  const serialized = JSON.stringify(products);
  assert.doesNotMatch(serialized, /鼻頭路|location|phone|address|username/);
  assert.equal(h.calls[1].tool_turns[0].result.region, "新北市");
});

test("PRODUCT_RECOMMEND 的文字與商品只來自工具結果", async function () {
  h.useSequence([
    { tool_calls: [searchCall({ species: "花枝", region: "新北市" })] },
    finalOutput({ reply_text: "花枝肉質緊實，適合乾煎，推薦這批。" })
  ]);
  const run = await askRoom("想找適合乾煎的花枝");

  const data = (await h.reply(run.room.id, run.message.id)).body.data;
  assert.equal(data.handled, true);
  assert.equal(data.intent, "PRODUCT_RECOMMEND");
  assert.equal(data.tool_results.products.length, 1);
  assert.equal(data.tool_results.products[0].id, "prd_c");
  assert.equal(data.sources.length, 0);
  assert.match(data.reply_text, /乾煎/);
  assert.match(data.reply_text, /新北市/);
});

test("模型改寫商品價格或庫存時被 guard 拒絕", async function () {
  h.useSequence([
    { tool_calls: [searchCall({ species: "石斑", region: "新北市" })] },
    finalOutput({ reply_text: "石斑整批只要 999 元。" })
  ]);
  const run = await askRoom("想找石斑");

  const data = (await h.reply(run.room.id, run.message.id)).body.data;
  assert.equal(data.handled, false);
  assert.equal(data.error_code, "LLM_GUARD_REJECTED");
});

test("沒有呼叫商品工具卻回 PRODUCT_RECOMMEND 時 fallback", async function () {
  h.useSequence([finalOutput()]);
  const run = await askRoom("想找石斑");

  const data = (await h.reply(run.room.id, run.message.id)).body.data;
  assert.equal(data.handled, false);
  assert.equal(data.error_code, "LLM_GUARD_REJECTED");
});

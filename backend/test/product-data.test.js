/* 既有資料修正：移除示意行情，舊「冷凍」商品與其上架訊息改成「放血冰鎮」。 */

const test = require("node:test");
const assert = require("node:assert/strict");
require("./client");

const { all, setAll } = require("../lib/store");
const { normalizeProductData } = require("../lib/product-data");

function fixture() {
  setAll("products", [{
    id: "prd_migrate",
    seller_id: 4,
    title: "花枝（3kg / 2尾 / 冷凍）",
    fish_species: "花枝",
    species_id: "cuttlefish",
    weight_kg: 3,
    quantity: 2,
    sold_quantity: 0,
    condition: "冷凍",
    price: 300,
    market_reference_price: 1800
  }, {
    id: "prd_keep",
    seller_id: 1,
    title: "石斑（2kg / 1尾 / 活體）",
    fish_species: "石斑",
    species_id: "grouper",
    weight_kg: 2,
    quantity: 1,
    condition: "活體",
    price: 1000,
    market_reference_price: 2000
  }]);

  setAll("messages", [{
    id: "msg_draft",
    conversation_id: "conv_1",
    text: "",
    card: { type: "draft", draft: { fish_species: "花枝", condition: "冷凍" } }
  }, {
    id: "msg_product",
    conversation_id: "conv_1",
    text: "",
    card: { type: "product", product_id: "prd_migrate", title: "花枝（3kg / 2尾 / 冷凍）", condition: "冷凍" }
  }, {
    id: "msg_listed",
    conversation_id: "conv_1",
    text: "已上架：花枝（3kg / 2尾 / 冷凍）",
    card: null
  }, {
    id: "msg_reply",
    conversation_id: "conv_1",
    text: "冷凍",
    card: null
  }, {
    id: "msg_prompt",
    conversation_id: "conv_1",
    text: "目前的處理方式是？活體、放血冰鎮、三去處理或冷凍。",
    card: null
  }, {
    id: "msg_unrelated",
    conversation_id: "conv_2",
    text: "冷凍",
    card: null
  }, {
    id: "msg_unrelated_draft",
    conversation_id: "conv_3",
    text: "",
    card: { type: "draft", draft: { fish_species: "花枝", weight_kg: 3, quantity: 2, condition: "冷凍" } }
  }]);

  setAll("deals", [{
    id: "deal_keep",
    items: [{ product_id: "prd_migrate", title: "花枝（3kg / 2尾 / 冷凍）" }]
  }]);
}

test("舊冷凍商品、草稿卡、商品卡與上架訊息一起更新", function () {
  fixture();
  normalizeProductData();

  const product = all("products").find(function (row) { return row.id === "prd_migrate"; });
  assert.equal(product.condition, "放血冰鎮");
  assert.equal(product.title, "花枝（3kg / 2尾 / 放血冰鎮）");
  assert.equal("market_reference_price" in product, false);

  const keep = all("products").find(function (row) { return row.id === "prd_keep"; });
  assert.equal(keep.condition, "活體");
  assert.equal(keep.title, "石斑（2kg / 1尾 / 活體）");
  assert.equal("market_reference_price" in keep, false);

  const messages = {};
  all("messages").forEach(function (message) { messages[message.id] = message; });
  assert.equal(messages.msg_draft.card.draft.condition, "放血冰鎮");
  assert.equal(messages.msg_product.card.condition, "放血冰鎮");
  assert.equal(messages.msg_product.card.title, "花枝（3kg / 2尾 / 放血冰鎮）");
  assert.equal(messages.msg_listed.text, "已上架：花枝（3kg / 2尾 / 放血冰鎮）");
  assert.equal(messages.msg_reply.text, "放血冰鎮");
  assert.match(messages.msg_prompt.text, /三去處理或冷凍/);
  assert.equal(messages.msg_unrelated.text, "冷凍");
  assert.equal(messages.msg_unrelated_draft.card.draft.condition, "冷凍");
});

test("已成交訂單中的商品快照不變", function () {
  fixture();
  normalizeProductData();
  const deal = all("deals").find(function (row) { return row.id === "deal_keep"; });
  assert.equal(deal.items[0].title, "花枝（3kg / 2尾 / 冷凍）");
});

test("沒有冷凍商品時只移除示意行情，不硬造資料", function () {
  setAll("products", [{
    id: "prd_only",
    title: "石斑（2kg / 1尾 / 活體）",
    fish_species: "石斑",
    condition: "活體",
    weight_kg: 2,
    quantity: 1,
    price: 1000,
    market_reference_price: 2000
  }]);
  setAll("messages", []);
  normalizeProductData();

  const product = all("products")[0];
  assert.equal(product.condition, "活體");
  assert.equal(product.title, "石斑（2kg / 1尾 / 活體）");
  assert.equal("market_reference_price" in product, false);
  assert.equal(all("messages").length, 0);
});

test("修正後才建立的冷凍商品不會被改寫", function () {
  setAll("products", [{
    id: "prd_new",
    title: "花枝（3kg / 2尾 / 冷凍）",
    fish_species: "花枝",
    condition: "冷凍",
    weight_kg: 3,
    quantity: 2,
    price: 300,
    created_at: "2026-10-28T00:00:00.000Z",
    market_reference_price: 1800
  }]);
  setAll("messages", []);
  normalizeProductData();

  const product = all("products")[0];
  assert.equal(product.condition, "冷凍");
  assert.equal(product.title, "花枝（3kg / 2尾 / 冷凍）");
  assert.equal("market_reference_price" in product, false);
});

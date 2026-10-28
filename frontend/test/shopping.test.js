/* 導購：預設地區、魚種名稱篩選，且不再用料理方式或肉質條件。 */

import test from "node:test";
import assert from "node:assert/strict";

const CATALOG = [
  { species_code: 2201, official_name: "石斑魚", aliases: [] },
  { species_code: 2166, official_name: "花枝", aliases: [] }
];

const PRODUCTS = [
  { id: "p_new1", fish_species: "石斑魚", title: "石斑 A", available: 2, region: "新北市" },
  { id: "p_taipei", fish_species: "石斑魚", title: "石斑 B", available: 3, region: "臺北市" },
  { id: "p_squid", fish_species: "花枝", title: "花枝 C", available: 1, region: "新北市" },
  { id: "p_new2", fish_species: "石斑魚", title: "石斑 D", available: 1, region: "新北市" }
];

globalThis.window = {
  HaisenAPI: {
    listProducts: async function () { return PRODUCTS; },
    request: async function (path) {
      if (path.indexOf("/api/market/codes") === 0) return { data: { query: null, candidates: CATALOG } };
      if (path.indexOf("/api/products") === 0) return { data: PRODUCTS };
      throw new Error("unexpected path: " + path);
    }
  }
};

const { shoppingReply } = await import("../assets/js/demo/ai/shopping.js");

function cardsOf(result) {
  return result.replies.filter(function (reply) { return reply.card; })
    .map(function (reply) { return reply.card.product_id; });
}

function textOf(result) {
  return result.replies.map(function (reply) { return reply.text || ""; }).join("\n");
}

test("沒有明說地區時，以個人檔案縣市為範圍並說明", async function () {
  const result = await shoppingReply("今天有什麼魚", { city: "新北市" });
  assert.deepEqual(cardsOf(result), ["p_new1", "p_squid", "p_new2"]);
  assert.match(textOf(result), /依你的地區（新北市）/);
});

test("明確指定其他縣市時，覆蓋個人檔案縣市", async function () {
  const result = await shoppingReply("新北市有什麼魚", { city: "臺北市" });
  assert.deepEqual(cardsOf(result), ["p_new1", "p_squid", "p_new2"]);
  assert.match(textOf(result), /^新北市找到/);
  assert.doesNotMatch(textOf(result), /依你的地區/);
});

test("個人檔案沒有縣市時改為全省查詢並說明", async function () {
  const result = await shoppingReply("今天有什麼魚", { city: "" });
  assert.deepEqual(cardsOf(result), ["p_new1", "p_taipei", "p_squid", "p_new2"]);
  assert.match(textOf(result), /還沒填縣市.*全省查詢/);
});

test("「附近」不是套用個人檔案縣市的必要條件", async function () {
  const result = await shoppingReply("附近有什麼魚", { city: "台北市" });
  assert.deepEqual(cardsOf(result), ["p_taipei"]);
});

test("預設地區沒有商品時，回覆說明地區", async function () {
  const result = await shoppingReply("屏東縣有什麼魚", { city: "新北市" });
  assert.deepEqual(cardsOf(result), []);
  assert.match(textOf(result), /屏東縣目前沒有符合條件的商品/);
});

test("用魚種名稱篩選商品", async function () {
  const result = await shoppingReply("花枝", { city: "新北市" });
  assert.deepEqual(cardsOf(result), ["p_squid"]);
});

test("料理方式與肉質條件不再影響篩選", async function () {
  const result = await shoppingReply("清蒸 刺少 石斑魚", { city: "" });
  assert.deepEqual(cardsOf(result), ["p_new1", "p_taipei", "p_new2"]);
});

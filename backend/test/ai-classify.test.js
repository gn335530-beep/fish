/* 第一輪工具分類：平台意圖不強制、天氣上網、商品查平台。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { forceToolFor } = require("../lib/ai/classify");

const web = { webEnabled: true };
const noWeb = { webEnabled: false };

test("時效性與天氣問題強制 web_search", function () {
  assert.equal(forceToolFor("今天台南天氣如何？", web), "web_search");
  assert.equal(forceToolFor("最新漁業新聞", web), "web_search");
  assert.equal(forceToolFor("現在氣溫幾度", web), "web_search");
  assert.equal(forceToolFor("今天台南天氣如何？", noWeb), null);
});

test("商品推薦與找魚問題強制 search_products", function () {
  assert.equal(forceToolFor("有什麼適合乾煎、500 元以內的白肉魚？", web), "search_products");
  assert.equal(forceToolFor("我想找石斑", web), "search_products");
  assert.equal(forceToolFor("附近有什麼魚", web), "search_products");
  assert.equal(forceToolFor("推薦一下今天的魚", web), "search_products");
});

test("平台意圖與一般知識不強制工具", function () {
  assert.equal(forceToolFor("我要賣花枝", web), null);
  assert.equal(forceToolFor("今天花枝行情", web), null);
  assert.equal(forceToolFor("花枝多少錢", web), null);
  assert.equal(forceToolFor("吳郭魚口感如何？", web), null);
  assert.equal(forceToolFor("吳郭魚怎麼煎？", web), null);
});

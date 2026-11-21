/* 第一輪強制工具：在地天氣問條件工具、國外與時效性問 web、商品問 products。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop } = require("./client");
const h = require("./ai-reply-helpers");

const CHAT = { intent: "CHAT", slots: {}, reply_text: "好的。", sources: [], tool_results: {} };

test.before(start);
test.after(stop);
test.beforeEach(function () { h.reset(); });

async function ask(text, overrides) {
  h.reset(overrides);
  h.useJson(CHAT);
  const room = await h.createRoom();
  const message = await h.sendUser(room.id, text);
  const result = await h.reply(room.id, message.id);
  assert.equal(result.status, 200);
  return h.calls[0];
}

test("台灣天氣問題第一輪要求在地條件工具", async function () {
  const input = await ask("今天台南天氣如何？", {
    LLM_WEB_SEARCH: true,
    TAVILY_API_KEY: "test"
  });
  assert.deepEqual(input.toolConfig, {
    functionCallingConfig: { mode: "ANY", allowedFunctionNames: ["get_local_conditions"] }
  });
});

test("國外地點天氣第一輪要求 web_search", async function () {
  const input = await ask("東京天氣如何？", {
    LLM_WEB_SEARCH: true,
    TAVILY_API_KEY: "test"
  });
  assert.deepEqual(input.toolConfig, {
    functionCallingConfig: { mode: "ANY", allowedFunctionNames: ["web_search"] }
  });
});

test("商品推薦第一輪要求 search_products", async function () {
  const input = await ask("有什麼適合乾煎、500 元以內的白肉魚？");
  assert.deepEqual(input.toolConfig, {
    functionCallingConfig: { mode: "ANY", allowedFunctionNames: ["search_products"] }
  });
});

test("一般知識與平台意圖不強制工具", async function () {
  const general = await ask("吳郭魚口感如何？");
  assert.equal(general.toolConfig, undefined);
  const platform = await ask("我要賣花枝");
  assert.equal(platform.toolConfig, undefined);
});

test("未開啟網路搜尋時，在地天氣仍強制條件工具", async function () {
  const local = await ask("今天台南天氣如何？");
  assert.deepEqual(local.toolConfig, {
    functionCallingConfig: { mode: "ANY", allowedFunctionNames: ["get_local_conditions"] }
  });
});

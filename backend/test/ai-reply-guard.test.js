/* AI 回覆端點（輸出防護）：意圖 schema、來源格式、平台數字必須有依據。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop } = require("./client");
const h = require("./ai-reply-helpers");

function output(overrides) {
  return Object.assign({
    intent: "CHAT",
    slots: {},
    reply_text: "這是回答。",
    sources: [],
    tool_results: {}
  }, overrides || {});
}

async function ask(text, llmOutput) {
  h.useJson(llmOutput);
  const room = await h.createRoom();
  const message = await h.sendUser(room.id, text);
  const result = await h.reply(room.id, message.id);
  return result.body.data;
}

test.before(start);
test.after(stop);
test.beforeEach(function () { h.reset(); });

test("平台意圖保留 slots，但不產生 reply_text 或來源", async function () {
  const data = await ask("我要賣花枝 2 尾 放血冰鎮", output({
    intent: "SELL",
    slots: { fish_species: "花枝", quantity: 2, condition: "放血冰鎮" },
    reply_text: "我要幫你上架",
    sources: [{ title: "來源", url: "https://example.com/a" }]
  }));
  assert.equal(data.handled, true);
  assert.equal(data.intent, "SELL");
  assert.equal(data.reply_text, null);
  assert.deepEqual(data.sources, []);
  assert.deepEqual(data.slots, { fish_species: "花枝", quantity: 2, condition: "放血冰鎮" });
});

test("模型產生使用者沒說的價格或尾數時回 LLM_GUARD_REJECTED", async function () {
  const priced = await ask("我要賣花枝 2 尾", output({
    intent: "SELL",
    slots: { fish_species: "花枝", quantity: 2, price: 1000 }
  }));
  assert.equal(priced.handled, false);
  assert.equal(priced.error_code, "LLM_GUARD_REJECTED");
  assert.equal(priced.reply_text, null);

  const counted = await ask("我要賣花枝 2 尾", output({
    intent: "SELL",
    slots: { fish_species: "花枝", quantity: 3 }
  }));
  assert.equal(counted.handled, false);
  assert.equal(counted.error_code, "LLM_GUARD_REJECTED");
});

test("一般知識的數字不受平台數字防護影響", async function () {
  const data = await ask("吳郭魚怎麼煎", output({
    reply_text: "建議中火乾煎 3 分鐘，起鍋前靜置 2 分鐘。"
  }));
  assert.equal(data.handled, true);
  assert.equal(data.error_code, null);

  const weight = await ask("吳郭魚可以長多大", output({
    reply_text: "吳郭魚通常可長到 1 公斤左右。"
  }));
  assert.equal(weight.handled, true);
  assert.equal(weight.error_code, null);
});

test("回覆文字宣稱平台價格但不能溯源時丟棄整則回覆", async function () {
  const data = await ask("吳郭魚口感如何", output({
    reply_text: "花枝現在每台斤 999 元，很划算。",
    tool_results: { market: { price_per_taijin: 999 } }
  }));
  assert.equal(data.handled, false);
  assert.equal(data.error_code, "LLM_GUARD_REJECTED");

  const stock = await ask("吳郭魚口感如何", output({
    reply_text: "目前還有 5 尾可以買。"
  }));
  assert.equal(stock.handled, false);
  assert.equal(stock.error_code, "LLM_GUARD_REJECTED");

  const jin = await ask("吳郭魚口感如何", output({
    reply_text: "花枝每斤 999 塊，很划算。"
  }));
  assert.equal(jin.handled, false);
  assert.equal(jin.error_code, "LLM_GUARD_REJECTED");

  const chinese = await ask("吳郭魚口感如何", output({
    reply_text: "花枝每台斤九百元，很划算。"
  }));
  assert.equal(chinese.handled, false);
  assert.equal(chinese.error_code, "LLM_GUARD_REJECTED");

  const sellable = await ask("吳郭魚口感如何", output({
    reply_text: "目前可賣 5"
  }));
  assert.equal(sellable.handled, false);
  assert.equal(sellable.error_code, "LLM_GUARD_REJECTED");

  const bare = await ask("吳郭魚口感如何", output({
    reply_text: "花枝大約 999"
  }));
  assert.equal(bare.handled, false);
  assert.equal(bare.error_code, "LLM_GUARD_REJECTED");
});

test("EDIT 的數字字串也要有使用者訊息依據", async function () {
  const fabricated = await ask("我要賣花枝 2 尾", output({
    intent: "EDIT",
    slots: { edit_field: "price", edit_value: "888" }
  }));
  assert.equal(fabricated.handled, false);
  assert.equal(fabricated.error_code, "LLM_GUARD_REJECTED");

  const grounded = await ask("售價改成 888", output({
    intent: "EDIT",
    slots: { edit_field: "price", edit_value: "888" }
  }));
  assert.equal(grounded.handled, true);
  assert.equal(grounded.slots.edit_value, 888);
});

test("sources 最多 3 個且 URL 必須合法", async function () {
  const valid = await ask("今天天氣如何", output({
    intent: "WEB",
    reply_text: "今天多雲短暫雨。",
    sources: [
      { title: "中央氣象署", url: "https://www.cwa.gov.tw/a" },
      { title: "新聞", url: "https://example.com/b" },
      { title: "第二新聞", url: "https://example.com/c" }
    ]
  }));
  assert.equal(valid.handled, true);
  assert.equal(valid.sources.length, 3);

  const tooMany = await ask("今天天氣如何", output({
    intent: "WEB",
    reply_text: "今天多雲。",
    sources: [1, 2, 3, 4].map(function (i) {
      return { title: "來源" + i, url: "https://example.com/" + i };
    })
  }));
  assert.equal(tooMany.error_code, "LLM_INVALID_OUTPUT");

  const badUrl = await ask("今天天氣如何", output({
    intent: "WEB",
    reply_text: "今天多雲。",
    sources: [{ title: "惡意", url: "javascript:alert(1)" }]
  }));
  assert.equal(badUrl.error_code, "LLM_INVALID_OUTPUT");
});

test("reply_text 超過 500 字或 slots 型別錯誤都不合格", async function () {
  const long = await ask("你好", output({ reply_text: "字".repeat(501) }));
  assert.equal(long.error_code, "LLM_INVALID_OUTPUT");

  const badSlots = await ask("你好", output({ slots: "quantity=2" }));
  assert.equal(badSlots.error_code, "LLM_INVALID_OUTPUT");
});

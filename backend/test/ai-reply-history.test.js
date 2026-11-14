/* AI 回覆端點（歷史與隱私）：只送最近 10 則、卡片摘要、個資遮蔽。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, tokens } = require("./client");
const h = require("./ai-reply-helpers");
const { addMessage } = require("../lib/messages");

const CHAT = {
  intent: "CHAT",
  slots: {},
  reply_text: "這是一般知識回答。",
  sources: [],
  tool_results: {}
};

test.before(start);
test.after(stop);
test.beforeEach(function () { h.reset({ LLM_HISTORY_LIMIT: 30 }); h.useJson(CHAT); });

test("歷史只取最近 10 則使用者／助手訊息，卡片以一行摘要取代", async function () {
  const room = await h.createRoom();
  for (let i = 1; i <= 8; i++) await h.sendUser(room.id, "問題" + i);
  addMessage(room.id, { sender_id: "system", type: "system", text: "系統訊息不送模型" });
  addMessage(room.id, {
    sender_id: tokens.buyer,
    type: "image",
    image_url: "/uploads/photo.jpg",
    text: "照片不送模型"
  });
  await h.sendAi(room.id, {
    card: {
      type: "product",
      product_id: "prd_a",
      fish_species: "花枝",
      quantity: 2,
      price: 1000
    }
  });
  const current = await h.sendUser(room.id, "吳郭魚口感如何");

  const result = await h.reply(room.id, current.id);
  assert.equal(result.body.data.handled, true);
  const input = h.calls[0];
  assert.equal(input.messages.length, 10);
  assert.equal(input.messages[9].text, "吳郭魚口感如何");
  assert.equal(input.messages[9].role, "user");
  assert.equal(input.messages[8].role, "assistant");
  assert.equal(input.messages[8].text, "商品卡：花枝，2 尾，整批 1000 元");

  const serialized = JSON.stringify(input);
  assert.doesNotMatch(serialized, /系統訊息不送模型|照片不送模型/);
  assert.doesNotMatch(serialized, /\/uploads\/photo\.jpg/);
  assert.doesNotMatch(serialized, /"card"|"product_id"/);
});

test("訊息與 context 的電話、Email、身分證與地址先遮蔽再送 provider", async function () {
  const room = await h.createRoom();
  await h.sendUser(
    room.id,
    "我家住新北市瑞芳區鼻頭路 1 號，電話 0912345678，Email me@example.com，身分證 A123456789"
  );
  await h.sendAi(room.id, { text: "收到，我的電話是 0987654321" });
  const current = await h.sendUser(room.id, "吳郭魚口感如何");

  const result = await h.reply(room.id, current.id, tokens.buyer, {
    mode: "listing",
    draft: {
      fish_species: "花枝",
      quantity: 2,
      condition: "放血冰鎮",
      price: 1000,
      price_per_taijin: 200,
      photo_url: "/uploads/secret.jpg"
    },
    last_cards: ["prd_a"],
    selected_product_id: "prd_a",
    phone: "0912345678",
    address: "新北市瑞芳區鼻頭路 1 號"
  });
  assert.equal(result.body.data.handled, true);

  const input = h.calls[0];
  const serialized = JSON.stringify(input);
  assert.doesNotMatch(serialized, /0912345678|0987654321|me@example\.com|A123456789|鼻頭路/);
  assert.match(serialized, /\[已遮蔽\]/);
  assert.equal(input.context.draft.fish_species, "花枝");
  assert.equal(input.context.draft.quantity, 2);
  assert.equal(input.context.draft.photo_url, undefined);
  assert.equal(input.context.last_cards[0].fish_species, "石斑");
  assert.equal(input.context.last_cards[0].photo_url, undefined);
  assert.equal(input.context.phone, undefined);
  assert.doesNotMatch(serialized, /secret\.jpg|avatar_url|username/);
});

test("重試錨定原始訊息：同房已有較新訊息時 provider 仍只看到被重試的訊息", async function () {
  const room = await h.createRoom();
  const anchor = await h.sendUser(room.id, "第一則要重試的訊息");
  await h.sendUser(room.id, "後來才送出的新訊息");
  const before = (await h.messages(room.id)).length;

  const result = await h.reply(room.id, anchor.id);
  assert.equal(result.body.data.handled, true);
  assert.equal((await h.messages(room.id)).length, before);

  const input = h.calls[0];
  const last = input.messages[input.messages.length - 1];
  assert.equal(last.text, "第一則要重試的訊息");
  assert.equal(last.role, "user");
  assert.doesNotMatch(JSON.stringify(input.messages), /後來才送出的新訊息/);
});

test("一般文字保持原樣，+886 手機、括號區碼市話與里鄰地址先遮蔽", async function () {
  const room = await h.createRoom();
  await h.sendUser(
    room.id,
    "網路上的天氣如何？我要弄一桌好菜。我在台北市迷路了，新北市的路況如何？" +
    "電話 +886912345678、(02)12345678，地址台北市大安區龍門里忠孝東路四段 1 號、" +
    "台北市大安區忠孝東路四段 1 之 2 號 3 樓，Email me@example.com，身分證 A123456789"
  );
  await h.sendAi(room.id, { text: "我住新北市瑞芳區鼻頭里鼻頭路 2 號" });
  const current = await h.sendUser(room.id, "吳郭魚口感如何");

  const result = await h.reply(room.id, current.id, tokens.buyer, {
    mode: "listing",
    draft: {
      fish_species: "花枝",
      quantity: 2,
      condition: "網路上的天氣，電話 +886912345678",
      price: 1000
    },
    last_cards: []
  });
  assert.equal(result.body.data.handled, true);

  const serialized = JSON.stringify(h.calls[0]);
  assert.match(serialized, /網路上的天氣如何？我要弄一桌好菜。/);
  assert.match(serialized, /我在台北市迷路了，新北市的路況如何？/);
  assert.match(serialized, /網路上的天氣，電話 \[已遮蔽\]/);
  assert.doesNotMatch(
    serialized,
    /\+886912345678|\(02\)12345678|龍門里|忠孝東路|1 之 2 號|鼻頭里|鼻頭路|me@example\.com|A123456789/
  );
  assert.match(serialized, /\[已遮蔽\]/);
});

test("context 必須是純物件且有大小上限", async function () {
  const room = await h.createRoom();
  const message = await h.sendUser(room.id, "吳郭魚口感如何");

  const array = await h.reply(room.id, message.id, tokens.buyer, []);
  assert.equal(array.status, 400);
  assert.equal(array.body.code, "INVALID_CONTEXT");

  const huge = { mode: "idle", draft: { note: "x".repeat(20000) } };
  const tooLarge = await h.reply(room.id, message.id, tokens.buyer, huge);
  assert.equal(tooLarge.status, 400);
  assert.equal(tooLarge.body.code, "INVALID_CONTEXT");
  assert.equal(h.calls.length, 0);
});

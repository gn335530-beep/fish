/* AI 回覆端點（遮蔽案例）：一般句子保持原樣，常見個資格式換成 [已遮蔽]。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, tokens } = require("./client");
const h = require("./ai-reply-helpers");

const CHAT = {
  intent: "CHAT",
  slots: {},
  reply_text: "這是一般知識回答。",
  sources: [],
  tool_results: {}
};

const BENIGN =
  "台北市區的網路很慢，網路上的天氣如何？我要弄一桌好菜。" +
  "我在台北市迷路了，新北市的路況如何？夜市附近的新生北路很熱鬧。";

const SENSITIVE =
  "電話 +886912345678、+886-2-12345678、+886 2 12345678、" +
  "(02)12345678、037-123456，Email me@example.com，身分證 A123456789，" +
  "地址台北市大安區復興南路一段100號、頭份市中正路12號、" +
  "新北市瑞芳區鼻頭里鼻頭路 2 號；我搬到頭份市中正路12號了，" +
  "地址是台北市大安區復興南路一段100號嗎。";

test.before(start);
test.after(stop);
test.beforeEach(function () { h.reset(); });

test("一般句子原樣送出，電話、Email、身分證與地址換成 [已遮蔽]", async function () {
  h.useJson(CHAT);
  const room = await h.createRoom();
  await h.sendUser(room.id, BENIGN);
  await h.sendAi(room.id, { text: SENSITIVE });
  const current = await h.sendUser(room.id, "吳郭魚口感如何");

  const result = await h.reply(room.id, current.id, tokens.buyer, {
    mode: "listing",
    draft: { fish_species: "花枝", condition: SENSITIVE },
    last_cards: []
  });
  assert.equal(result.body.data.handled, true);

  const input = JSON.stringify(h.calls[0]);
  assert.match(input, /台北市區的網路很慢/);
  assert.match(input, /網路上的天氣如何/);
  assert.match(input, /弄一桌好菜/);
  assert.match(input, /我在台北市迷路了，新北市的路況如何/);
  assert.match(input, /夜市附近的新生北路很熱鬧/);
  assert.doesNotMatch(input,
    /\+886912345678|\+886-2-12345678|\+886 2 12345678|\(02\)12345678|037-123456/);
  assert.doesNotMatch(input, /me@example\.com|A123456789|復興南路|頭份市中正路|鼻頭路/);
  assert.match(input, /\[已遮蔽\]了/);
  assert.match(input, /\[已遮蔽\]嗎/);
});

test("Email 與身分證只換掉號碼本身，前後文保留", async function () {
  h.useJson(CHAT);
  const room = await h.createRoom();
  const current = await h.sendUser(room.id, "代號A123456789結束，信箱me@example.com完成");

  await h.reply(room.id, current.id);
  const input = JSON.stringify(h.calls[0]);
  assert.match(input, /代號\[已遮蔽\]結束/);
  assert.match(input, /信箱\[已遮蔽\]完成/);
  assert.doesNotMatch(input, /A123456789|me@example\.com/);
});

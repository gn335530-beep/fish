/* 助手房多間與刪除：獨立 id、獨立 context、權限與 404。 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { start, stop, call, tokens } = require("./client");

async function createAssistant(token) {
  return call("POST", "/api/conversations/assistant", { token: token || tokens.buyer });
}

function assistantRooms(result) {
  return result.body.data.filter(function (room) { return room.type === "assistant"; });
}

test.before(start);
test.after(stop);

test("每次呼叫都建立一間新的助手房，清單回多間", async function () {
  const first = await createAssistant();
  const second = await createAssistant();
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.notEqual(first.body.data.id, second.body.data.id);

  const list = await call("GET", "/api/conversations", { token: tokens.buyer });
  const rooms = assistantRooms(list).map(function (room) { return room.id; });
  assert.ok(rooms.indexOf(first.body.data.id) !== -1);
  assert.ok(rooms.indexOf(second.body.data.id) !== -1);
});

test("每間助手房有自己的 context 與草稿", async function () {
  const first = await createAssistant();
  const second = await createAssistant();

  await call("PUT", "/api/conversations/" + first.body.data.id + "/context", {
    token: tokens.buyer,
    body: { context: { mode: "listing", draft: { fish_species: "花枝" } } }
  });

  const list = await call("GET", "/api/conversations", { token: tokens.buyer });
  const one = list.body.data.find(function (room) { return room.id === first.body.data.id; });
  const two = list.body.data.find(function (room) { return room.id === second.body.data.id; });
  assert.equal(one.context.draft.fish_species, "花枝");
  assert.equal(two.context.draft, null);
  assert.equal(two.context.mode, "idle");
});

test("助手房不出現在別人的收件匣", async function () {
  const room = await createAssistant(tokens.seller);
  const list = await call("GET", "/api/conversations", { token: tokens.third });
  assert.equal(list.body.data.some(function (item) { return item.id === room.body.data.id; }), false);
});

test("助手房任何時候都能刪，訊息與 context 一起消失", async function () {
  const room = await createAssistant();
  const id = room.body.data.id;
  await call("POST", "/api/chat/message", {
    token: tokens.buyer,
    body: { conversation_id: id, text: "我要賣魚", context: { mode: "listing", draft: null } }
  });

  const removed = await call("DELETE", "/api/conversations/" + id, { token: tokens.buyer });
  assert.equal(removed.status, 200);
  assert.equal(removed.body.data.deleted, true);

  const messages = await call("GET", "/api/conversations/" + id + "/messages", { token: tokens.buyer });
  assert.equal(messages.status, 404);
  assert.equal(messages.body.code, "CONVERSATION_NOT_FOUND");

  const list = await call("GET", "/api/conversations", { token: tokens.buyer });
  assert.equal(list.body.data.some(function (item) { return item.id === id; }), false);
});

test("只有參與者能刪除；不存在的房間回 404", async function () {
  const room = await createAssistant();
  const forbidden = await call("DELETE", "/api/conversations/" + room.body.data.id, { token: tokens.third });
  assert.equal(forbidden.status, 403);
  assert.equal(forbidden.body.code, "FORBIDDEN");

  const missing = await call("DELETE", "/api/conversations/conv_missing", { token: tokens.buyer });
  assert.equal(missing.status, 404);
  assert.equal(missing.body.code, "CONVERSATION_NOT_FOUND");
});

test("助手房摘要標記可刪除", async function () {
  const room = await createAssistant();
  assert.equal(room.body.data.deletable, true);
});

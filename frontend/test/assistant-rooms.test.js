/* 助手房管理：登入時只在沒有助手房時建立；刪除後切換或顯示空狀態。 */

import test from "node:test";
import assert from "node:assert/strict";

const ROOM1 = {
  id: "conv_1",
  type: "assistant",
  context: { mode: "idle", draft: null, last_cards: [] },
  peer: { id: "ai", display_name: "小幫手", username: "" },
  order: null,
  last_message: null,
  unread_count: 0,
  created_at: "2026-10-27T00:00:00.000Z",
  last_message_at: "2026-10-27T00:00:00.000Z",
  deletable: true
};

const ROOM2 = Object.assign({}, ROOM1, { id: "conv_2" });

let conversations = [];
let requests = [];
let deleted = false;

function newRoom() {
  return Object.assign({}, ROOM1, { id: "conv_new" });
}

globalThis.window = {
  confirm: function () { return true; },
  HaisenAPI: {
    getToken: function () { return "token"; },
    BASE: "http://api.test",
    request: async function (path, options) {
      requests.push((options && options.method ? options.method : "GET") + " " + path);
      if (path === "/api/conversations") {
        return { data: deleted ? conversations.filter(function (item) { return item.id !== "conv_1"; }) : conversations };
      }
      if (path === "/api/conversations/assistant") {
        conversations = conversations.concat([newRoom()]);
        return { data: newRoom() };
      }
      if (path.indexOf("/messages") !== -1) return { data: [] };
      if (path.indexOf("/read") !== -1) return { data: { unread_count: 0 } };
      if (path.indexOf("/api/conversations/conv_1") === 0) {
        deleted = true;
        return { data: { deleted: true } };
      }
      throw new Error("unexpected path: " + path);
    }
  }
};

const { state, update } = await import("../assets/js/demo/store.js");
const flow = await import("../assets/js/demo/flow.js");
const rooms = await import("../assets/js/demo/rooms.js");

flow.initFlow({
  render: function () {},
  scrollEnd: function () {},
  notify: function (error) { throw error; }
});

test.beforeEach(function () {
  requests = [];
  deleted = false;
  conversations = [];
  update({ user: { id: 2, city: "高雄市" }, conversations: [], room: null, messages: [], lastSeq: 0 });
});

test("已有助手房時登入只開啟最近一間，不再建立", async function () {
  conversations = [ROOM2, ROOM1];
  await flow.ensureRoom();
  assert.equal(state.room.id, "conv_2");
  assert.equal(requests.some(function (line) { return line === "POST /api/conversations/assistant"; }), false);
});

test("沒有任何助手房時登入才自動建立一間", async function () {
  conversations = [{ id: "conv_deal", type: "deal", peer: {}, order: null, last_message: null }];
  await flow.ensureRoom();
  assert.equal(state.room.id, "conv_new");
  assert.equal(requests.filter(function (line) { return line === "POST /api/conversations/assistant"; }).length, 1);
});

test("刪除目前房間後切換到另一間助手房", async function () {
  conversations = [ROOM1, ROOM2];
  update({ conversations: conversations, room: ROOM1 });
  await rooms.deleteConversation("conv_1");
  assert.equal(state.room.id, "conv_2");
});

test("刪除提問依房間類型顯示助手房或交易房", async function () {
  const asked = [];
  const original = window.confirm;
  window.confirm = function (message) { asked.push(message); return false; };

  try {
    conversations = [ROOM1];
    update({ conversations: conversations, room: ROOM1 });
    await rooms.deleteConversation("conv_1");

    const deal = Object.assign({}, ROOM1, { id: "conv_deal", type: "deal", order: null });
    conversations = [deal];
    update({ conversations: conversations, room: deal });
    await rooms.deleteConversation("conv_deal");
  } finally {
    window.confirm = original;
  }

  assert.deepEqual(asked, ["確定刪除助手房？", "確定刪除交易房？"]);
});

test("刪到最後一間助手房後回到空狀態，不自動建立", async function () {
  conversations = [ROOM1];
  update({ conversations: conversations, room: ROOM1, messages: [{ id: "msg_1" }] });
  await rooms.deleteConversation("conv_1");
  assert.equal(state.room, null);
  assert.deepEqual(state.messages, []);
  assert.equal(requests.filter(function (line) { return line === "POST /api/conversations/assistant"; }).length, 0);
});

test("空狀態下送出訊息不會偷偷建立新房間", async function () {
  conversations = [];
  update({ conversations: [], room: null, messages: [] });
  await flow.submitText("我要賣魚");
  assert.equal(state.room, null);
  assert.equal(requests.length, 0);
});

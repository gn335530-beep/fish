/* 法規確認與取消上架的流程：呼叫端點、接回上架、刪除舊房並開新房。 */

import test from "node:test";
import assert from "node:assert/strict";

let calls = [];
let seq = 0;
let rooms = [];
let toasts = [];
let errors = [];
let failCreate = false;

function makeRoom() {
  return {
    id: "conv_2",
    type: "assistant",
    context: { mode: "idle", draft: null, last_cards: [] },
    peer: { id: "ai", display_name: "小幫手" },
    order: null,
    unread_count: 0
  };
}

globalThis.window = {
  confirm: function () { throw new Error("不應跳出瀏覽器確認框"); },
  toast: function (text) { toasts.push(text); },
  HaisenAPI: {
    getToken: function () { return "token"; },
    BASE: "http://api.test",
    request: async function (path, options) {
      const method = options && options.method ? options.method : "GET";
      calls.push(method + " " + path);
      if (path === "/api/users/seller-consent") {
        return { data: { user: { id: 2, city: "高雄市", seller_terms_accepted_at: "2026-10-27T01:00:00.000Z" } } };
      }
      if (path === "/api/chat/message") {
        seq += 1;
        const body = options.body || {};
        return {
          data: {
            id: "msg_" + seq,
            seq: seq,
            sender_id: "ai",
            type: body.card ? "card" : "text",
            text: body.text || "",
            card: body.card || null,
            created_at: "2026-10-27T01:00:00.000Z"
          }
        };
      }
      if (path === "/api/conversations") return { data: rooms.slice() };
      if (path === "/api/conversations/assistant") {
        if (failCreate) throw new Error("建立助手房失敗");
        const created = makeRoom();
        rooms = [created];
        return { data: created };
      }
      if (path === "/api/conversations/conv_2/messages?after_seq=0&limit=100") {
        return { data: [] };
      }
      if (path === "/api/conversations/conv_2/read") return { data: {} };
      if (path === "/api/conversations/conv_1/clear") {
        return { data: { cleared_before_seq: (options.body || {}).keep_from_seq - 1 } };
      }
      if (path === "/api/conversations/conv_1") {
        rooms = rooms.filter(function (room) { return room.id !== "conv_1"; });
        return { data: { deleted: true } };
      }
      throw new Error("unexpected path: " + path);
    }
  }
};

const { state, update } = await import("../assets/js/demo/store.js");
const flow = await import("../assets/js/demo/flow.js");
const listingActions = await import("../assets/js/demo/listing-actions.js");

flow.initFlow({
  render: function () {},
  scrollEnd: function () {},
  notify: function (error) { errors.push(error); }
});
listingActions.initListingActions({
  render: function () {},
  notify: function (error) { errors.push(error); }
});

function room() {
  return {
    id: "conv_1",
    type: "assistant",
    context: {
      mode: "idle",
      draft: null,
      last_cards: [],
      pending_sale_text: "我要賣花枝",
      awaiting_consent: true
    },
    peer: { id: "ai", display_name: "小幫手" },
    order: null,
    unread_count: 0
  };
}

test.beforeEach(function () {
  calls = [];
  seq = 0;
  rooms = [room()];
  toasts = [];
  errors = [];
  failCreate = false;
  update({
    user: { id: 2, city: "高雄市", seller_terms_accepted_at: null },
    room: room(),
    conversations: [room()],
    messages: [],
    lastSeq: 0,
    view: "assistant"
  });
});

test("確認法規後清除對話紀錄，只留下想賣什麼魚類的提問", async function () {
  await listingActions.acceptSellerConsent();
  assert.ok(calls.indexOf("POST /api/users/seller-consent") !== -1);
  assert.ok(calls.indexOf("POST /api/conversations/conv_1/clear") !== -1);
  assert.equal(state.user.seller_terms_accepted_at, "2026-10-27T01:00:00.000Z");
  assert.equal(state.room.context.pending_sale_text, null);
  assert.equal(state.room.context.awaiting_consent, false);
  assert.equal(state.room.context.draft.fish_species, "");
  assert.equal(state.messages.length, 1);
  assert.match(state.messages[0].text, /請問想要販售什麼魚類/);
});

test("確認取消上架後刪除舊房，直接開一間新助手房", async function () {
  await listingActions.confirmCancelListing();
  assert.ok(calls.indexOf("DELETE /api/conversations/conv_1") !== -1);
  assert.ok(calls.indexOf("POST /api/conversations/assistant") !== -1);
  assert.equal(state.room.id, "conv_2");
  assert.equal(state.room.type, "assistant");
  assert.equal(state.view, "assistant");
  assert.deepEqual(toasts, ["已取消上架"]);
  assert.equal(state.conversations.length, 1);
  assert.equal(state.conversations[0].id, "conv_2");
});

test("建立新房失敗時顯示錯誤，不停在已刪除的房間", async function () {
  failCreate = true;
  await listingActions.confirmCancelListing();
  assert.ok(calls.indexOf("DELETE /api/conversations/conv_1") !== -1);
  assert.equal(state.room, null);
  assert.equal(state.conversations.length, 0);
  assert.equal(state.view, "assistant");
  assert.equal(errors.length, 1);
  assert.equal(toasts.length, 0);
});

test("已確認後再點同一張法規卡不會重置草稿", async function () {
  await listingActions.acceptSellerConsent();
  const draft = state.room.context.draft;
  const count = calls.filter(function (line) { return line === "POST /api/users/seller-consent"; }).length;
  await listingActions.acceptSellerConsent();
  assert.equal(state.room.context.draft, draft);
  assert.equal(calls.filter(function (line) { return line === "POST /api/users/seller-consent"; }).length, count);
});

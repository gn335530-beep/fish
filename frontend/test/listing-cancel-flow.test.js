/* 法規確認與取消上架的流程：呼叫端點、接回上架、刪除目前對話。 */

import test from "node:test";
import assert from "node:assert/strict";

const SPECIES = [
  { id: "cuttlefish", name: "花枝", alias: [], category: "ceph", texture: "", bones: "無刺", cooking: ["炒"] }
];

let calls = [];
let seq = 0;

globalThis.window = {
  confirm: function () { throw new Error("不應跳出瀏覽器確認框"); },
  HaisenAPI: {
    getToken: function () { return "token"; },
    BASE: "http://api.test",
    listSpecies: async function () { return SPECIES; },
    request: async function (path, options) {
      calls.push((options && options.method ? options.method : "GET") + " " + path);
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
      if (path === "/api/conversations") return { data: [] };
      if (path === "/api/conversations/conv_1/clear") {
        return { data: { cleared_before_seq: (options.body || {}).keep_from_seq - 1 } };
      }
      if (path === "/api/conversations/conv_1") return { data: { deleted: true } };
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
  notify: function (error) { throw error; }
});
listingActions.initListingActions({
  render: function () {},
  notify: function (error) { throw error; }
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

test("確認取消上架後直接刪除對話，不再跳瀏覽器確認", async function () {
  await listingActions.confirmCancelListing();
  assert.ok(calls.indexOf("DELETE /api/conversations/conv_1") !== -1);
  assert.equal(state.room, null);
  assert.equal(state.view, "inbox");
});

test("已確認後再點同一張法規卡不會重置草稿", async function () {
  await listingActions.acceptSellerConsent();
  const draft = state.room.context.draft;
  const count = calls.filter(function (line) { return line === "POST /api/users/seller-consent"; }).length;
  await listingActions.acceptSellerConsent();
  assert.equal(state.room.context.draft, draft);
  assert.equal(calls.filter(function (line) { return line === "POST /api/users/seller-consent"; }).length, count);
});

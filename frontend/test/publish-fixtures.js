/* 發布測試共用：假 API、草稿訊息與房間切換 helper。 */

import { USER, setupAiTest } from "./ai-fixtures.js";

export const DRAFT = {
  fish_species: "花枝",
  quantity: 2,
  condition: "放血冰鎮",
  photo_url: "/uploads/a.jpg",
  price: 1000,
  price_per_taijin: 200,
  client_request_id: "pub_test_1"
};
export const PRODUCT = { id: "prd_test", title: "花枝（2尾 / 放血冰鎮）" };
export const NOTICE = "已上架：" + PRODUCT.title;

/* 改版前的草稿沒有發布識別碼。 */
export function legacyDraft() {
  const draft = Object.assign({}, DRAFT);
  delete draft.client_request_id;
  return draft;
}

export function hasNotice(html) {
  return String(html || "").indexOf(NOTICE) !== -1;
}

/* 發布測試共用延遲 gate：測試決定建立商品何時完成。 */
export function createGate() {
  let release = function () {};
  const promise = new Promise(function (resolve) { release = resolve; });
  return { promise: promise, release: function () { release(); } };
}

/* 讓下一次助手訊息寫入失敗一次；回傳還原函式。 */
export function failNextAiMessage() {
  const originalRequest = globalThis.window.HaisenAPI.request;
  let pendingFailure = true;
  globalThis.window.HaisenAPI.request = async function (path, options) {
    const body = options && options.body;
    if (pendingFailure && path === "/api/chat/message" && body && body.sender_type === "ai") {
      pendingFailure = false;
      throw new Error("訊息寫入失敗");
    }
    return originalRequest(path, options);
  };
  return function restore() {
    globalThis.window.HaisenAPI.request = originalRequest;
  };
}

function listingContext(draft) {
  return { mode: "listing", draft: draft, last_cards: [], market_quoted: true };
}

export async function setupPublishTest() {
  const harness = {
    createCalls: [],
    toasts: [],
    notifyError: null,
    events: [],
    createHandler: function () { return { data: PRODUCT }; }
  };

  globalThis.document = {
    dispatchEvent: function (event) { harness.events.push(event.type); }
  };
  globalThis.CustomEvent = function (type) { this.type = type; };

  const ai = await setupAiTest({
    user: USER,
    handle: async function (path, requestOptions) {
      if (path === "/api/products/create") {
        harness.createCalls.push(requestOptions.body);
        return harness.createHandler(requestOptions.body);
      }
      if (path.indexOf("/context") !== -1) return { data: {} };
      if (path.indexOf("/clear") !== -1) return { data: {} };
      throw new Error("unexpected path: " + path);
    },
    notify: function (error) { harness.notifyError = error; }
  });

  const store = ai.store;
  const assistantView = await import("../assets/js/demo/views/assistant.js");

  function draftMessage(draft) {
    return ai.messageOf({
      conversation_id: "conv_1",
      sender_type: "ai",
      card: { type: "draft", draft: draft }
    });
  }

  function otherMessage() {
    return {
      id: "msg_other",
      seq: 9,
      conversation_id: "conv_b",
      sender_id: "ai",
      type: "text",
      text: "別房的訊息",
      created_at: "2026-11-17T00:00:00.000Z"
    };
  }

  function reset(overrides) {
    harness.createCalls = [];
    harness.toasts = [];
    harness.notifyError = null;
    harness.events = [];
    harness.createHandler = function () { return { data: PRODUCT }; };
    globalThis.window.toast = function (message) { harness.toasts.push(message); };
    store.update({ publishing: false });
    ai.reset(Object.assign({
      room: { id: "conv_1", type: "assistant", context: listingContext(DRAFT) }
    }, overrides || {}));
    if (!(overrides && overrides.messages)) store.update({ messages: [draftMessage(DRAFT)] });
  }

  function setDraft(draft) {
    store.update({
      room: Object.assign({}, store.state.room, { context: listingContext(draft) })
    });
  }

  return {
    ai: ai,
    store: store,
    flow: ai.flow,
    assistantView: assistantView,
    harness: harness,
    reset: reset,
    setDraft: setDraft,
    otherMessage: otherMessage
  };
}

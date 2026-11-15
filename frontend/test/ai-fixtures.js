/* AI 前端測試共用：假 API、flow 初始化、房間與訊息、store 重設。 */

export const USER = { id: 2, seller_terms_accepted_at: "2026-10-27T00:00:00.000Z" };
/* 需要個人檔案縣市的測試（例如導購範圍）使用這個 fixture。 */
export const USER_CITY = Object.assign({}, USER, { city: "高雄市" });
export const IDLE = { mode: "idle", draft: null, last_cards: [] };

export function createMessageFactory() {
  let seq = 0;
  function messageOf(body) {
    seq += 1;
    return {
      id: "msg_" + seq,
      seq: seq,
      conversation_id: body.conversation_id,
      sender_id: body.sender_type === "ai" ? "ai" : 2,
      type: body.card ? "card" : "text",
      text: body.text || "",
      card: body.card || null,
      created_at: "2026-11-14T00:00:00.000Z"
    };
  }
  messageOf.reset = function () { seq = 0; };
  return messageOf;
}

/* 安裝假 HaisenAPI、載入 store／flow、初始化 flow，並提供重置與房間 helper。 */
export async function setupAiTest(options) {
  const settings = options || {};
  const messageOf = createMessageFactory();
  const requests = [];

  globalThis.window = {
    HaisenAPI: {
      getToken: function () { return "token"; },
      BASE: "http://api.test",
      request: async function (path, requestOptions) {
        const body = requestOptions && requestOptions.body;
        requests.push({ path: path, body: body });
        if (path === "/api/chat/message") return { data: messageOf(body || {}) };
        return settings.handle(path, requestOptions);
      }
    }
  };

  const store = await import("../assets/js/demo/store.js");
  const flow = await import("../assets/js/demo/flow.js");
  flow.initFlow({
    render: function () {},
    scrollEnd: function () {},
    scrollToBatch: function () {},
    notify: settings.notify || function (error) { throw error; }
  });

  const defaults = {
    user: settings.user || USER,
    room: settings.room || { id: "conv_1", type: "assistant", context: settings.context || IDLE },
    messages: [],
    lastSeq: 0,
    aiPending: 0,
    aiRetry: null
  };

  function reset(overrides) {
    messageOf.reset();
    requests.length = 0;
    store.update(Object.assign({}, defaults, overrides || {}));
  }

  function room(context, overrides) {
    return Object.assign({ id: "conv_1", type: "assistant", context: context || IDLE }, overrides || {});
  }

  function aiPaths() {
    return requests.filter(function (entry) { return entry.path === "/api/ai/reply"; });
  }

  function assistantTexts() {
    return store.state.messages.filter(function (message) {
      return message.sender_id === "ai";
    }).map(function (message) { return message.text; });
  }

  return {
    store: store,
    flow: flow,
    messageOf: messageOf,
    requests: requests,
    reset: reset,
    room: room,
    aiPaths: aiPaths,
    assistantTexts: assistantTexts
  };
}

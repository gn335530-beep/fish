/* AI 前端測試共用：API stub、訊息 factory 與使用者 fixture。 */

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

/* 安裝假的 HaisenAPI：訊息端點固定用 factory，其餘路由交給 handle。 */
export function installApi(options) {
  const settings = options || {};
  globalThis.window = {
    HaisenAPI: {
      getToken: function () { return "token"; },
      BASE: "http://api.test",
      request: async function (path, requestOptions) {
        const body = requestOptions && requestOptions.body;
        if (settings.onRequest) settings.onRequest(path, body);
        if (path === "/api/chat/message") return { data: settings.messageOf(body || {}) };
        return settings.handle(path, requestOptions);
      }
    }
  };
}

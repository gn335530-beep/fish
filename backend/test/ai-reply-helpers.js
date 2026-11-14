/* AI 回覆測試共用：建立助手房、寫訊息、注入假 provider。 */

const { call, tokens } = require("./client");
const provider = require("../lib/ai/provider");

const calls = [];

function setEnv(overrides) {
  process.env.LLM_ENABLED = "true";
  process.env.GEMINI_API_KEY = "test-key";
  delete process.env.LLM_MODEL;
  delete process.env.LLM_TIMEOUT_MS;
  Object.keys(overrides || {}).forEach(function (key) {
    if (overrides[key] === null) delete process.env[key];
    else process.env[key] = String(overrides[key]);
  });
}

function reset(overrides) {
  calls.length = 0;
  provider.resetProvider();
  setEnv(overrides);
}

function useJson(value) {
  provider.setProvider(async function (input) {
    calls.push(input);
    return {
      text: typeof value === "string" ? value : JSON.stringify(value),
      usage: { prompt_tokens: 12, completion_tokens: 8 }
    };
  });
}

function useError(error) {
  provider.setProvider(async function (input) {
    calls.push(input);
    throw error;
  });
}

async function createRoom(token) {
  const room = await call("POST", "/api/conversations/assistant", { token: token || tokens.buyer });
  return room.body.data;
}

async function sendUser(roomId, text, token) {
  const result = await call("POST", "/api/chat/message", {
    token: token || tokens.buyer,
    body: { conversation_id: roomId, text: text }
  });
  return result.body.data;
}

async function sendAi(roomId, payload, token) {
  const result = await call("POST", "/api/chat/message", {
    token: token || tokens.buyer,
    body: Object.assign({ conversation_id: roomId, sender_type: "ai" }, payload)
  });
  return result.body.data;
}

async function reply(roomId, messageId, token, context) {
  return call("POST", "/api/ai/reply", {
    token: token === undefined ? tokens.buyer : token,
    body: {
      conversation_id: roomId,
      message_id: messageId,
      context: context === undefined ? { mode: "idle", draft: null, last_cards: [] } : context
    }
  });
}

async function messages(roomId, token) {
  const result = await call("GET", "/api/conversations/" + roomId + "/messages", {
    token: token || tokens.buyer
  });
  return result.body.data || [];
}

module.exports = {
  calls: calls,
  reset: reset,
  useJson: useJson,
  useError: useError,
  createRoom: createRoom,
  sendUser: sendUser,
  sendAi: sendAi,
  reply: reply,
  messages: messages
};

/* POST /api/ai/reply：驗證助手房與訊息後，回傳結構化 AI 結果；失敗一律 200 + handled:false。 */

const crypto = require("node:crypto");
const express = require("express");
const { findById } = require("../lib/store");
const { requireUser } = require("../lib/auth");
const { isParticipant } = require("../lib/conversations");
const { ok, fail } = require("../lib/http");
const { isPlainObject } = require("../lib/ai/json");
const ai = require("../lib/ai/service");

const router = express.Router();
const MAX_CONTEXT_BYTES = 16000;

function validateRequest(body) {
  if (!body.conversation_id) return { status: 400, code: "MISSING_CONVERSATION", message: "缺少 conversation_id" };
  if (!body.message_id) return { status: 400, code: "MISSING_MESSAGE", message: "缺少 message_id" };
  if (!isPlainObject(body.context)) return { status: 400, code: "INVALID_CONTEXT", message: "context 必須是物件" };
  if (Buffer.byteLength(JSON.stringify(body.context), "utf8") > MAX_CONTEXT_BYTES) {
    return { status: 400, code: "INVALID_CONTEXT", message: "context 過大" };
  }
  return null;
}

router.post("/api/ai/reply", requireUser, async function (req, res) {
  const body = req.body || {};
  const invalid = validateRequest(body);
  if (invalid) {
    fail(res, invalid.status, invalid.code, invalid.message);
    return;
  }

  const conversation = findById("conversations", body.conversation_id);
  if (!conversation) {
    fail(res, 404, "CONVERSATION_NOT_FOUND", "找不到對話");
    return;
  }
  if (!isParticipant(conversation, req.user.id)) {
    fail(res, 403, "FORBIDDEN", "你沒有這段對話的權限");
    return;
  }
  if (conversation.type !== "assistant") {
    fail(res, 409, "NOT_ASSISTANT_ROOM", "只有助手房可以使用 AI 回覆");
    return;
  }

  /* 訊息必須屬於這間房、由目前使用者送出；文字以資料庫為準，不信任前端。 */
  const message = findById("messages", body.message_id);
  if (!message || String(message.conversation_id) !== String(conversation.id) ||
    String(message.sender_id) !== String(req.user.id)) {
    fail(res, 404, "MESSAGE_NOT_FOUND", "找不到這則訊息");
    return;
  }
  if (message.type !== "text" || !String(message.text || "").trim()) {
    fail(res, 400, "INVALID_MESSAGE", "只有文字訊息可以取得 AI 回覆");
    return;
  }

  const result = await ai.reply({
    conversation: conversation,
    message: message,
    context: body.context,
    user: req.user,
    requestId: crypto.randomUUID()
  });
  ok(res, result, "AI 回覆");
});

module.exports = router;

/* 訊息寫入、AI 上下文更新與已讀標記。 */

const express = require("express");
const { findById, insert, patch, nextCode, nextSeq } = require("../lib/store");
const { requireUser } = require("../lib/auth");
const { isParticipant, summary, requireRoom } = require("../lib/conversations");
const { ok, created, fail } = require("../lib/http");

const router = express.Router();

router.post("/api/chat/message", requireUser, function (req, res) {
  const body = req.body || {};
  if (!body.conversation_id) {
    fail(res, 400, "MISSING_CONVERSATION", "缺少 conversation_id");
    return;
  }

  const conversation = findById("conversations", body.conversation_id);
  if (!conversation) {
    fail(res, 404, "CONVERSATION_NOT_FOUND", "找不到對話");
    return;
  }
  /* 一律先驗參與者。sender_type 由前端規則引擎代寫，不是身分證明：
     若因為帶了 sender_type = "ai" 就跳過檢查，任何登入者都能寫進別人的房間。 */
  if (!isParticipant(conversation, req.user.id)) {
    fail(res, 403, "FORBIDDEN", "你沒有這段對話的權限");
    return;
  }

  const isAi = body.sender_type === "ai";
  if (isAi && (conversation.type !== "assistant" || conversation.mode !== "AI")) {
    fail(res, 409, "AI_NOT_ACTIVE", "AI 已退出這段對話");
    return;
  }

  const text = String(body.text || "").trim();
  const imageUrl = body.image_url || null;
  const card = body.card || null;
  if (!text && !imageUrl && !card) {
    fail(res, 400, "EMPTY_MESSAGE", "訊息內容不可為空");
    return;
  }
  if (text.length > 500) {
    fail(res, 400, "MESSAGE_TOO_LONG", "訊息不可超過 500 字");
    return;
  }

  /* AI 狀態只屬於助手房；交易房不得被寫入 context。 */
  const hasContext = body.context !== undefined && body.context !== null;
  if (hasContext && conversation.type !== "assistant") {
    fail(res, 409, "NOT_ASSISTANT_ROOM", "只有助手房可以更新 AI 狀態");
    return;
  }
  if (hasContext && (typeof body.context !== "object" || Array.isArray(body.context))) {
    fail(res, 400, "INVALID_CONTEXT", "context 必須是物件");
    return;
  }

  const now = new Date().toISOString();
  const message = insert("messages", {
    id: nextCode("messages", "msg"),
    seq: nextSeq("messages"),
    conversation_id: conversation.id,
    sender_id: isAi ? "ai" : req.user.id,
    type: imageUrl ? "image" : (card ? "card" : "text"),
    text: text,
    image_url: imageUrl,
    card: card,
    created_at: now
  });

  const readAt = Object.assign({}, conversation.read_at || {});
  readAt[String(req.user.id)] = now;
  const changes = { last_message_at: now, read_at: readAt };
  if (hasContext) changes.context = body.context;
  patch("conversations", conversation.id, changes);

  created(res, message, "訊息已送出");
});

router.put("/api/conversations/:id/context", requireUser, function (req, res) {
  const conversation = requireRoom(req, res);
  if (!conversation) return;
  if (conversation.type !== "assistant") {
    fail(res, 409, "NOT_ASSISTANT_ROOM", "只有助手房可以更新 AI 狀態");
    return;
  }

  const body = req.body || {};
  const changes = {};
  if (body.mode && ["AI", "HUMAN"].indexOf(body.mode) !== -1) changes.mode = body.mode;
  if (body.context) changes.context = Object.assign({}, conversation.context || {}, body.context);
  if (Object.keys(changes).length === 0) {
    fail(res, 400, "NO_CHANGES", "沒有可更新的內容");
    return;
  }

  ok(res, summary(patch("conversations", conversation.id, changes), req.user), "已更新 AI 狀態");
});

router.post("/api/conversations/:id/read", requireUser, function (req, res) {
  const conversation = requireRoom(req, res);
  if (!conversation) return;

  const readAt = Object.assign({}, conversation.read_at || {});
  readAt[String(req.user.id)] = new Date().toISOString();
  patch("conversations", conversation.id, { read_at: readAt });
  ok(res, { unread_count: 0 }, "已標記為已讀");
});

router.post("/api/conversations/:id/clear", requireUser, function (req, res) {
  const conversation = requireRoom(req, res);
  if (!conversation) return;
  if (conversation.type !== "assistant") {
    fail(res, 409, "NOT_ASSISTANT_ROOM", "只有助手房可以清除對話");
    return;
  }

  const keepFrom = Number((req.body || {}).keep_from_seq) || 0;
  const floor = Math.max(0, keepFrom - 1);
  patch("conversations", conversation.id, { cleared_before_seq: floor });
  ok(res, { cleared_before_seq: floor }, "對話已清除");
});

module.exports = router;

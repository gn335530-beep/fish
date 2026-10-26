/* 對話：助手房建立、對話清單、訊息讀取。 */

const express = require("express");
const { all, insert, patch, nextCode, nextSeq } = require("../lib/store");
const { requireUser } = require("../lib/auth");
const { isParticipant, messagesOf, summary, requireRoom } = require("../lib/conversations");
const { sweepExpired } = require("../lib/orders");
const { ok } = require("../lib/http");

const router = express.Router();

router.get("/api/conversations", requireUser, function (req, res) {
  sweepExpired();
  const data = all("conversations")
    .filter(function (c) { return isParticipant(c, req.user.id); })
    .map(function (c) { return summary(c, req.user); })
    .sort(function (a, b) {
      return new Date(b.last_message_at || b.created_at) - new Date(a.last_message_at || a.created_at);
    });
  ok(res, data, "取得對話清單成功");
});

/* 助手房：每次呼叫建立一間新的獨立房間並留下招呼語。 */
router.post("/api/conversations/assistant", requireUser, function (req, res) {
  const user = req.user;
  const now = new Date().toISOString();
  const conversation = insert("conversations", {
    id: nextCode("conversations", "conv"),
    type: "assistant",
    user_ids: [user.id],
    buyer_id: null,
    seller_id: null,
    mode: "AI",
    context: { mode: "idle", draft: null, last_cards: [] },
    archived: false,
    read_at: {},
    created_at: now,
    last_message_at: now
  });

  insert("messages", {
    id: nextCode("messages", "msg"),
    seq: nextSeq("messages"),
    conversation_id: conversation.id,
    sender_id: "ai",
    type: "text",
    text: "你好，我是小幫手。想賣魚就說「我要賣魚」，想找魚就說「今天有什麼魚」。",
    image_url: null,
    card: null,
    created_at: now
  });

  const marked = patch("conversations", conversation.id, { read_at: { [user.id]: now } });
  ok(res, summary(marked, user), "已建立助手房");
});

router.get("/api/conversations/:id/messages", requireUser, function (req, res) {
  const conversation = requireRoom(req, res);
  if (!conversation) return;

  const afterSeq = Number(req.query.after_seq) || 0;
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const floor = Math.max(afterSeq, Number(conversation.cleared_before_seq) || 0);
  const data = messagesOf(conversation.id)
    .filter(function (m) { return Number(m.seq || 0) > floor; })
    .sort(function (a, b) { return Number(a.seq) - Number(b.seq); })
    .slice(0, limit);

  ok(res, data, "取得訊息成功");
});

module.exports = router;

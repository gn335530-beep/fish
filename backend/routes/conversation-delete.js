/* 對話刪除：助手房隨時可刪；交易房需全部訂單都已取消且沒有成交。 */

const express = require("express");
const { remove } = require("../lib/store");
const { requireUser } = require("../lib/auth");
const {
  requireRoom, isDeletable, messagesOf, dealsOf
} = require("../lib/conversations");
const { ok, fail } = require("../lib/http");
const { sweepExpired } = require("../lib/orders");

const router = express.Router();

router.delete("/api/conversations/:id", requireUser, function (req, res) {
  sweepExpired();
  const conversation = requireRoom(req, res);
  if (!conversation) return;
  if (!isDeletable(conversation)) {
    fail(res, 409, "DEAL_NOT_DELETABLE", "這個交易房還有進行中或已成交的訂單，不能刪除");
    return;
  }

  dealsOf(conversation.id).forEach(function (deal) {
    remove("deals", deal.id);
  });
  messagesOf(conversation.id).forEach(function (message) {
    remove("messages", message.id);
  });
  remove("conversations", conversation.id);
  ok(res, { deleted: true }, "對話已刪除");
});

module.exports = router;

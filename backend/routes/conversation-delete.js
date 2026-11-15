/* 對話刪除：一律移除房間與訊息；已成交訂單保留，其餘訂單一併移除。 */

const express = require("express");
const { remove, bumpStableCode } = require("../lib/store");
const { requireUser } = require("../lib/auth");
const { requireRoom, messagesOf, dealsOf } = require("../lib/conversations");
const { ok } = require("../lib/http");
const { sweepExpired } = require("../lib/timeouts");

const router = express.Router();

router.delete("/api/conversations/:id", requireUser, function (req, res) {
  sweepExpired();
  const conversation = requireRoom(req, res);
  if (!conversation) return;

  const roomDeals = dealsOf(conversation.id);
  const kept = roomDeals.filter(function (deal) {
    return deal.deal_status === "CONFIRMED";
  });
  roomDeals.filter(function (deal) {
    return deal.deal_status !== "CONFIRMED";
  }).forEach(function (deal) {
    remove("deals", deal.id);
  });
  messagesOf(conversation.id).forEach(function (message) {
    remove("messages", message.id);
  });
  bumpStableCode("conversations", "conv", conversation.id);
  remove("conversations", conversation.id);

  ok(res, { deleted: true, kept_orders: kept.length }, "對話已刪除");
});

module.exports = router;

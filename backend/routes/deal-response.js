/* 協議回應與取消：同意成交、退回協商、取消並釋放。 */

const express = require("express");
const { requireUser } = require("../lib/auth");
const { sweepExpired } = require("../lib/orders");
const deals = require("../lib/deals");
const status = require("../lib/deal-status");
const { ok, fail } = require("../lib/http");

const router = express.Router();
const CANCELLABLE = ["DRAFT", "PENDING_REVIEW", "NEGOTIATING"];

router.post("/api/deals/respond", requireUser, function (req, res) {
  sweepExpired();
  const deal = deals.requireDeal(req, res);
  if (!deal) return;

  const action = String((req.body || {}).action || "").toUpperCase();
  if (["AGREE", "REJECT"].indexOf(action) === -1) {
    fail(res, 400, "INVALID_ACTION", "動作必須是 AGREE 或 REJECT");
    return;
  }
  if (deal.deal_status !== "PENDING_REVIEW") {
    fail(res, 409, "INVALID_DEAL_STATUS", "只有待回覆的協議可以同意或退回");
    return;
  }
  if (String(deal.initiator_id) === String(req.user.id)) {
    fail(res, 403, "FORBIDDEN", "發起方不能回覆自己的協議");
    return;
  }

  const now = new Date().toISOString();
  const updated = action === "AGREE"
    ? status.agree(deal, now)
    : status.reject(deal, req.user.id, now);
  ok(res, { deal: deals.decorateDeal(updated) }, action === "AGREE" ? "交易已成立" : "協議已退回");
});

router.post("/api/deals/cancel", requireUser, function (req, res) {
  sweepExpired();
  const deal = deals.requireDeal(req, res);
  if (!deal) return;
  if (CANCELLABLE.indexOf(deal.deal_status) === -1) {
    fail(res, 409, "INVALID_DEAL_STATUS", "這筆訂單已經結束");
    return;
  }

  const reason = String((req.body || {}).reason || "");
  if (!status.CANCEL_REASONS[reason]) {
    fail(res, 400, "INVALID_CANCEL_REASON", "請選擇取消原因");
    return;
  }

  const updated = status.cancel(deal, req.user.id, reason, new Date().toISOString());
  ok(res, { deal: deals.decorateDeal(updated) }, "訂單已取消");
});

module.exports = router;

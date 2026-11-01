/* 協議回應與取消：同意成交、退回協商、取消並釋放。 */

const express = require("express");
const { requireUser } = require("../lib/auth");
const { sweepExpired } = require("../lib/timeouts");
const { CANCELLABLE } = require("../lib/deal-statuses");
const deals = require("../lib/deals");
const transitions = require("../lib/deal-transitions");
const { ok, fail } = require("../lib/http");

const router = express.Router();

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
    ? transitions.agree(deal, now)
    : transitions.reject(deal, req.user.id, now);
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

  const note = String((req.body || {}).note || "").trim();
  if (note.length > 200) {
    fail(res, 400, "FIELD_TOO_LONG", "取消原因最多 200 字");
    return;
  }

  const updated = transitions.cancel(deal, req.user.id, note, new Date().toISOString());
  ok(res, { deal: deals.decorateDeal(updated) }, "訂單已取消");
});

module.exports = router;

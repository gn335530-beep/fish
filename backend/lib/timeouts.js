/* 逾時掃描：讀取時惰性取消逾時訂單、釋放保留量並留下系統訊息。 */

const { all } = require("./store");
const { cancelDeal } = require("./deal-cancel");

function expireDeal(deal, reason, message) {
  return cancelDeal(deal, {
    operator: "system",
    reason: reason,
    cardStatus: "expired",
    message: message
  }, new Date().toISOString());
}

/* 讀取時惰性掃描，不需要背景排程。 */
function sweepExpired() {
  const now = Date.now();
  all("deals").forEach(function (deal) {
    if (deal.deal_status === "PENDING_REVIEW" && deal.lock_expires_at) {
      if (new Date(deal.lock_expires_at).getTime() < now) {
        expireDeal(deal, "LOCK_EXPIRED", "協議已逾時未回覆，保留的數量已釋放。");
      }
      return;
    }
    if (deal.deal_status === "NEGOTIATING" && deal.hold_expires_at) {
      if (new Date(deal.hold_expires_at).getTime() < now) {
        expireDeal(deal, "HOLD_EXPIRED", "協商已逾時，保留的數量已釋放。");
      }
    }
  });
}

module.exports = { expireDeal: expireDeal, sweepExpired: sweepExpired };

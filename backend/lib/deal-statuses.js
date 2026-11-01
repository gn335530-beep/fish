/* 訂單狀態常數與純判斷的單一來源；不依賴其他模組，避免與狀態轉換形成循環。 */

const DRAFT_STATUS = "DRAFT";
const CANCELLED_STATUS = "CANCELLED";
const ACTIVE_STATUS = ["PENDING_REVIEW", "NEGOTIATING"];
const ACTIVE_ORDER = [DRAFT_STATUS].concat(ACTIVE_STATUS);
const CANCELLABLE = ACTIVE_ORDER.slice();

function isActive(deal) {
  return ACTIVE_STATUS.indexOf(deal.deal_status) !== -1;
}

module.exports = {
  DRAFT_STATUS: DRAFT_STATUS,
  CANCELLED_STATUS: CANCELLED_STATUS,
  ACTIVE_STATUS: ACTIVE_STATUS,
  ACTIVE_ORDER: ACTIVE_ORDER,
  CANCELLABLE: CANCELLABLE,
  isActive: isActive
};

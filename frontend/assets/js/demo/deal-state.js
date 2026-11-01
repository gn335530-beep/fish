/* demo 層只轉出共用狀態模組的函式，不自行列舉狀態字串。 */

import "../shared/deal-status.js";

const shared = window.DealStatus;

export const cardStatusOf = shared.cardStatusOf;
export const cardStatusForDeal = shared.cardStatusForDeal;
export const isActionable = shared.isActionable;
export const canResend = shared.canResend;
export const isPendingCard = shared.isPendingCard;
export const isConfirmedCard = shared.isConfirmedCard;
export const cardStatusTone = shared.cardStatusTone;
export const isDraft = shared.isDraft;
export const isNegotiating = shared.isNegotiating;
export const isConfirmed = shared.isConfirmed;
export const isFinished = shared.isFinished;

/* 只有買家可以在草稿階段修改商品組合。 */
export function canEditDeal(deal, user) {
  return !!(deal && isDraft(deal) && user && String(deal.buyer_id) === String(user.id));
}

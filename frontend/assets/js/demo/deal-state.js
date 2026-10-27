/* demo 層只轉出共用狀態模組的函式，不自行列舉狀態字串。 */

import "../shared/deal-status.js";

const shared = window.DealStatus;

export const cardStatusOf = shared.cardStatusOf;
export const cardStatusForDeal = shared.cardStatusForDeal;
export const isActionable = shared.isActionable;
export const canResend = shared.canResend;
export const isPendingCard = shared.isPendingCard;
export const isDraft = shared.isDraft;
export const isNegotiating = shared.isNegotiating;
export const isConfirmed = shared.isConfirmed;
export const isFinished = shared.isFinished;

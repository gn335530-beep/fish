/* 評價卡共用：標籤與尚未送出的草稿。 */

import { state } from "./store.js";

export const REVIEW_TAGS = ["準時守約", "魚貨新鮮", "溝通良好", "包裝完善", "臨時放鳥"];

export function draftOf(dealId) {
  state.reviewDrafts = state.reviewDrafts || {};
  if (!state.reviewDrafts[dealId]) {
    state.reviewDrafts[dealId] = { rating: 5, tags: [], comment: "" };
  }
  return state.reviewDrafts[dealId];
}

export function resetDraft(dealId) {
  if (!state.reviewDrafts) return;
  delete state.reviewDrafts[dealId];
}

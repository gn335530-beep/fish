/* 評價卡：星等、標籤與評語的輸入與送出。 */

import * as api from "./api.js";
import { reloadRoom } from "./deal-replies.js";
import { draftOf, resetDraft } from "./review-state.js";

let ui = {
  render: function () {},
  notify: function () {}
};

export function initDealReviews(options) {
  ui = Object.assign(ui, options || {});
}

export function handleReviewField(dealId, field, value) {
  if (field !== "rating") return;
  draftOf(dealId).rating = Number(value) || 5;
}

export function handleReviewTag(dealId, tag, checked) {
  const draft = draftOf(dealId);
  if (checked) {
    if (draft.tags.indexOf(tag) !== -1) return;
    if (draft.tags.length >= 3) {
      ui.notify(new Error("最多選 3 個標籤"));
      ui.render();
      return;
    }
    draft.tags.push(tag);
    return;
  }
  draft.tags = draft.tags.filter(function (item) { return item !== tag; });
}

export function handleReviewComment(dealId, value) {
  draftOf(dealId).comment = value;
}

async function submitReview(dealId) {
  const draft = draftOf(dealId);
  const rating = Number(draft.rating);
  const comment = String(draft.comment || "").trim();

  if (!(rating >= 1 && rating <= 5)) return ui.notify(new Error("請選擇星等"));
  if (draft.tags.length > 3) return ui.notify(new Error("最多選 3 個標籤"));
  if (comment.length > 100) return ui.notify(new Error("評語不可超過 100 字"));

  try {
    await api.submitReview(dealId, {
      rating: rating,
      tags: draft.tags.slice(),
      comment: comment
    });
    resetDraft(dealId);
    await reloadRoom();
  } catch (error) {
    ui.notify(error);
  }
}

export async function handleReviewAction(action, data) {
  if (action !== "deal-review") return false;
  await submitReview(data.deal);
  return true;
}

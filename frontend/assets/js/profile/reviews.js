/* 個人資訊評價區：角色 tabs、摘要、分布、排序、卡片與載入更多。 */

import { renderStars } from "../demo/views/stars.js";
import { escapeHtml } from "./settings-form.js";
import { reviewCardHTML } from "./review-card.js";

export const ROLE_LABELS = {
  seller: "買家給的評價",
  buyer: "釣客給的評價"
};

const STARS = [5, 4, 3, 2, 1];
const SORTS = [["newest", "最新"], ["highest", "最高"], ["lowest", "最低"]];

export function roleCounts(rating) {
  const value = rating || {};
  return {
    seller: Number((value.as_seller || {}).count || 0),
    buyer: Number((value.as_buyer || {}).count || 0)
  };
}

export function defaultRole(counts) {
  if (Number(counts.seller) > 0) return "seller";
  if (Number(counts.buyer) > 0) return "buyer";
  return null;
}

export function reviewTabsHTML(activeRole, counts) {
  if (!(Number(counts.seller) > 0 && Number(counts.buyer) > 0)) return "";
  return '<div class="profile-review__tabs" role="tablist" aria-label="評價角色">' +
    ["seller", "buyer"].map(function (role) {
      return '<button class="profile-review__tab' + (role === activeRole ? " is-on" : "") +
        '" type="button" role="tab" aria-selected="' + (role === activeRole) +
        '" data-review-role="' + role + '">' + ROLE_LABELS[role] +
        ' <span>' + Number(counts[role] || 0) + '</span></button>';
    }).join("") + "</div>";
}

export function reviewSummaryHTML(summary) {
  const value = summary || { score: 0, count: 0 };
  return '<div class="profile-review__summary">' +
    '<b>' + Number(value.score || 0).toFixed(1).replace(/\.0$/, "") + "</b>" +
    renderStars(value.score, { count: value.count }) +
    '<span>' + Number(value.count || 0) + " 則</span></div>";
}

/* 分布只在 3 則以上顯示；點同一顆星可再點一次清除篩選。 */
export function reviewDistributionHTML(summary, activeRating) {
  const value = summary || {};
  const count = Number(value.count || 0);
  if (count < 3) return "";
  const distribution = value.distribution || {};
  const active = Number(activeRating) || 0;
  return '<div class="profile-review__distribution" role="group" aria-label="依星等篩選">' +
    STARS.map(function (star) {
      const amount = Number(distribution[String(star)] || 0);
      const percent = count ? Math.round(amount / count * 100) : 0;
      return '<button type="button" class="profile-review__bar' +
        (active === star ? " is-on" : "") + '" data-review-rating="' + star +
        '" aria-pressed="' + (active === star) + '">' +
        '<span class="profile-review__bar-label">' + star + ' 星</span>' +
        '<span class="profile-review__bar-track"><span style="width:' + percent + '%"></span></span>' +
        '<span class="profile-review__bar-count">' + amount + "</span></button>";
    }).join("") + "</div>";
}

export function reviewSortHTML(active) {
  const current = active === "highest" || active === "lowest" ? active : "newest";
  return '<label class="profile-review__sort"><span>排序</span><select data-review-sort>' +
    SORTS.map(function (option) {
      return '<option value="' + option[0] + '"' +
        (option[0] === current ? " selected" : "") + ">" + option[1] + "</option>";
    }).join("") + "</select></label>";
}

function listHTML(reviews, now) {
  return '<div class="profile-review__list">' +
    reviews.map(function (review) { return reviewCardHTML(review, now); }).join("") + "</div>";
}

export function reviewSectionHTML(state, now) {
  const value = state || {};
  const counts = value.counts || { seller: 0, buyer: 0 };
  const tabs = reviewTabsHTML(value.role, counts);
  if (!value.role) return tabs + '<p class="profile-empty">尚無評價</p>';

  const reviews = value.reviews || [];
  const count = Number((value.summary || {}).count || 0);
  const summary = count > 0 ? reviewSummaryHTML(value.summary) : "";
  const distribution = count > 0
    ? reviewDistributionHTML(value.summary, value.rating)
    : "";
  const toolbar = count > 0
    ? '<div class="profile-review__toolbar">' + reviewSortHTML(value.sort) + "</div>"
    : "";

  let body = "";
  if (value.error) {
    body = '<p class="state-msg state-msg--error">' + escapeHtml(value.error) + "</p>" +
      '<button class="btn btn--ghost btn--sm" type="button" data-review-retry>重新載入</button>';
    if (reviews.length) body += listHTML(reviews, now);
  } else if (value.loading && !reviews.length) {
    body = '<p class="state-msg">載入評價中…</p>';
  } else if (!reviews.length) {
    if (value.rating) {
      body = '<p class="profile-empty">沒有 ' + Number(value.rating) + " 星的評價</p>" +
        '<button class="btn btn--ghost btn--sm" type="button" data-review-clear-rating>清除星等篩選</button>';
    } else {
      body = '<p class="profile-empty">尚無評價</p>';
    }
  } else {
    body = listHTML(reviews, now);
    if (value.hasMore) {
      body += '<div class="profile-review__more"><button class="btn btn--ghost btn--sm" type="button" ' +
        'data-review-more' + (value.loading ? " disabled" : "") + ">" +
        (value.loading ? "載入中…" : "載入更多") + "</button></div>";
    }
  }

  return tabs + summary + distribution + toolbar + body;
}

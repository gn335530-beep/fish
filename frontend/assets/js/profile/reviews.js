/* 個人資訊評價區：角色 tabs、摘要、卡片與載入更多（分布／排序留給 ticket 07）。 */

import { renderStars } from "../demo/views/stars.js";
import { escapeHtml } from "./settings-form.js";
import { mediaSrc } from "./media.js";

export const ROLE_LABELS = {
  seller: "買家給的評價",
  buyer: "釣客給的評價"
};

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

export function relativeTime(iso, now) {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "";
  const current = now instanceof Date ? now : new Date(now || Date.now());
  const diff = current.getTime() - date.getTime();
  if (diff < 60000) return "剛剛";
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return minutes + " 分鐘前";
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return hours + " 小時前";
  const days = Math.floor(diff / 86400000);
  if (days < 30) return days + " 天前";
  return date.getFullYear() + "/" + String(date.getMonth() + 1).padStart(2, "0") + "/" +
    String(date.getDate()).padStart(2, "0");
}

function avatarOf(review) {
  const name = review.reviewer_name || "會員";
  const url = mediaSrc(review.reviewer_avatar_url);
  const inner = url
    ? '<img src="' + escapeHtml(url) + '" alt="' + escapeHtml(name) + '">'
    : "<span>" + escapeHtml(name.slice(0, 1)) + "</span>";
  return '<a class="avatar profile-review__avatar' + (url ? " avatar--img" : "") +
    '" href="profile.html?id=' + encodeURIComponent(review.reviewer_id) + '">' + inner + "</a>";
}

export function reviewCardHTML(review, now) {
  const name = review.reviewer_name || "會員";
  const tags = (review.tags || []).map(function (tag) {
    return "<span>" + escapeHtml(tag) + "</span>";
  }).join("");
  return '<article class="profile-review__card">' +
    '<div class="profile-review__who">' + avatarOf(review) +
    '<div class="profile-review__person"><a href="profile.html?id=' + encodeURIComponent(review.reviewer_id) + '">' +
    escapeHtml(name) + "</a><span>" + escapeHtml(relativeTime(review.created_at, now)) + "</span></div></div>" +
    '<div class="profile-review__rating">' + renderStars(review.rating, { label: review.rating + " 星" }) + "</div>" +
    (tags ? '<div class="profile-review__tags">' + tags + "</div>" : "") +
    (review.comment ? '<p class="profile-review__comment">' + escapeHtml(review.comment) + "</p>" : "") +
    "</article>";
}

export function reviewSectionHTML(state, now) {
  const value = state || {};
  const counts = value.counts || { seller: 0, buyer: 0 };
  const tabs = reviewTabsHTML(value.role, counts);
  if (!value.role) return tabs + '<p class="profile-empty">尚無評價</p>';

  let body = "";
  if (value.error) {
    body = '<p class="state-msg state-msg--error">' + escapeHtml(value.error) + "</p>" +
      '<button class="btn btn--ghost btn--sm" type="button" data-review-retry>重新載入</button>';
  } else if (value.loading && !(value.reviews || []).length) {
    body = '<p class="state-msg">載入評價中…</p>';
  } else if (!(value.reviews || []).length) {
    body = '<p class="profile-empty">尚無評價</p>';
  } else {
    body = '<div class="profile-review__list">' +
      value.reviews.map(function (review) { return reviewCardHTML(review, now); }).join("") + "</div>";
    if (value.hasMore) {
      body += '<div class="profile-review__more"><button class="btn btn--ghost btn--sm" type="button" ' +
        'data-review-more' + (value.loading ? " disabled" : "") + ">" +
        (value.loading ? "載入中…" : "載入更多") + "</button></div>";
    }
  }

  const summary = value.summary && Number(value.summary.count) > 0
    ? reviewSummaryHTML(value.summary)
    : "";
  return tabs + summary + body;
}

/* 個人資訊評價卡：評價者、日期、星等、標籤、評語與訂單商品照片。 */

import { renderStars } from "../demo/views/stars.js";
import { escapeHtml } from "./settings-form.js";
import { mediaSrc } from "./media.js";

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

function productOf(product) {
  const item = product || {};
  const label = item.fish_species || item.title || "商品";
  const alt = (item.title || label) + " 商品照片";
  const url = mediaSrc(item.photo_url);
  const photo = url
    ? '<img class="profile-review__photo" src="' + escapeHtml(url) + '" alt="' + escapeHtml(alt) + '">'
    : '<span class="profile-review__photo profile-review__photo--empty">照片未提供</span>';
  return '<figure class="profile-review__product">' + photo +
    "<figcaption>" + escapeHtml(label) + "</figcaption></figure>";
}

/* 照片不連商品頁、不做 lightbox；超過 3 張只顯示 +N。 */
export function reviewProductsHTML(review) {
  const products = (review && review.products) || [];
  if (!products.length) {
    return '<div class="profile-review__products profile-review__products--empty">' +
      '<span class="profile-review__photo profile-review__photo--empty">照片未提供</span></div>';
  }
  const count = Number(review.product_count == null ? products.length : review.product_count);
  const shown = products.slice(0, 3);
  const extra = Math.max(0, count - shown.length);
  return '<div class="profile-review__products">' + shown.map(productOf).join("") +
    (extra > 0 ? '<span class="profile-review__product-more">+' + extra + "</span>" : "") +
    "</div>";
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
    reviewProductsHTML(review) +
    "</article>";
}

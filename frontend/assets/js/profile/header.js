/* 個人資訊頁標題列：頭像、名字、角色評分 chips、地區、成交數與驗證標章。 */

import { avatarHTML, escapeHtml } from "./settings-form.js";
import { mediaSrc } from "./media.js";

const CHIPS = [
  { key: "as_seller", label: "買家給的評價" },
  { key: "as_buyer", label: "釣客給的評價" }
];

function scoreText(score) {
  return Number(score || 0).toFixed(1).replace(/\.0$/, "");
}

function ratingOf(rating, key) {
  return (rating && rating[key]) || { score: 0, count: 0 };
}

export function ratingChips(rating) {
  const rows = CHIPS.filter(function (chip) {
    return Number(ratingOf(rating, chip.key).count) > 0;
  });
  if (!rows.length) {
    return '<span class="profile-chip profile-chip--none">尚無評價</span>';
  }
  return rows.map(function (chip) {
    const value = ratingOf(rating, chip.key);
    return '<span class="profile-chip"><span>' + chip.label + "</span><b>" +
      scoreText(value.score) + "</b><em>" + Number(value.count || 0) + " 則</em></span>";
  }).join("");
}

export function profileHeaderHTML(user, options) {
  const person = user || {};
  const settings = options || {};
  const name = person.display_name || "會員";
  const region = person.region
    ? '<span class="profile-meta__region">' + escapeHtml(person.region) + "</span>"
    : "";
  const verified = person.is_verified
    ? '<span class="profile-badge">已驗證</span>'
    : "";
  const action = settings.isSelf
    ? '<a class="btn btn--primary" href="settings.html">編輯個人資訊</a>'
    : "";

  return '<header class="profile-head">' +
    '<div class="profile-head__main">' +
    avatarHTML(name, mediaSrc(person.avatar_url), "profile-head__avatar") +
    "<div>" +
    '<h1 class="profile-head__name">' + escapeHtml(name) + verified + "</h1>" +
    '<div class="profile-meta">' + region +
    '<span>成交 ' + Number(person.completed_deals || 0) + " 筆</span></div>" +
    '<div class="profile-chips">' + ratingChips(person.rating) + "</div>" +
    "</div></div>" +
    '<div class="profile-actions">' + action + "</div>" +
    "</header>";
}

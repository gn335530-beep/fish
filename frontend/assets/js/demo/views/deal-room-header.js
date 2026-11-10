/* 交易房標題列內容：對方名稱、評價星星與電話。 */

import { escapeHtml } from "./html.js";
import { renderStars } from "./stars.js";

export function dealRoomHeader(peer) {
  const person = peer || {};
  const score = Number(person.rating_score) || 0;
  const count = Number(person.review_count) || 0;
  const phone = String(person.username || "").trim();
  const empty = count === 0 || score === 0;
  const displayScore = empty ? 0 : score;
  const stars = renderStars(displayScore, { count: count }) +
    (empty ? '<span class="fm-deal__nostar">尚無評價</span>' : "");
  const phoneHtml = phone
    ? '<a class="fm-deal__phone" href="tel:' + escapeHtml(phone) + '" aria-label="撥打電話 ' +
      escapeHtml(phone) + '"><span>撥打電話</span><b>' + escapeHtml(phone) + '</b></a>'
    : '<span class="fm-deal__phone fm-deal__phone--none">電話未提供</span>';
  return {
    title: person.display_name || "對方",
    sub: '<div class="fm-deal__stars">' + stars + '</div>',
    aside: phoneHtml
  };
}

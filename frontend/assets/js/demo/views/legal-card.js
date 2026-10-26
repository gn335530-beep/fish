/* 法規告知卡與取消上架確認卡。 */

import { escapeHtml } from "./html.js";

export function renderLegalCard(card) {
  const accept = card.accept_label || "我已了解並確認";
  const decline = card.decline_label || "取消";
  return '<div class="fm-card fm-card--legal">' +
    '<b>' + escapeHtml(card.title || "販賣漁獲需具備合法證照") + '</b>' +
    '<p>' + escapeHtml(card.text || "") + '</p>' +
    '<a href="' + escapeHtml(card.law_url || "") + '" target="_blank" rel="noopener">參考：' +
    escapeHtml(card.law_name || "漁業法") + '</a>' +
    '<div class="fm-card__acts">' +
    '<button type="button" class="fm-card__primary" data-action="legal-accept" aria-label="' +
    escapeHtml(accept) + '">' + escapeHtml(accept) + '</button>' +
    '<button type="button" data-action="legal-decline" aria-label="' +
    escapeHtml(decline) + '">' + escapeHtml(decline) + '</button>' +
    '</div>' +
    '</div>';
}

export function renderCancelCard() {
  return '<div class="fm-card fm-card--legal">' +
    '<b>確定取消上架？</b>' +
    '<p>此對話會一併刪除。</p>' +
    '<div class="fm-card__acts">' +
    '<button type="button" class="fm-card__primary" data-action="cancel-listing-confirm" aria-label="確定取消上架">確定取消</button>' +
    '<button type="button" data-action="cancel-listing-dismiss" aria-label="繼續上架">繼續上架</button>' +
    '</div>' +
    '</div>';
}

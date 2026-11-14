/* 資料來源卡：顯示後端工具產生的外部連結，最多 3 個。 */

import { escapeHtml } from "./html.js";
import { safeSources } from "../ai/sources.js";

export function renderSourcesCard(card) {
  const sources = safeSources(card && card.sources);
  if (!sources.length) return "";
  return '<div class="fm-card fm-card--sources">' +
    '<div class="fm-sources__title">資料來源</div>' +
    '<ol class="fm-sources__list">' +
    sources.map(function (source) {
      return '<li><a href="' + escapeHtml(source.url) + '" target="_blank" rel="noopener noreferrer">' +
        escapeHtml(source.title || source.url) + '</a></li>';
    }).join("") +
    '</ol></div>';
}

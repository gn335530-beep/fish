/* 評價星星共用渲染：唯讀輸出，狀態與字形可供後續可點星等重用。 */

import { escapeHtml } from "./html.js";

const GLYPHS = { full: "★", half: "★", empty: "☆" };
const POSITIONS = [1, 2, 3, 4, 5];

function clampScore(score) {
  return Math.max(0, Math.min(5, Number(score) || 0));
}

export function starStates(score) {
  const value = clampScore(score);
  return POSITIONS.map(function (position) {
    if (value >= position) return "full";
    if (value >= position - 0.5) return "half";
    return "empty";
  });
}

export function starGlyph(state) {
  return GLYPHS[state] || GLYPHS.empty;
}

function labelOf(score, settings) {
  if (settings.label) return settings.label;
  const value = String(clampScore(score)).replace(/\.0$/, "");
  if (settings.count == null) return "評價 " + value + " 分";
  return "評價 " + value + " 分，" + (Number(settings.count) || 0) + " 則";
}

export function renderStars(score, options) {
  const settings = options || {};
  const marks = starStates(score).map(function (state) {
    return '<span class="fm-star fm-star--' + state + '" aria-hidden="true">' +
      starGlyph(state) + "</span>";
  }).join("");
  return '<span class="fm-stars" role="img" aria-label="' +
    escapeHtml(labelOf(score, settings)) + '">' + marks + "</span>";
}

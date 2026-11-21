/* 上架草稿卡：草稿欄位與確認上架／修改／取消操作。 */

import { escapeHtml, money, resolveImage, definitionRow } from "./html.js";

export function renderDraftCard(card, publishing) {
  const draft = card.draft || {};
  const busy = publishing ? ' aria-busy="true"' : "";
  const disabled = publishing ? " disabled" : "";
  const editButton = card.hide_edit
    ? ""
    : '<button type="button" data-action="edit-draft"' + disabled + '>修改草稿</button>';
  return '<div class="fm-card fm-card--draft"' + busy + '>' +
    '<b>上架草稿</b>' +
    '<dl>' +
    definitionRow("魚種", draft.fish_species) +
    definitionRow("尾數", draft.quantity + " 尾") +
    definitionRow("處理", draft.condition) +
    definitionRow("整批售價", money(draft.price)) +
    definitionRow("每台斤", draft.price_per_taijin == null ? "—" : money(draft.price_per_taijin)) +
    '</dl>' +
    (draft.photo_url ? '<img class="fm-card__thumb" src="' + escapeHtml(resolveImage(draft.photo_url)) + '" alt="商品照片">' : "") +
    '<div class="fm-card__acts">' +
    '<button type="button" class="fm-card__primary" data-action="publish"' + disabled + '>' +
    (publishing ? "上架中…" : "確認上架") + '</button>' +
    editButton +
    '<button type="button" data-action="cancel-listing"' + disabled + '>取消上架</button>' +
    '</div>' +
    '</div>';
}

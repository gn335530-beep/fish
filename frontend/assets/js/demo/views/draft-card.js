/* 上架草稿卡：草稿欄位與確認上架／修改／取消操作。 */

import { escapeHtml, money, resolveImage, definitionRow } from "./html.js";

export function renderDraftCard(card) {
  const draft = card.draft || {};
  const quantity = Number(draft.quantity || 0);
  const unitPrice = quantity > 0 ? Math.round(Number(draft.price || 0) / quantity) : 0;
  return '<div class="fm-card fm-card--draft">' +
    '<b>上架草稿</b>' +
    '<dl>' +
    definitionRow("魚種", draft.fish_species) +
    definitionRow("總重", draft.weight_kg + " kg") +
    definitionRow("尾數", draft.quantity + " 尾") +
    definitionRow("處理", draft.condition) +
    definitionRow("整批售價", money(draft.price) + (draft.price_auto ? "（自動計算）" : "")) +
    definitionRow("每台斤", draft.price_per_taijin == null ? "—" : money(draft.price_per_taijin)) +
    definitionRow("每尾均價", unitPrice > 0 ? money(unitPrice) : "—") +
    '</dl>' +
    (draft.photo_url ? '<img class="fm-card__thumb" src="' + escapeHtml(resolveImage(draft.photo_url)) + '" alt="商品照片">' : "") +
    '<div class="fm-card__acts">' +
    '<button type="button" class="fm-card__primary" data-action="publish">確認上架</button>' +
    '<button type="button" data-action="edit-draft">修改草稿</button>' +
    '<button type="button" data-action="cancel-listing">取消上架</button>' +
    '</div>' +
    '</div>';
}

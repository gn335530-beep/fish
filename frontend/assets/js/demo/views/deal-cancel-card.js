/* 確認取消卡：填寫自由文字原因後送出取消。 */

import { state } from "../store.js";
import { escapeHtml } from "./html.js";

export function renderCancelConfirmCard(card) {
  const dealId = escapeHtml(card.deal_id);
  return '<div class="fm-card fm-card--cancel-confirm">' +
    '<span class="fm-card__cancel-title">確認取消</span>' +
    '<p class="fm-cancel__hint">請填寫取消原因</p>' +
    '<textarea data-cancel-note maxlength="200" rows="3" aria-label="取消原因" placeholder="請填寫取消原因">' +
    escapeHtml(state.cancelNote || "") + '</textarea>' +
    '<div class="fm-card__acts">' +
    '<button type="button" data-action="cancel-dismiss">取消</button>' +
    '<button type="button" class="fm-card__primary" data-action="cancel-submit" data-deal="' +
    dealId + '">送出</button>' +
    '</div>' +
    '</div>';
}

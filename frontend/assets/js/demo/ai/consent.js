/* 販賣法規告知卡：第一次販賣前確認，同意只由 seller-consent 端點寫入。 */

import { normalize, resetContext, startListing } from "./listing.js";

export const LAW_URL = "https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=M0050001";

export function needsConsent(user) {
  return !(user && user.seller_terms_accepted_at);
}

export function consentCard() {
  return {
    type: "legal_consent",
    title: "販賣漁獲需具備合法證照",
    text: "販賣魚貨（一支釣）需依照法規申請相關合法證照；未申請可依法開罰新臺幣三萬元以上三十萬元以下罰鍰。",
    law_name: "漁業法",
    law_url: LAW_URL,
    accept_label: "我已了解並確認",
    decline_label: "取消"
  };
}

export function requestConsent(context, text) {
  return {
    context: Object.assign({}, normalize(context), {
      mode: "idle",
      draft: null,
      editing: null,
      choosing_edit: null,
      market_quoted: false,
      pending_sale_text: text,
      awaiting_consent: true
    }),
    replies: [
      { text: "販賣魚貨前，請先確認相關法規。" },
      { card: consentCard() }
    ]
  };
}

/* 確認成功後清掉等待狀態，並用使用者原本那句話重新進入上架。 */
export async function resumeAfterConsent(context, user) {
  const source = (context && context.pending_sale_text) || "我要賣魚";
  const base = Object.assign({}, normalize(context), {
    mode: "idle",
    draft: null,
    pending_sale_text: null,
    awaiting_consent: false
  });
  const result = await startListing(source, user, base);
  return {
    context: result.context,
    replies: [{ text: "已確認，請依序告訴我缺少的欄位。" }].concat(result.replies)
  };
}

export function declineConsent() {
  return {
    context: resetContext(),
    replies: [{ text: "未確認，暫停販賣功能。想賣魚時再重新確認。" }]
  };
}

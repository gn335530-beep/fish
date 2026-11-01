/* 訊息卡片路由：各卡片型別位於獨立模組。 */

import { escapeHtml } from "./html.js";
import { renderProductCard } from "./product-card.js";
import { renderDraftCard } from "./draft-card.js";
import { renderDealCard, renderReviewCard } from "./deal-cards.js";
import { renderMarketCard } from "./market-card.js";
import { renderLegalCard, renderCancelCard } from "./legal-card.js";
import { renderDealCancelledCard } from "./deal-cancelled-card.js";

export function renderCard(card, messageId) {
  if (!card) return "";
  if (card.type === "product") return renderProductCard(card);
  if (card.type === "draft") return renderDraftCard(card);
  if (card.type === "market_quote") return renderMarketCard(card, messageId);
  if (card.type === "legal_consent") return renderLegalCard(card);
  if (card.type === "draft_cancel") return renderCancelCard(card);
  if (card.type === "deal") return renderDealCard(card, messageId);
  if (card.type === "deal_cancelled") return renderDealCancelledCard(card);
  if (card.type === "review") return renderReviewCard(card);
  return '<div class="fm-card fm-card--plain">' + escapeHtml(card.title || "訊息卡片") + '</div>';
}

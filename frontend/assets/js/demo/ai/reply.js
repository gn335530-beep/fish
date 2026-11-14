/* AI 回覆批次：文字、行情卡、資料來源卡與商品卡；卡片只由工具結果產生。 */

import * as api from "../api.js";
import { handleMessage } from "./llm.js";
import { buildMarketQuoteCard } from "./market-quote-card.js";
import { productCard, shoppingContext } from "./shopping.js";
import { safeSources } from "./sources.js";

export async function requestReply(room, message, text, user) {
  let llm;
  try {
    llm = await api.aiReply(room.id, message.id, room.context || {});
  } catch (error) {
    llm = { handled: false, error_code: "LLM_UPSTREAM_ERROR", retryable: false };
  }
  return handleMessage(room.context, text, user, llm);
}

function marketCard(market) {
  if (!market || market.found !== true) return null;
  return buildMarketQuoteCard(market, { speciesName: market.species_name || market.official_name });
}

function productCards(llm) {
  if (!llm.tool_results || !Array.isArray(llm.tool_results.products)) return [];
  return llm.tool_results.products.slice(0, 5);
}

export function llmBatch(llm) {
  const replies = [];
  if (llm.reply_text) replies.push({ text: llm.reply_text });

  if (llm.intent === "CHAT") {
    const market = marketCard(llm.tool_results && llm.tool_results.market);
    if (market) replies.push({ card: market });
  }

  const sources = safeSources(llm.sources);
  if (sources.length) replies.push({ card: { type: "sources", sources: sources } });

  if (llm.intent !== "PRODUCT_RECOMMEND") return { replies: replies };
  const products = productCards(llm);
  products.forEach(function (product) { replies.push({ card: productCard(product) }); });
  const context = products.length
    ? shoppingContext(products.map(function (product) { return product.id; }))
    : null;
  return { replies: replies, context: context };
}

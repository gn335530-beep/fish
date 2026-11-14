/* AI 回覆批次：文字、行情卡、資料來源卡與商品卡；卡片只由工具結果產生。 */

import * as api from "../api.js";
import { INTENT } from "./intents.js";
import { handleMessage } from "./llm.js";
import { buildMarketQuoteCard } from "./market-quote-card.js";
import { productCard, shoppingContext } from "./shopping.js";
import { safeSources } from "./sources.js";

export async function requestReply(room, message, userText, user) {
  let llm;
  try {
    llm = await api.aiReply(room.id, message.id, room.context || {});
  } catch (error) {
    llm = { handled: false, error_code: "LLM_UPSTREAM_ERROR", retryable: false };
  }
  /* 保留原始結果給 flow 判斷是否為可重試的配額錯誤。 */
  return Object.assign({}, await handleMessage(room.context, userText, user, llm), { llmResult: llm });
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

  if (llm.intent === INTENT.CHAT || llm.intent === INTENT.WEB) {
    const market = marketCard(llm.tool_results && llm.tool_results.market);
    if (market) replies.push({ card: market });
  }

  const sources = safeSources(llm.sources);
  if (sources.length) replies.push({ card: { type: "sources", sources: sources } });

  if (llm.intent !== INTENT.PRODUCT_RECOMMEND) return { replies: replies };
  const products = productCards(llm);
  products.forEach(function (product) { replies.push({ card: productCard(product) }); });
  const context = products.length
    ? shoppingContext(products.map(function (product) { return product.id; }))
    : null;
  return { replies: replies, context: context };
}

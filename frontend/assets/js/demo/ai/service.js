/* 規則式 AI：意圖路由、上架槽位追問、導購與指涉。之後換 LLM 只需改這支。 */

import * as api from "../api.js";
import { INTENT, detectIntent } from "./rules.js";
import { extractSlots, mergeDraft, nextMissingSlot, draftReady } from "./slots.js";
import { editText, editPhoto } from "./editing.js";
import { resolveReferent } from "./referents.js";
import { shoppingReply } from "./shopping.js";
import { marketReply } from "./market.js";
import { speciesById, ensureSpecies } from "./species.js";
import { QUESTIONS, ASK_AGAIN } from "./prompts.js";

function makeContext(mode, draft, lastCards) {
  return {
    mode: mode,
    draft: draft,
    last_cards: lastCards,
    selected_product_id: null,
    editing: null
  };
}

export function resetContext() {
  return makeContext("idle", null, []);
}

function normalize(context) {
  const source = context || {};
  return {
    mode: source.mode || "idle",
    draft: source.draft || null,
    last_cards: source.last_cards || [],
    selected_product_id: source.selected_product_id || null,
    editing: source.editing || null
  };
}

function advance(ctx) {
  if (draftReady(ctx.draft)) {
    return {
      context: ctx,
      replies: [
        { text: "資料都齊了，請確認內容後按發布。" },
        { card: { type: "draft", draft: ctx.draft } }
      ]
    };
  }
  const missing = nextMissingSlot(ctx.draft);
  return { context: ctx, replies: [{ text: QUESTIONS[missing] }] };
}

function startListing(text) {
  const draft = mergeDraft(null, extractSlots(text, null));
  return advance(makeContext("listing", draft, []));
}

function continueListing(ctx, text) {
  if (detectIntent(text) === INTENT.CANCEL) {
    return { context: resetContext(), replies: [{ text: "好，已取消這次上架。" }] };
  }
  const missing = nextMissingSlot(ctx.draft);
  const found = extractSlots(text, missing);
  if (!Object.keys(found).length) {
    return { context: ctx, replies: [{ text: ASK_AGAIN[missing] }] };
  }
  return advance(makeContext("listing", mergeDraft(ctx.draft, found), []));
}

export function handlePhoto(context, photoUrl) {
  const ctx = normalize(context);
  const edited = editPhoto(ctx, photoUrl);
  if (edited) return edited;
  if (ctx.mode !== "listing" || !ctx.draft) {
    return { context: ctx, replies: [{ text: "照片收到，但目前沒有進行中的上架。" }] };
  }
  const draft = mergeDraft(ctx.draft, { photo_url: photoUrl });
  return advance(makeContext("listing", draft, []));
}

/* ---- 指涉 ---- */

async function explainAt(ctx, index) {
  const id = ctx.last_cards[index];
  try {
    const product = await api.getProduct(id);
    if (!product) {
      return { context: ctx, replies: [{ text: "這筆商品已不存在，請重新查詢。" }] };
    }
    const explained = await explainProduct(product, ctx);
    return {
      context: Object.assign({}, explained.context || ctx, {
        mode: "shopping",
        selected_product_id: id
      }),
      replies: [{ text: "第 " + (index + 1) + " 個商品：" }].concat(explained.replies)
    };
  } catch (error) {
    return {
      context: ctx,
      replies: [{ text: error.status === 404 ? "這筆商品已不存在，請重新查詢。" : "無法載入商品，請稍後再試。" }]
    };
  }
}

async function handleReferent(ctx, ref) {
  if (ref.status === "none") {
    return { context: ctx, replies: [{ text: "目前沒有上一批商品，請先說想找什麼魚。" }] };
  }
  if (ref.status === "out-of-range") {
    return { context: ctx, replies: [{ text: "上一批只有 " + ref.count + " 個商品，請說第 1 到 " + ref.count + " 個。" }] };
  }
  if (ref.status === "ambiguous") {
    const selected = ctx.selected_product_id ? ctx.last_cards.indexOf(ctx.selected_product_id) : -1;
    if (selected === -1) {
      return { context: ctx, replies: [{ text: "上一批有 " + ref.count + " 個商品，請說「第幾個」。" }] };
    }
    return explainAt(ctx, selected);
  }
  return explainAt(ctx, ref.index);
}

/* ---- 商品諮詢 ---- */

export async function explainProduct(product, context) {
  if (!(await ensureSpecies())) {
    return { context: context || null, replies: [{ text: "目前無法取得魚種資料，請稍後再試。" }] };
  }
  const spice = speciesById(product.species_id);
  const replies = [];

  if (spice) {
    replies.push({
      text: product.fish_species + "：" + spice.texture + "，" + spice.bones + "。適合 " + spice.cooking.join("、") + "。"
    });
  } else {
    replies.push({ text: product.fish_species + "：料理資料暫無，暫無行情。" });
  }

  replies.push({
    text: "這批 " + product.weight_kg + " kg / " + product.quantity + " 尾，整批 " +
      product.price + " 元，可售 " + product.available + " 尾。保存建議 0–4°C，2 日內食用。"
  });

  return { context: context || null, replies: replies };
}

/* ---- 對外單一入口 ---- */

export async function handleText(context, text, user) {
  const ctx = normalize(context);
  const source = String(text || "").trim();
  if (!(await ensureSpecies())) {
    return { context: ctx, replies: [{ text: "目前無法取得魚種資料，請確認伺服器後再試。" }] };
  }

  const edited = editText(ctx, source);
  if (edited) return edited;

  if (ctx.mode !== "listing") {
    const referent = resolveReferent(source, ctx.last_cards.length);
    if (referent) return handleReferent(ctx, referent);
  }

  if (ctx.mode === "listing" && ctx.draft) return continueListing(ctx, source);

  const intent = detectIntent(source);
  if (intent === INTENT.SELL) return startListing(source);
  if (intent === INTENT.CANCEL) {
    return { context: resetContext(), replies: [{ text: "好，已經重來。想賣魚或找魚都可以直接說。" }] };
  }
  if (intent === INTENT.MARKET) {
    const result = await marketReply(source, user);
    return { context: ctx, replies: result.replies };
  }
  if (intent === INTENT.BUY) return shoppingReply(source, user);

  return {
    context: ctx,
    replies: [{ text: "你是想賣魚，還是想找魚？也可以直接說「我要賣魚」或「今天有什麼魚」。" }]
  };
}

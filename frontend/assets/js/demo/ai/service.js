/* 規則式 AI：意圖路由、上架槽位追問、基本導購。之後換 LLM 只需改這支。 */

import * as api from "../api.js";
import { INTENT, detectIntent } from "./rules.js";
import { extractSlots, mergeDraft, nextMissingSlot, draftReady } from "./slots.js";
import { speciesList, speciesById, findSpecies, findRegion, ensureSpecies } from "./species.js";

const QUESTIONS = {
  fish_species: "請問釣到的是什麼魚？",
  weight_kg: "這批總重大約幾公斤？（也可以說台斤）",
  quantity: "總共幾尾？",
  condition: "目前的處理方式是？活體、放血冰鎮、三去處理或冷凍。",
  photo_url: "還需要一張實拍照片，請點輸入框左邊的相機圖示上傳。",
  price: "整批預計賣多少元？"
};

const ASK_AGAIN = {
  fish_species: "還缺魚種，請問釣到的是什麼魚？",
  weight_kg: "還缺重量，這批大約幾公斤？",
  quantity: "還缺尾數，總共幾尾？",
  condition: "還缺處理方式：活體、放血冰鎮、三去處理或冷凍。",
  photo_url: "還缺照片，請點相機圖示上傳一張實拍照片。",
  price: "還缺售價，整批預計賣多少元？"
};

export function resetContext() {
  return { mode: "idle", draft: null, last_cards: [] };
}

function normalize(context) {
  const source = context || {};
  return {
    mode: source.mode || "idle",
    draft: source.draft || null,
    last_cards: source.last_cards || []
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
  return advance({ mode: "listing", draft: draft, last_cards: [] });
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
  return advance({ mode: "listing", draft: mergeDraft(ctx.draft, found), last_cards: [] });
}

export function handlePhoto(context, photoUrl) {
  const ctx = normalize(context);
  if (ctx.mode !== "listing" || !ctx.draft) {
    return { context: ctx, replies: [{ text: "照片收到，但目前沒有進行中的上架。" }] };
  }
  const draft = mergeDraft(ctx.draft, { photo_url: photoUrl });
  return advance({ mode: "listing", draft: draft, last_cards: [] });
}

/* ---- 導購 ---- */

const COOKING_WORDS = ["清蒸", "煮湯", "紅燒", "香煎", "煎", "烤", "川燙", "生魚片", "涼拌", "炒", "滷"];

function cookingMatches(text) {
  const hasTextureHint = /刺少|長輩|小孩|牙口/.test(text);
  const method = COOKING_WORDS.find(function (word) { return text.indexOf(word) !== -1; });
  if (!hasTextureHint && !method) return null;

  return speciesList().filter(function (spice) {
    if (hasTextureHint && spice.bones.indexOf("多") !== -1) return false;
    if (method && spice.cooking.indexOf(method) === -1) return false;
    return true;
  }).map(function (spice) { return spice.id; });
}

function productCard(product) {
  return {
    type: "product",
    product_id: product.id,
    title: product.title,
    photo_url: product.photo_url,
    price: product.price,
    unit_price: product.unit_price,
    weight_kg: product.weight_kg,
    quantity: product.quantity,
    available: product.available,
    condition: product.condition,
    region: product.region,
    location: product.location,
    catch_time: product.catch_time,
    seller_id: product.seller_id
  };
}

async function shoppingReply(ctx, text, user) {
  const spice = findSpecies(text);
  let region = findRegion(text);
  if (!region && /附近|我這邊|附近有什麼/.test(text) && user && user.city) region = user.city;
  const cooking = cookingMatches(text);
  const rows = await api.listProducts({ limit: 100 });

  let matched = rows.filter(function (p) { return Number(p.available) > 0; });
  if (spice) matched = matched.filter(function (p) { return p.species_id === spice.id; });
  if (region) matched = matched.filter(function (p) { return String(p.region || "").indexOf(region) !== -1; });
  if (cooking) matched = matched.filter(function (p) { return cooking.indexOf(p.species_id) !== -1; });
  matched = matched.slice(0, 5);

  if (!matched.length) {
    return {
      context: { mode: "shopping", draft: null, last_cards: [] },
      replies: [{ text: "目前沒有符合條件的商品。可以換個魚種或地區再試。" }]
    };
  }

  const replies = [{ text: "找到 " + matched.length + " 筆商品。" }];
  matched.forEach(function (p) { replies.push({ card: productCard(p) }); });

  return {
    context: {
      mode: "shopping",
      draft: null,
      last_cards: matched.map(function (p) { return p.id; })
    },
    replies: replies
  };
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
    replies.push({ text: product.fish_species + "：目前沒有這魚種的料理資料。" });
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

  if (ctx.mode === "listing" && ctx.draft) return continueListing(ctx, source);

  const intent = detectIntent(source);
  if (intent === INTENT.SELL) return startListing(source);
  if (intent === INTENT.CANCEL) {
    return { context: resetContext(), replies: [{ text: "好，已經重來。想賣魚或找魚都可以直接說。" }] };
  }
  if (intent === INTENT.BUY) return shoppingReply(ctx, source, user);

  return {
    context: ctx,
    replies: [{ text: "你是想賣魚，還是想找魚？也可以直接說「我要賣魚」或「今天有什麼魚」。" }]
  };
}

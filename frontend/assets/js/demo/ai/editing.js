/* 草稿逐欄修改：一次只重問一個欄位，取消時回復修改前的草稿。 */

import { INTENT, detectIntent } from "./rules.js";
import { extractSlots } from "./slots.js";
import { mergeDraft } from "./draft.js";
import { EDIT_PROMPTS } from "./prompts.js";

export const DRAFT_FIELDS = [
  { slot: "fish_species", label: "魚種" },
  { slot: "weight_kg", label: "總重" },
  { slot: "quantity", label: "尾數" },
  { slot: "condition", label: "處理方式" },
  { slot: "photo_url", label: "照片" },
  { slot: "price", label: "售價" }
];

const LABELS = {};
DRAFT_FIELDS.forEach(function (field) { LABELS[field.slot] = field.label; });

export function beginEdit(context, slot) {
  if (!context || context.mode !== "listing" || !context.draft) return null;
  if (!LABELS[slot]) return null;
  return {
    context: Object.assign({}, context, {
      editing: { slot: slot, backup: Object.assign({}, context.draft) }
    }),
    replies: [{ text: EDIT_PROMPTS[slot] + "（輸入「取消」可保留原值）" }]
  };
}

function finish(context, slot, found) {
  const changes = {};
  changes[slot] = found[slot];
  /* 魚種名稱與 species_id 必須一起更新；未知魚種要清成 null。 */
  if (slot === "fish_species") changes.species_id = found.species_id || null;
  const draft = mergeDraft(context.draft, changes);
  const next = { editing: null, draft: draft };
  const refreshMarket = slot === "fish_species" || slot === "weight_kg";
  if (refreshMarket) next.market_quoted = false;
  return {
    context: Object.assign({}, context, next),
    replies: refreshMarket
      ? [{ text: "已更新" + LABELS[slot] + "。" }]
      : [{ text: "已更新" + LABELS[slot] + "。" }, { card: { type: "draft", draft: draft } }],
    refresh_market: refreshMarket
  };
}

export function editText(context, text) {
  const editing = context.editing;
  if (!editing) return null;

  if (detectIntent(text) === INTENT.CANCEL) {
    const draft = Object.assign({}, editing.backup);
    return {
      context: Object.assign({}, context, { editing: null, draft: draft }),
      replies: [{ text: "已取消修改。" }, { card: { type: "draft", draft: draft } }]
    };
  }

  if (editing.slot === "photo_url") {
    return { context: context, replies: [{ text: EDIT_PROMPTS.photo_url }] };
  }

  const found = extractSlots(text, editing.slot);
  if (editing.slot === "price") {
    const priceFound = {};
    if (found.price !== undefined) priceFound.price = found.price;
    if (found.price_per_taijin !== undefined) priceFound.price_per_taijin = found.price_per_taijin;
    if (priceFound.price === undefined && priceFound.price_per_taijin === undefined) {
      return { context: context, replies: [{ text: "沒有讀到售價。" + EDIT_PROMPTS.price }] };
    }
    const draft = mergeDraft(context.draft, priceFound);
    return {
      context: Object.assign({}, context, { editing: null, draft: draft }),
      replies: [
        { text: "已更新售價。" },
        { card: { type: "draft", draft: draft } }
      ]
    };
  }

  const value = found[editing.slot];
  if (value === undefined) {
    return { context: context, replies: [{ text: "沒有讀到" + LABELS[editing.slot] + "。" + EDIT_PROMPTS[editing.slot] }] };
  }
  return finish(context, editing.slot, found);
}

export function editPhoto(context, photoUrl) {
  const editing = context.editing;
  if (!editing) return null;
  if (editing.slot !== "photo_url") {
    return {
      context: context,
      replies: [{ text: "目前正在修改" + LABELS[editing.slot] + "，照片先保留。" }]
    };
  }
  const draft = Object.assign({}, context.draft, { photo_url: photoUrl });
  return {
    context: Object.assign({}, context, { editing: null, draft: draft }),
    replies: [{ text: "已更新照片。" }, { card: { type: "draft", draft: draft } }]
  };
}

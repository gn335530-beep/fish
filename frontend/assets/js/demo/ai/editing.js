/* 草稿逐欄修改：一次只重問一個欄位，取消時回復修改前的草稿。 */

import { INTENT, detectIntent, isCancelListing } from "./rules.js";
import { extractSlots } from "./slots.js";
import { mergeDraft } from "./draft.js";
import { EDIT_PROMPTS } from "./prompts.js";
import { DRAFT_FIELDS, EDIT_LABELS, findEditField, stripFieldWords } from "./edit-fields.js";

const EDIT_ASK = "你想修改哪一項？（" + DRAFT_FIELDS.map(function (field) {
  return field.label;
}).join("、") + "）";

function askText(context) {
  return {
    context: context,
    replies: [{ text: EDIT_ASK }]
  };
}

export function askDraftEdit(context) {
  if (!context || !context.draft) {
    return { context: context, replies: [{ text: "目前沒有可修改的草稿。" }] };
  }
  return askText(Object.assign({}, context, { choosing_edit: true, editing: null }));
}

function finish(context, slot, found) {
  const changes = {};
  changes[slot] = found[slot];
  /* 魚種名稱換了先清空代碼，等方式確定後由行情查詢補上。 */
  if (slot === "fish_species") changes.species_code = found.species_code || null;
  const draft = mergeDraft(context.draft, changes);
  const next = { editing: null, draft: draft };
  const refreshMarket = slot === "fish_species" || slot === "weight_kg";
  if (refreshMarket) next.market_quoted = false;
  return {
    context: Object.assign({}, context, next),
    replies: refreshMarket
      ? [{ text: "已更新" + EDIT_LABELS[slot] + "。" }]
      : [{ text: "已更新" + EDIT_LABELS[slot] + "。" }, { card: { type: "draft", draft: draft } }],
    refresh_market: refreshMarket
  };
}

function editPrice(context, text) {
  const found = extractSlots(text, "price");
  const priceFound = {};
  if (found.price !== undefined) priceFound.price = found.price;
  if (found.price_per_taijin !== undefined) priceFound.price_per_taijin = found.price_per_taijin;
  if (priceFound.price === undefined && priceFound.price_per_taijin === undefined) return null;
  const draft = mergeDraft(context.draft, priceFound);
  return {
    context: Object.assign({}, context, { editing: null, draft: draft }),
    replies: [
      { text: "已更新售價。" },
      { card: { type: "draft", draft: draft } }
    ]
  };
}

/* 只套用文字裡的新值；讀不到就回 null，讓呼叫端決定要重問還是直接採用。 */
function applyValue(context, text) {
  const slot = context.editing.slot;
  if (slot === "photo_url") return null;
  if (slot === "price") return editPrice(context, text);
  const found = extractSlots(text, slot);
  if (found[slot] === undefined) return null;
  return finish(context, slot, found);
}

function askAgain(context, slot) {
  return {
    context: context,
    replies: [{ text: "沒有讀到" + EDIT_LABELS[slot] + "。" + EDIT_PROMPTS[slot] }]
  };
}

/* 使用者可用「重量」「售價」等字眼指定欄位；同一句有新值時直接套用。 */
export function chooseEditField(context, text) {
  if (detectIntent(text) === INTENT.CANCEL) {
    return {
      context: Object.assign({}, context, { choosing_edit: null }),
      replies: [{ text: "已取消修改。" }]
    };
  }
  const match = findEditField(text);
  if (!match) {
    return askText(Object.assign({}, context, { choosing_edit: true }));
  }
  const started = beginEdit(Object.assign({}, context, { choosing_edit: null }), match.slot);
  if (!started) return askText(context);
  const value = stripFieldWords(text, match);
  const applied = value ? applyValue(started.context, value) : null;
  return applied || started;
}

export function beginEdit(context, slot) {
  if (!context || context.mode !== "listing" || !context.draft) return null;
  if (!EDIT_LABELS[slot]) return null;
  return {
    context: Object.assign({}, context, {
      choosing_edit: null,
      editing: { slot: slot, backup: Object.assign({}, context.draft) }
    }),
    replies: [{ text: EDIT_PROMPTS[slot] + "（輸入「取消」可保留原值）" }]
  };
}

export function editText(context, text) {
  const editing = context.editing;
  if (!editing) return null;

  /* 取消整筆上架要落到 continueListing → requestCancel，不能當成取消欄位修改。 */
  if (isCancelListing(text)) return null;

  if (detectIntent(text) === INTENT.CANCEL) {
    const draft = Object.assign({}, editing.backup);
    return {
      context: Object.assign({}, context, { editing: null, draft: draft }),
      replies: [{ text: "已取消修改。" }]
    };
  }

  if (editing.slot === "photo_url") {
    return { context: context, replies: [{ text: EDIT_PROMPTS.photo_url }] };
  }

  return applyValue(context, text) || askAgain(context, editing.slot);
}

export function editPhoto(context, photoUrl) {
  const editing = context.editing;
  if (!editing) return null;
  if (editing.slot !== "photo_url") {
    return {
      context: context,
      replies: [{ text: "目前正在修改" + EDIT_LABELS[editing.slot] + "，照片先保留。" }]
    };
  }
  const draft = Object.assign({}, context.draft, { photo_url: photoUrl });
  return {
    context: Object.assign({}, context, { editing: null, draft: draft }),
    replies: [{ text: "已更新照片。" }, { card: { type: "draft", draft: draft } }]
  };
}

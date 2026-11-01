/* 草稿修改與行情卡：只有改魚種需要重查行情，尾數變更不重查。 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  service, editing, resetCalls, resetFixture, marketCalls, cardOf
} from "./listing-market-fixtures.js";

test.beforeEach(resetFixture);

const USER = { city: "高雄市", seller_terms_accepted_at: "2026-10-27T00:00:00.000Z" };

function completedDraft(overrides) {
  return Object.assign({
    fish_species: "花枝",
    species_code: 2166,
    quantity: 2,
    condition: "放血冰鎮",
    photo_url: "/uploads/a.jpg",
    price: 1000
  }, overrides || {});
}

test("修改魚種會先清空 species_code，等行情查詢再補上新代碼", async function () {
  const context = { mode: "listing", market_quoted: true, draft: completedDraft() };
  const cleared = editing.editText(editing.beginEdit(context, "fish_species").context, "海鱸");
  assert.equal(cleared.context.draft.fish_species, "海鱸");
  assert.equal(cleared.context.draft.species_code, null);

  const editingContext = editing.beginEdit(context, "fish_species").context;
  const resolved = await service.handleText(editingContext, "海鱸", USER);
  assert.equal(resolved.context.draft.species_code, 1073);
});

test("修改魚種後立刻用新魚種重新送行情卡", async function () {
  const context = { mode: "listing", market_quoted: true, draft: completedDraft() };
  const editContext = editing.beginEdit(context, "fish_species").context;
  resetCalls();
  const edited = await service.handleText(editContext, "海鱸", USER);
  const card = cardOf(edited);
  assert.equal(edited.context.draft.species_code, 1073);
  assert.equal(card.species_code, 1073);
  assert.equal(card.species_name, "海鱸");
  assert.ok(edited.replies.some(function (reply) {
    return reply.card && reply.card.type === "draft";
  }));
});

test("修改尾數不重查行情，直接重畫草稿卡", async function () {
  const context = { mode: "listing", market_quoted: true, draft: completedDraft() };
  const editContext = editing.beginEdit(context, "quantity").context;
  resetCalls();
  const edited = await service.handleText(editContext, "3 尾", USER);
  assert.equal(edited.context.draft.quantity, 3);
  assert.equal(marketCalls().length, 0);
  assert.ok(edited.replies.some(function (reply) {
    return reply.card && reply.card.type === "draft";
  }));
});

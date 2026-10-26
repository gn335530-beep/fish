/* 上架行情卡：修改魚種或重量後用新資料重新查行情。 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  service, editing, resetCalls, resetFixture, marketCalls, cardOf
} from "./listing-market-fixtures.js";

test.beforeEach(resetFixture);

test("修改重量後重新查行情，避免參考金額過期", async function () {
  const started = await service.handleText(null, "我要賣花枝 3公斤 2尾 放血冰鎮", { city: "高雄市" });
  const quoted = await service.handlePhoto(started.context, "/uploads/a.jpg", { city: "高雄市" });
  resetCalls();
  const edited = await service.handleText(quoted.context, "4 公斤", { city: "高雄市" });
  assert.equal(edited.context.draft.weight_kg, 4);
  assert.equal(marketCalls().length, 2);
  const card = cardOf(edited);
  assert.equal(card.weight_kg, 4);
  assert.equal(card.estimated_total, 1333);
});

test("修改魚種會同步 species_id，未知魚種清為 null", function () {
  const context = {
    mode: "listing",
    market_quoted: true,
    draft: { fish_species: "花枝", species_id: "cuttlefish", weight_kg: 3, quantity: 2 }
  };
  const known = editing.editText(editing.beginEdit(context, "fish_species").context, "海鱸");
  assert.equal(known.context.draft.fish_species, "海鱸");
  assert.equal(known.context.draft.species_id, "seabass");

  const unknown = editing.editText(editing.beginEdit(context, "fish_species").context, "鮭魚");
  assert.equal(unknown.context.draft.fish_species, "鮭魚");
  assert.equal(unknown.context.draft.species_id, null);
});

test("修改魚種後立刻用新魚種重新送行情卡", async function () {
  const started = await service.handleText(
    null,
    "我要賣花枝 3公斤 2尾 放血冰鎮 每台斤 200",
    { city: "高雄市" }
  );
  const quoted = await service.handlePhoto(started.context, "/uploads/a.jpg", { city: "高雄市" });
  const editContext = editing.beginEdit(quoted.context, "fish_species").context;
  resetCalls();
  const edited = await service.handleText(editContext, "海鱸", { city: "高雄市" });
  const card = cardOf(edited);
  assert.equal(card.species_id, "seabass");
  assert.equal(card.species_name, "海鱸");
  assert.ok(edited.replies.some(function (reply) {
    return reply.card && reply.card.type === "draft";
  }));
});

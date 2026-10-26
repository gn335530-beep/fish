/* 販賣法規告知：第一次賣魚先出卡，確認後接回原句；已確認不再問。 */

import test from "node:test";
import assert from "node:assert/strict";

const SPECIES = [
  { id: "cuttlefish", name: "花枝", alias: [], category: "ceph", texture: "", bones: "無刺", cooking: ["炒"] }
];

globalThis.window = {
  HaisenAPI: {
    listSpecies: async function () { return SPECIES; },
    request: async function () { throw new Error("不應呼叫 API"); }
  }
};

const { loadSpecies } = await import("../assets/js/demo/ai/species.js");
const service = await import("../assets/js/demo/ai/service.js");
await loadSpecies();

function textOf(result) {
  return result.replies.map(function (reply) { return reply.text || ""; }).join("\n");
}

function consentCardOf(result) {
  const reply = result.replies.find(function (item) {
    return item.card && item.card.type === "legal_consent";
  });
  return reply ? reply.card : null;
}

test("第一次販賣先顯示法規告知卡，不建立草稿", async function () {
  const result = await service.handleText(null, "我要賣花枝", { city: "高雄市" });
  const card = consentCardOf(result);
  assert.ok(card);
  assert.match(card.text, /販賣魚貨（一支釣）需依照法規申請相關合法證照/);
  assert.equal(card.law_url, "https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=M0050001");
  assert.equal(card.accept_label, "我已了解並確認");
  assert.equal(card.decline_label, "取消");
  assert.equal(result.context.draft, null);
  assert.equal(result.context.pending_sale_text, "我要賣花枝");
  assert.equal(result.context.awaiting_consent, true);
  assert.doesNotMatch(textOf(result), /重量/);
});

test("已確認的使用者直接進入上架，不再顯示法規卡", async function () {
  const result = await service.handleText(null, "我要賣花枝", {
    city: "高雄市",
    seller_terms_accepted_at: "2026-10-27T00:00:00.000Z"
  });
  assert.equal(consentCardOf(result), null);
  assert.ok(result.context.draft);
  assert.equal(result.context.draft.fish_species, "花枝");
});

test("確認後清掉待販賣狀態，並用原始句子接回上架", async function () {
  const asked = await service.handleText(null, "我要賣花枝", { city: "高雄市" });
  const result = await service.resumeAfterConsent(asked.context, {
    city: "高雄市",
    seller_terms_accepted_at: "2026-10-27T00:00:00.000Z"
  });
  assert.equal(result.context.pending_sale_text, null);
  assert.equal(result.context.awaiting_consent, false);
  assert.equal(result.context.draft.fish_species, "花枝");
  assert.match(textOf(result), /已確認/);
  assert.match(textOf(result), /重量|尾數|處理方式|照片/);
});

test("取消法規確認回到 idle，不建立草稿", function () {
  const result = service.declineConsent({
    mode: "idle",
    draft: null,
    pending_sale_text: "我要賣花枝",
    awaiting_consent: true
  });
  assert.equal(result.context.mode, "idle");
  assert.equal(result.context.draft, null);
  assert.equal(result.context.pending_sale_text, null);
  assert.equal(result.context.awaiting_consent, false);
  assert.match(textOf(result), /未確認/);
});

test("未確認卻有舊的 listing context 時仍先擋下，不繼續補欄位", async function () {
  const result = await service.handleText({
    mode: "listing",
    draft: { fish_species: "花枝", weight_kg: 3, quantity: 2, condition: "放血冰鎮", photo_url: "" }
  }, "3 公斤", { city: "高雄市" });
  assert.ok(consentCardOf(result));
  assert.equal(result.context.awaiting_consent, true);
});

/* 上架批次追問：第一次列出所有缺的非價格欄位，不先問價格。 */

import test from "node:test";
import assert from "node:assert/strict";

const SPECIES = [
  { id: "grouper", name: "石斑", alias: [], category: "fish", texture: "", bones: "刺少", cooking: ["清蒸"] },
  { id: "cuttlefish", name: "花枝", alias: [], category: "ceph", texture: "", bones: "無刺", cooking: ["炒"] }
];

globalThis.window = {
  HaisenAPI: {
    listSpecies: async function () { return SPECIES; }
  }
};

const { loadSpecies } = await import("../assets/js/demo/ai/species.js");
const service = await import("../assets/js/demo/ai/service.js");
const editing = await import("../assets/js/demo/ai/editing.js");
await loadSpecies();

const USER = { seller_terms_accepted_at: "2026-10-27T00:00:00.000Z" };

function textOf(result) {
  return result.replies.map(function (reply) { return reply.text || ""; }).join("\n");
}

test("說要賣花枝時一次問重量、尾數、處理方式與照片，不用還需要", async function () {
  const result = await service.handleText(null, "我要賣花枝", USER);
  const text = textOf(result);
  assert.equal(
    text,
    "請問你要販售魚種的重量、尾數、處理方式，與一張商品照片（可以一次告訴我）。處理方式例如：活體、放血冰鎮。"
  );
  assert.doesNotMatch(text, /還需要/);
  assert.doesNotMatch(text, /價格|多少錢|售價/);
});

test("還沒說魚種時只問想賣什麼魚類", async function () {
  const result = await service.handleText(null, "我要賣魚", USER);
  const text = textOf(result);
  assert.match(text, /請問想要販售什麼魚類/);
  assert.doesNotMatch(text, /重量|尾數|處理方式|照片/);
  assert.doesNotMatch(text, /價格|多少錢|售價/);
});

test("回完魚種後才問重量、處理方式與照片", async function () {
  const started = await service.handleText(null, "我要賣魚", USER);
  assert.equal(textOf(started), "請問想要販售什麼魚類？");
  assert.equal(started.context.draft.fish_species, "");

  const answered = await service.handleText(started.context, "花枝", USER);
  assert.equal(answered.context.draft.fish_species, "花枝");
  assert.equal(
    textOf(answered),
    "請問你要販售魚種的重量、尾數、處理方式，與一張商品照片（可以一次告訴我）。處理方式例如：活體、放血冰鎮。"
  );
  assert.doesNotMatch(textOf(answered), /還需要/);
});

test("未知魚種保留原字串，接著問其他欄位", async function () {
  const result = await service.handleText(null, "我要賣鮭魚", USER);
  assert.equal(result.context.draft.fish_species, "鮭魚");
  assert.match(textOf(result), /重量/);
});

test("第一次已補齊非價格欄位時只追照片，不問價格", async function () {
  const result = await service.handleText(null, "我要賣花枝 3公斤 2尾 放血冰鎮", USER);
  const text = textOf(result);
  assert.match(text, /商品照片/);
  assert.doesNotMatch(text, /還需要/);
  assert.doesNotMatch(text, /價格|多少錢|售價/);
});

test("只回部分欄位後一次只問下一個缺項", async function () {
  const started = await service.handleText(null, "我要賣花枝", USER);
  const weighed = await service.handleText(started.context, "3公斤", USER);
  assert.equal(weighed.context.draft.weight_kg, 3);
  assert.equal(textOf(weighed), "總共幾尾？");

  const counted = await service.handleText(weighed.context, "2尾", USER);
  assert.equal(counted.context.draft.quantity, 2);
  assert.equal(textOf(counted), "目前的處理方式是？（例如：活體、放血冰鎮）");
});

test("編輯重量時說取消上架會進確認流程", async function () {
  const started = await service.handleText(null, "我要賣花枝 3公斤 2尾 放血冰鎮", USER);
  const photographed = await service.handlePhoto(started.context, "/uploads/a.jpg", USER);
  const editingContext = editing.beginEdit(photographed.context, "weight_kg").context;

  const result = await service.handleText(editingContext, "取消上架", USER);

  assert.match(textOf(result), /確定取消上架？此對話會一併刪除/);
  assert.ok(result.replies.some(function (reply) {
    return reply.card && reply.card.type === "draft_cancel";
  }));
});

test("編輯重量時只說取消仍回到修改前草稿", async function () {
  const started = await service.handleText(null, "我要賣花枝 3公斤 2尾 放血冰鎮", USER);
  const photographed = await service.handlePhoto(started.context, "/uploads/a.jpg", USER);
  const editingContext = editing.beginEdit(photographed.context, "weight_kg").context;

  const result = await service.handleText(editingContext, "取消", USER);

  assert.equal(result.context.editing, null);
  assert.equal(result.context.draft.weight_kg, 3);
  assert.match(textOf(result), /已取消修改/);
  assert.ok(!result.replies.some(function (reply) {
    return reply.card && reply.card.type === "draft_cancel";
  }));
});

test("編輯時說不賣了或取消販售也會進確認流程", async function () {
  const started = await service.handleText(null, "我要賣花枝 3公斤 2尾 放血冰鎮", USER);
  const photographed = await service.handlePhoto(started.context, "/uploads/a.jpg", USER);
  const editingContext = editing.beginEdit(photographed.context, "weight_kg").context;

  for (const phrase of ["不賣了", "取消販售"]) {
    const result = await service.handleText(editingContext, phrase, USER);
    assert.match(textOf(result), /確定取消上架/);
    assert.ok(result.replies.some(function (reply) {
      return reply.card && reply.card.type === "draft_cancel";
    }));
  }
});

test("選擇修改欄位時說取消上架也會進確認流程", async function () {
  const started = await service.handleText(null, "我要賣花枝 3公斤 2尾 放血冰鎮", USER);
  const photographed = await service.handlePhoto(started.context, "/uploads/a.jpg", USER);
  const choosing = Object.assign({}, photographed.context, { choosing_edit: true });

  const result = await service.handleText(choosing, "取消上架", USER);

  assert.match(textOf(result), /確定取消上架/);
  assert.ok(result.replies.some(function (reply) {
    return reply.card && reply.card.type === "draft_cancel";
  }));
});

test("照片補齊後才問售價，且可回每台斤或整批", async function () {
  const started = await service.handleText(null, "我要賣花枝 3公斤 2尾 放血冰鎮", USER);
  const photographed = await service.handlePhoto(started.context, "/uploads/a.jpg", USER);
  assert.match(textOf(photographed), /每台斤價格或整批價格/);
  assert.equal(photographed.context.draft.photo_url, "/uploads/a.jpg");
});

test("一次補齊含每台斤售價時直接進草稿卡", async function () {
  const started = await service.handleText(null, "我要賣花枝 3公斤 2尾 放血冰鎮 每台斤 200", USER);
  const photographed = await service.handlePhoto(started.context, "/uploads/a.jpg", USER);
  assert.equal(photographed.context.draft.price_per_taijin, 200);
  assert.equal(photographed.context.draft.price_auto, true);
  assert.equal(photographed.context.draft.price, 1000);
  assert.ok(photographed.replies.some(function (reply) {
    return reply.card && reply.card.type === "draft";
  }));
});

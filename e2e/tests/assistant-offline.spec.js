/* LLM 關閉時的助手：規則式上架、找魚、行情正常；交易房不呼叫 AI。 */

const { test, expect } = require("@playwright/test");
const { loginAsBuyer } = require("../helpers/auth");
const { preparePage } = require("../helpers/prepare-page");

const LOCAL = /^http:\/\/127\.0\.0\.1:(3101|8090)\//;
const FONTS = /^https:\/\/fonts\.(googleapis|gstatic)\.com\//;

async function send(page, text) {
  await page.locator("#fm-input").fill(text);
  await page.locator("#fm-input").press("Enter");
}

test.beforeEach(async function ({ page }) {
  await preparePage(page);
});

test("LLM_ENABLED=false 時規則式助手仍可上架、找魚、查行情，交易房不呼叫 AI", async function ({ page }) {
  const aiCalls = [];
  const external = [];

  page.on("request", function (request) {
    const url = request.url();
    if (url.indexOf("/api/ai/reply") !== -1) aiCalls.push(url);
    if (!LOCAL.test(url) && !FONTS.test(url)) external.push(url);
  });

  await loginAsBuyer(page);
  await page.goto("/pages/index.html");
  await page.locator("#fm-toggle").click();
  await expect(page.locator("#fm-panel")).toBeVisible();

  /* 種子助手房自帶上架 context；新開一間，從 idle 開始驗規則式流程。 */
  await page.locator('#fm-panel [data-action="inbox"]').click();
  await page.locator('#fm-panel [data-action="new-assistant"]').first().click();
  await expect(page.locator("#fm-body")).toContainText("你好，我是小幫手");

  await send(page, "澎湖有什麼魚");
  await expect(page.locator(".fm-card--product").first()).toBeVisible();
  await expect(page.locator("#fm-body")).toContainText("找到");

  await send(page, "今天花枝行情如何");
  await expect(page.locator(".fm-card--market").first()).toBeVisible();

  await send(page, "我要賣魚");
  await expect(page.locator("#fm-body")).toContainText(/想要販售什麼魚類|販賣魚貨前/);
  const legal = page.locator('[data-action="legal-accept"]');
  if (await legal.isVisible()) await legal.click();
  await expect(page.locator("#fm-body")).toContainText("請問想要販售什麼魚類？");
  await send(page, "花枝");
  await expect(page.locator("#fm-body")).toContainText("尾數");

  /* 直接呼叫端點，確認這個 E2E 環境真的沒有啟用外部模型。 */
  const disabled = await page.evaluate(async function () {
    const api = window.HaisenAPI;
    const list = await api.request("/api/conversations", { auth: true });
    const room = list.data.find(function (item) { return item.type === "assistant"; });
    const messages = await api.request(
      "/api/conversations/" + room.id + "/messages?after_seq=0&limit=100", { auth: true }
    );
    const mine = messages.data.filter(function (message) {
      return message.sender_id !== "ai" && message.sender_id !== "system";
    }).pop();
    const reply = await api.request("/api/ai/reply", {
      method: "POST",
      auth: true,
      body: { conversation_id: room.id, message_id: mine.id, context: room.context || {} }
    });
    return reply.data;
  });
  expect(disabled.handled).toBe(false);
  expect(disabled.error_code).toBe("LLM_DISABLED");

  /* 開啟種子交易房；送出訊息不得呼叫 AI 端點。 */
  await page.locator('#fm-panel [data-action="inbox"]').click();
  await page.locator('#fm-panel [data-action="room"][data-room="conv_20261101_001"]').click();
  await expect(page.locator("#fm-title")).toHaveText("陳阿海");

  const aiBeforeDeal = aiCalls.length;
  await send(page, "你好");
  await expect(page.locator("#fm-body")).toContainText("你好");
  await page.waitForTimeout(200);
  expect(aiCalls.length, "交易房不呼叫 AI 端點").toBe(aiBeforeDeal);

  expect(external, "頁面不得呼叫 Gemini 或 Tavily").toEqual([]);
});

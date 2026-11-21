/* listing 模式：模型驅動的上架草稿變更與回覆契約。
   只回草稿變更與下一個動作，不寫資料庫、不發布商品；驗證與防護由本模組把關。 */

const toolLoop = require("./tool-loop");
const tools = require("./tools");
const { mapError, failure } = require("./result");
const { historyFor, contextSummary } = require("./history");
const { logReply } = require("./log");
const { LISTING_PROMPT } = require("./listing-prompt");
const { parseListingOutput, validateDraftChanges, validateCorrections, guardRejected } =
  require("./listing-validate");
const draftHelpers = require("./listing-draft");
const species = require("./listing-species");
const condition = require("./listing-condition");

function isListingContext(context) {
  return !!context && context.mode === "listing" && !!context.draft;
}

function appendHistory(existing, corrections) {
  const base = Array.isArray(existing) ? existing.slice() : [];
  const now = new Date().toISOString();
  corrections.forEach(function (correction) {
    base.push({
      field: correction.field,
      original: correction.original,
      corrected: correction.corrected,
      time: now
    });
  });
  return base;
}

function mergeProtectedNames(existing, added) {
  const merged = Array.isArray(existing) ? existing.slice() : [];
  (added || []).forEach(function (name) {
    if (typeof name === "string" && name && merged.indexOf(name) === -1) merged.push(name);
  });
  return merged;
}

function logListing(baseLog, started, errorCode, report) {
  logReply(Object.assign({}, baseLog, {
    intent: "SELL",
    tokens: report.usage,
    duration_ms: Date.now() - started,
    error_code: errorCode,
    tools: report.toolRuns
  }));
}

/* 模型上下文附上目前草稿魚種的精確候選，讓模型不用猜。 */
async function buildInput(options, config, deadline) {
  const context = contextSummary(options.context);
  const draft = options.context.draft || {};
  context.missing_fields = draftHelpers.missingFields(draft);
  if (draft.fish_species) {
    const budget = Math.min(Math.max(1, deadline - Date.now()), 3000);
    const found = await species.lookup(draft.fish_species, budget);
    context.species_lookup = {
      name: draft.fish_species,
      available: found.available,
      candidates: found.candidates
    };
  }
  return {
    model: config.model,
    timeoutMs: Math.max(1, deadline - Date.now()),
    system: LISTING_PROMPT,
    context: context,
    messages: historyFor(options.conversation.id, options.message)
  };
}

/* 套用魚種或處理方式修正；不合法就丟棄整輪，避免訊息說改了、草稿沒改。 */
async function applyCorrections(changes, corrections, draft, protectedNames, timeoutMs) {
  const applied = Object.assign({}, changes);
  let speciesCorrection = null;
  let conditionCorrection = null;
  corrections.forEach(function (correction) {
    if (correction.field === "fish_species") speciesCorrection = correction;
    if (correction.field === "condition") conditionCorrection = correction;
  });

  if (speciesCorrection) {
    const promoted = await species.validateCorrection(speciesCorrection, draft, protectedNames, timeoutMs);
    applied.fish_species = promoted.fish_species;
    applied.species_code = promoted.species_code;
  }
  if (conditionCorrection) {
    applied.condition = condition.validateCorrection(conditionCorrection, draft);
  }

  /* 非修正的新魚種：只有唯一候選才帶入官方代碼。 */
  if (applied.fish_species && !speciesCorrection) {
    const found = await species.lookup(applied.fish_species, timeoutMs);
    const code = species.singleCode(found);
    if (code != null) applied.species_code = code;
  }
  return applied;
}

/* 處理方式變更驗證：套用待同意縮短版時必須是釣客同意的說法。 */
function validateConditionChange(applied, ctx, userText) {
  if (!Object.prototype.hasOwnProperty.call(applied, "condition")) return;
  const value = applied.condition;
  if (value === ctx.condition_proposal) {
    if (!condition.isAgreement(userText)) throw guardRejected();
    return;
  }
  if (!condition.validCondition(value)) throw guardRejected();
}

/* 新的提議優先；已套用任何處理方式就清掉待同意版。 */
function nextConditionProposal(rawProposal, ctx, applied) {
  if (rawProposal != null) {
    if (!condition.validCondition(rawProposal)) throw guardRejected();
    return rawProposal;
  }
  if (Object.prototype.hasOwnProperty.call(applied, "condition")) return null;
  return ctx.condition_proposal || null;
}

const EDIT_HINT = "想修改直接告訴我。";

/* 草稿卡出現時，助手文字一定要有「想修改直接告訴我」；卡片本身不加。 */
function withEditHint(replyText) {
  const text = String(replyText || "").trim();
  if (text.indexOf("想修改直接告訴我") !== -1) return text;
  return text ? text + "\n" + EDIT_HINT : EDIT_HINT;
}

async function buildResult(parsed, ctx, userText, config) {
  const draft = ctx.draft || {};
  const protectedNames = mergeProtectedNames(ctx.protected_names, parsed.protected_names);
  const changes = validateDraftChanges(parsed.draft_changes, userText);
  const corrections = validateCorrections(parsed.corrections);
  const applied = await applyCorrections(changes, corrections, draft, protectedNames, config.timeoutMs);
  validateConditionChange(applied, ctx, userText);
  const proposal = nextConditionProposal(parsed.condition_proposal, ctx, applied);
  const effective = draftHelpers.effectiveDraft(draft, applied);
  const nextAction = draftHelpers.validateNextAction(parsed.next_action, effective);
  const replyText = nextAction === "show_draft_card" ? withEditHint(parsed.reply_text) : parsed.reply_text;

  return {
    handled: true,
    intent: "SELL",
    slots: {},
    listing: {
      reply_text: replyText || null,
      corrections: corrections,
      draft_changes: applied,
      correction_history: appendHistory(ctx.correction_history, corrections),
      protected_names: protectedNames,
      condition_proposal: proposal,
      next_action: nextAction
    },
    reply_text: null,
    sources: [],
    tool_results: {},
    error_code: null,
    retryable: false
  };
}

async function reply(options, config, baseLog, started) {
  const report = { toolRuns: [], usage: { input: 0, output: 0, total: 0 } };
  const deadline = started + config.timeoutMs;
  try {
    const input = await buildInput(options, config, deadline);
    /* 只提供唯讀的官方字典工具；模型不能用 listing 工具做任何寫入。 */
    const loop = await toolLoop.run(input, {
      timeoutMs: Math.max(1, deadline - Date.now()),
      searchTimeoutMs: Math.max(1, deadline - Date.now()),
      toolDefs: tools.listingDefinitions(),
      toolCtx: { timeoutMs: Math.max(1, deadline - Date.now()) }
    }, report);
    const parsed = parseListingOutput(loop.raw.text);
    const result = await buildResult(parsed, options.context, options.message.text, config);
    logListing(baseLog, started, null, report);
    return result;
  } catch (error) {
    const mapped = mapError(error);
    logListing(baseLog, started, mapped.code, report);
    return failure(mapped.code, mapped.retryable);
  }
}

module.exports = {
  isListingContext: isListingContext,
  reply: reply
};

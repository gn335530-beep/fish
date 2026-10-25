/* 對話式交易引擎入口：掛載面板、載入助手房、事件分流與輪詢。 */

import { state, update, subscribe, totalUnread } from "./store.js";
import * as api from "./api.js";
import { mountPanel } from "./views/panel.js";
import { renderAssistant, renderLogin } from "./views/assistant.js";
import { renderDealRoom } from "./views/deal.js";
import { renderInbox } from "./views/inbox.js";
import { escapeHtml } from "./views/html.js";
import { startPolling, pollNow } from "./poll.js";
import { initFlow, ensureRoom, submitText, submitPhoto } from "./flow.js";
import { initActions, handleAction, startDeal } from "./actions.js";
import { clearUnread } from "./rooms.js";
import { loadSpecies } from "./ai/species.js";

const panel = mountPanel({
  onSubmit: handleSubmit,
  onAction: handleAction,
  onOpen: handleOpen,
  onPhoto: submitPhoto
});

initFlow({
  render: render,
  scrollEnd: function () { panel.scrollToEnd(true); },
  notify: notify
});

initActions({ panel: panel, render: render, notify: notify });

function statusText() {
  if (!state.user) return "未登入";
  if (state.view === "inbox") return "收件匣";
  if (state.room && state.room.type === "deal") {
    return "與 " + (state.room.peer ? state.room.peer.display_name : "對方") + " 洽談中";
  }
  const mode = state.room && state.room.context ? state.room.context.mode : "idle";
  if (mode === "listing") return "上架中";
  if (mode === "shopping") return "找魚中";
  return "找魚・上架・交易";
}

function bodyWith(html) {
  if (!state.notice) return html;
  return '<div class="fm-notice">' + escapeHtml(state.notice) + '</div>' + html;
}

function render() {
  panel.setBadge(state.user ? totalUnread() : 0);
  panel.setStatus(statusText());
  panel.setView(state.view);
  panel.setFooter(state.view !== "inbox" && !!state.user);

  if (state.view === "inbox") {
    panel.setBody(bodyWith(renderInbox()));
    return;
  }
  if (!state.user) {
    panel.setBody(bodyWith(renderLogin()));
    return;
  }
  if (state.view === "deal" && state.room && state.room.type === "deal") {
    panel.setBody(bodyWith(renderDealRoom()));
    panel.scrollToEnd();
    return;
  }
  panel.setBody(bodyWith(renderAssistant()));
  panel.scrollToEnd();
}

function notify(error) {
  update({ notice: error && error.message ? error.message : "操作失敗，請再試一次" });
  render();
  window.setTimeout(function () {
    update({ notice: "" });
    render();
  }, 4000);
}

async function handleOpen() {
  if (!state.user) {
    render();
    return;
  }
  try {
    if (!state.room) await ensureRoom();
    await pollNow();
    if (state.room) {
      await api.markRead(state.room.id);
      update({ conversations: clearUnread(state.conversations, state.room.id) });
    }
    render();
  } catch (error) {
    notify(error);
  }
}

function handleSubmit(text) {
  submitText(text);
}

async function boot() {
  subscribe(render);
  render();
  if (!api.isLoggedIn()) return;

  try {
    await loadSpecies();
  } catch (error) {
    notify(error);
  }
  try {
    const user = await api.fetchMe();
    update({ user: user });
    await ensureRoom();
    await api.markRead(state.room.id);
    startPolling();
    render();
  } catch (error) {
    if (error && (error.status === 401 || error.status === 403)) {
      api.logout();
      update({ user: null, room: null, messages: [], conversations: [], lastSeq: 0 });
      render();
      return;
    }
    notify(error);
  }
}

window.FISHMATCH_BUILD = "v3";
if (window.console && console.info) {
  console.info("[FishMatch] build v3 · API " + (window.HaisenAPI ? window.HaisenAPI.BASE : "未載入"));
}

window.FishMatchBot = {
  open: function () { panel.open(); },
  close: function () { panel.close(); },
  toggle: function () { panel.toggle(); },
  refresh: function () { return pollNow(); },
  startDeal: startDeal
};

boot();

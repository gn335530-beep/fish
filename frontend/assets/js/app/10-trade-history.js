/* 個人抽屜：交易紀錄列表與單筆詳情。 */

const HISTORY_STATUS = {
  DRAFT: "訂單草稿",
  PENDING_REVIEW: "等待確認",
  NEGOTIATING: "協商中",
  CONFIRMED: "已成交",
  CANCELLED: "已取消"
};

let tradeHistory = { loading: false, error: "", rows: [] };
let tradeDetail = { id: "", loading: false, error: "", deal: null };

function hEscape(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
  });
}

function hMoney(value) {
  return "NT$" + Number(value || 0).toLocaleString("en-US");
}

function hDate(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "";
  const pad = function (value) { return String(value).padStart(2, "0"); };
  return (date.getMonth() + 1) + "/" + pad(date.getDate()) + " " +
    pad(date.getHours()) + ":" + pad(date.getMinutes());
}

function hStatus(status) {
  return HISTORY_STATUS[status] || "訂單";
}

function hReview(row) {
  if (row.deal_status !== "CONFIRMED") return "—";
  if (row.my_reviewed && row.peer_reviewed) return "雙方已評價";
  if (row.my_reviewed) return "你已評價，對方待評價";
  if (row.peer_reviewed) return "對方已評價，待你評價";
  return "待評價";
}

function historyItem(row) {
  return '<button class="history__item" type="button" data-deal-open="' + hEscape(row.id) + '">' +
    '<span class="history__top"><b>' + hEscape(hStatus(row.deal_status)) + '</b>' +
    '<em>' + hEscape(hDate(row.confirmed_at || row.created_at)) + '</em></span>' +
    '<span class="history__peer">' + hEscape(row.peer ? row.peer.display_name : "對方") + '</span>' +
    '<span class="history__meta">' + Number(row.item_count || 0) + ' 項 · ' +
    Number(row.total_quantity || 0) + ' 尾 · ' + hMoney(row.final_price) + '</span>' +
    '<span class="history__review">評價：' + hEscape(hReview(row)) + '</span>' +
    '</button>';
}

function tradeHistoryHTML() {
  const head = '<div class="drawer__sec"><div class="history__head">' +
    '<button class="drawer__back" type="button" data-drawer-profile>← 個人資訊</button>' +
    '<h4>交易紀錄</h4></div>';

  if (tradeHistory.loading) return head + '<p class="drawer__note">載入中…</p></div>';
  if (tradeHistory.error) {
    return head + '<p class="drawer__note">' + hEscape(tradeHistory.error) + '</p>' +
      '<button class="btn btn--ghost btn--sm" type="button" data-history-retry>重新載入</button></div>';
  }
  if (!tradeHistory.rows.length) return head + '<p class="drawer__note">目前沒有交易紀錄。</p></div>';
  return head + '<div class="history">' + tradeHistory.rows.map(historyItem).join("") + '</div></div>';
}

function detailItem(item) {
  const photo = window.HaisenAPI && window.HaisenAPI.photoUrl
    ? window.HaisenAPI.photoUrl(item.photo_url)
    : "";
  const subtotal = Math.round(Number(item.unit_price || 0) * Number(item.quantity || 0));
  return '<li>' +
    (photo ? '<img src="' + hEscape(photo) + '" alt="">' : "") +
    '<span class="history__item-main"><b>' + hEscape(item.title) + '</b><em>' +
    Number(item.quantity || 0) + ' 尾 × ' + hMoney(item.unit_price) + '</em></span>' +
    '<span class="history__item-price">' + hMoney(subtotal) + '</span>' +
    '</li>';
}

function tradeDetailHTML() {
  const head = '<div class="drawer__sec"><div class="history__head">' +
    '<button class="drawer__back" type="button" data-detail-back>← 交易紀錄</button>' +
    '<h4>訂單詳情</h4></div>';

  if (tradeDetail.loading) return head + '<p class="drawer__note">載入中…</p></div>';
  if (tradeDetail.error) {
    return head + '<p class="drawer__note">' + hEscape(tradeDetail.error) + '</p>' +
      '<button class="btn btn--ghost btn--sm" type="button" data-detail-retry>重新載入</button></div>';
  }

  const deal = tradeDetail.deal;
  if (!deal) return head + '<p class="drawer__note">找不到這筆訂單。</p></div>';
  const terms = deal.deal_terms || {};
  const review = deal.deal_status === "CONFIRMED"
    ? (deal.my_reviewed ? "你已評價" : "尚未評價")
    : "—";
  return head +
    '<div class="history__summary"><b>' + hEscape(hStatus(deal.deal_status)) + '</b>' +
    '<span>' + hEscape(hDate(deal.confirmed_at || deal.created_at)) + '</span></div>' +
    '<p class="drawer__note">與 ' + hEscape(deal.peer ? deal.peer.display_name : "對方") + '</p>' +
    '<ul class="history__items">' + (deal.items || []).map(detailItem).join("") + '</ul>' +
    '<dl class="history__terms">' +
    (terms.final_price ? '<div><dt>整單金額</dt><dd>' + hMoney(terms.final_price) + '</dd></div>' : '') +
    (terms.meetup_location ? '<div><dt>面交地點</dt><dd>' + hEscape(terms.meetup_location) + '</dd></div>' : '') +
    (terms.meetup_time ? '<div><dt>面交時間</dt><dd>' + hEscape(hDate(terms.meetup_time)) + '</dd></div>' : '') +
    '</dl>' +
    '<p class="drawer__note">評價：' + hEscape(review) +
    (deal.peer_reviewed ? " · 對方已評價" : "") + '</p>';
}

async function openTradeHistory() {
  if (!getUser()) {
    setDrawerView("history");
    return;
  }
  tradeHistory = { loading: true, error: "", rows: tradeHistory.rows };
  setDrawerView("history");
  try {
    const response = await window.HaisenAPI.request("/api/deals", { auth: true });
    tradeHistory = { loading: false, error: "", rows: response.data || [] };
  } catch (error) {
    tradeHistory = { loading: false, error: error.message || "載入失敗", rows: [] };
  }
  if (drawerView === "history") renderDrawer();
}

async function openTradeDetail(dealId) {
  tradeDetail = {
    id: dealId,
    loading: true,
    error: "",
    deal: tradeDetail.id === dealId ? tradeDetail.deal : null
  };
  setDrawerView("detail");
  try {
    const response = await window.HaisenAPI.request(
      "/api/deals/" + encodeURIComponent(dealId), { auth: true }
    );
    tradeDetail = { id: dealId, loading: false, error: "", deal: response.data };
  } catch (error) {
    tradeDetail = { id: dealId, loading: false, error: error.message || "載入失敗", deal: null };
  }
  if (drawerView === "detail" && tradeDetail.id === dealId) renderDrawer();
}

function resetTradeHistory() {
  tradeHistory = { loading: false, error: "", rows: [] };
  tradeDetail = { id: "", loading: false, error: "", deal: null };
}

function bindTradeHistory() {
  document.querySelectorAll("[data-drawer-profile]").forEach(function (node) {
    node.addEventListener("click", function () { setDrawerView("profile"); });
  });
  document.querySelectorAll("[data-history-retry]").forEach(function (node) {
    node.addEventListener("click", openTradeHistory);
  });
  document.querySelectorAll("[data-detail-back]").forEach(function (node) {
    node.addEventListener("click", openTradeHistory);
  });
  document.querySelectorAll("[data-detail-retry]").forEach(function (node) {
    node.addEventListener("click", function () { openTradeDetail(tradeDetail.id); });
  });
  document.querySelectorAll("[data-deal-open]").forEach(function (node) {
    node.addEventListener("click", function () { openTradeDetail(node.dataset.dealOpen); });
  });
}

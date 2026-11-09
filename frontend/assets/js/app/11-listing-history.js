/* 個人抽屜：上架紀錄的 tabs、商品列與載入狀態。 */

/* 格式化集中於 shared/format.js；這裡用延遲取值，classic 腳本不依賴載入順序。 */
function lhEscape(value) { return window.HaisenFormat.escapeHtml(value); }
function lhMoney(value) { return window.HaisenFormat.money(value); }
function lhDate(iso) { return window.HaisenFormat.dateTimeOf(iso); }

const LISTING_STATUS = {
  ACTIVE: { label: "上架中", className: "active" },
  PARTIALLY_RESERVED: { label: "洽談中", className: "partial" },
  SOLD_OUT: { label: "已售出", className: "sold" },
  DELISTED: { label: "已下架", className: "delisted" }
};

const LISTING_TABS = [
  { key: "active", label: "上架中", statuses: ["ACTIVE", "PARTIALLY_RESERVED"], empty: "目前沒有上架中的商品。" },
  { key: "delisted", label: "已下架", statuses: ["DELISTED"], empty: "目前沒有已下架的商品。" },
  { key: "sold", label: "已售出", statuses: ["SOLD_OUT"], empty: "目前沒有已售出的商品。" }
];

let listingHistory = { loading: false, error: "", rows: [], tab: "active" };

function listingTabOf(key) {
  return LISTING_TABS.find(function (tab) { return tab.key === key; }) || LISTING_TABS[0];
}

function listingStatusOf(status) {
  return LISTING_STATUS[status] || { label: status || "未知狀態", className: "unknown" };
}

function listingStatusLabel(status) {
  return listingStatusOf(status).label;
}

function listingStatusClass(status) {
  return listingStatusOf(status).className;
}

function listingRowsFor(tab) {
  return listingHistory.rows.filter(function (row) {
    return tab.statuses.indexOf(row.status) !== -1;
  });
}

function listingCounts() {
  const counts = {};
  LISTING_TABS.forEach(function (tab) {
    counts[tab.key] = listingRowsFor(tab).length;
  });
  return counts;
}

function listingTabsHTML(counts, activeKey) {
  return '<div class="listing__tabs" role="tablist" aria-label="上架紀錄">' +
    LISTING_TABS.map(function (tab) {
      return '<button class="listing__tab' + (tab.key === activeKey ? " is-on" : "") +
        '" type="button" role="tab" aria-selected="' + (tab.key === activeKey ? "true" : "false") +
        '" data-listing-tab="' + tab.key + '">' + tab.label +
        ' <span class="listing__count">' + Number(counts[tab.key] || 0) + '</span></button>';
    }).join("") + '</div>';
}

function listingRowHTML(row) {
  const status = String(row.status || "");
  const photo = window.HaisenAPI && window.HaisenAPI.photoUrl
    ? window.HaisenAPI.photoUrl(row.photo_url)
    : "";
  const species = row.fish_species || row.title || "商品資訊未提供";
  const condition = row.condition || "未提供";
  const quantity = Number(row.quantity || 0);
  const sold = Number(row.sold_quantity || 0);
  const reserved = Number(row.reserved_quantity || 0);
  const delistedAt = status === "DELISTED" && row.delisted_at
    ? '<span>下架：' + lhDate(row.delisted_at) + '</span>'
    : "";
  return '<article class="listing__item" data-listing-row="' + lhEscape(row.id) + '">' +
    (photo
      ? '<img class="listing__photo" src="' + lhEscape(photo) + '" alt="">'
      : '<span class="listing__photo listing__photo--empty"></span>') +
    '<div class="listing__main">' +
    '<div class="listing__top"><span class="listing__species">' + lhEscape(species) + '</span>' +
    '<span class="listing__badge listing__badge--' + listingStatusClass(status) + '">' +
    lhEscape(listingStatusLabel(status)) + '</span></div>' +
    '<span class="listing__condition">' + lhEscape(condition) + '</span>' +
    '<span class="listing__meta">共 ' + quantity + ' 尾 · 已售 ' + sold + ' 尾' +
    (reserved > 0 ? ' · 保留 ' + reserved + ' 尾' : "") + '</span>' +
    '<div class="listing__prices"><span>整批 ' + lhMoney(row.price) + '</span>' +
    (row.price_per_taijin != null ? '<span>' + lhMoney(row.price_per_taijin) + '／台斤</span>' : "") +
    '</div>' +
    '<div class="listing__times"><span>上架：' + lhDate(row.listed_at || row.created_at) + '</span>' +
    delistedAt + '</div>' +
    '</div></article>';
}

function listingHistoryHTML() {
  const head = '<div class="drawer__sec"><div class="history__head">' +
    '<button class="drawer__back" type="button" data-listing-back>← 個人資訊</button>' +
    '<h4>上架紀錄</h4></div>';

  if (listingHistory.loading) return head + '<p class="drawer__note">載入中…</p></div>';
  if (listingHistory.error) {
    return head + '<p class="drawer__note">' + lhEscape(listingHistory.error) + '</p>' +
      '<button class="btn btn--ghost btn--sm" type="button" data-listing-retry>重新載入</button></div>';
  }

  const tab = listingTabOf(listingHistory.tab);
  const rows = listingRowsFor(tab);
  const list = rows.length
    ? '<div class="listing">' + rows.map(listingRowHTML).join("") + '</div>'
    : '<p class="drawer__note">' + tab.empty + '</p>';
  return head + listingTabsHTML(listingCounts(), tab.key) + list + '</div>';
}

async function loadListingHistory() {
  try {
    const rows = await window.HaisenAPI.listMyProducts();
    listingHistory = { loading: false, error: "", rows: rows || [], tab: listingHistory.tab };
  } catch (error) {
    listingHistory = { loading: false, error: error.message || "載入失敗", rows: [], tab: listingHistory.tab };
  }
  if (drawerView === "listings") renderDrawer();
}

async function openListings() {
  if (!getUser()) {
    setDrawerView("listings");
    return;
  }
  listingHistory = { loading: true, error: "", rows: listingHistory.rows, tab: listingHistory.tab };
  setDrawerView("listings");
  await loadListingHistory();
}

function resetListingHistory() {
  listingHistory = { loading: false, error: "", rows: [], tab: "active" };
}

function bindListingHistory() {
  document.querySelectorAll("[data-listing-back]").forEach(function (node) {
    node.addEventListener("click", function () { setDrawerView("profile"); });
  });
  document.querySelectorAll("[data-listing-retry]").forEach(function (node) {
    node.addEventListener("click", loadListingHistory);
  });
  document.querySelectorAll("[data-listing-tab]").forEach(function (node) {
    node.addEventListener("click", function () {
      listingHistory = Object.assign({}, listingHistory, { tab: node.dataset.listingTab });
      renderDrawer();
    });
  });
}

/* 上架紀錄的動作：確認、呼叫 API、成功後重載列表。 */

const LISTING_ACTIONS = {
  delist: {
    api: "delistProduct",
    toast: "已下架",
    confirm: "確定下架？下架後買家將看不到此商品。等待確認的訂單仍會繼續；洽談中的訂單會自動取消。"
  },
  relist: { api: "relistProduct", toast: "已重新上架" },
  delete: {
    api: "deleteProduct",
    toast: "已刪除",
    confirm: "確定刪除？刪除後商品與上架紀錄將永久消失，已成交訂單仍保留。等待確認的訂單仍會繼續；洽談中的訂單會自動取消。"
  }
};

async function listingAction(action, productId) {
  const config = LISTING_ACTIONS[action];
  if (config.confirm && window.confirm && !window.confirm(config.confirm)) return;
  await runListingAction(action, productId);
}

async function runListingAction(action, productId) {
  const config = LISTING_ACTIONS[action];
  listingHistory = listingState({ loading: true, rows: listingHistory.rows, tab: listingHistory.tab });
  renderDrawer();
  try {
    await window.HaisenAPI[config.api](productId);
    toast(config.toast);
    document.dispatchEvent(new CustomEvent("haisen:products-changed"));
  } catch (error) {
    toast(error.message || "操作失敗");
  }
  await loadListingHistory();
}

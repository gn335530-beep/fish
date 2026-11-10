/* 個人資訊商品區控制器：載入自己的／別人的商品、管理模式與生命週期動作。 */

import { productSectionHTML } from "./products.js";
import { escapeHtml } from "./settings-form.js";
import {
  listProducts, listMyProducts, delistProduct, relistProduct, deleteProduct
} from "../api/products.js";

export function createProductsController(options) {
  const section = options.section;
  const userId = options.userId;
  const isSelf = options.isSelf;
  let products = [];
  let loading = true;
  let error = "";
  let managing = false;

  function render() {
    section.hidden = false;
    if (loading) {
      section.innerHTML = '<div class="profile-section__head"><h2>商品</h2></div>' +
        '<p class="state-msg">載入商品中…</p>';
      return;
    }
    if (error) {
      section.innerHTML = '<div class="profile-section__head"><h2>商品</h2></div>' +
        '<p class="state-msg state-msg--error">' + escapeHtml(error) + "</p>" +
        '<button class="btn btn--ghost btn--sm" type="button" data-products-retry>重新載入</button>';
      return;
    }
    section.innerHTML = productSectionHTML(products, { isSelf, managing });
  }

  async function load() {
    loading = true;
    error = "";
    render();
    try {
      products = isSelf ? await listMyProducts() : await listProducts({ seller_id: userId });
    } catch (failure) {
      products = [];
      error = failure.message || "商品載入失敗";
    }
    loading = false;
    render();
  }

  async function syncStatuses() {
    try {
      const fresh = isSelf ? await listMyProducts() : await listProducts({ seller_id: userId });
      const byId = new Map(fresh.map(function (row) { return [String(row.id), row]; }));
      products = products.map(function (row) {
        return byId.get(String(row.id)) || row;
      });
    } catch (error) {
      /* 單筆操作已成功；整批狀態同步失敗時保留目前畫面。 */
    }
  }

  async function run(action, productId) {
    const config = window.HaisenListingActions && window.HaisenListingActions[action];
    if (config && config.confirm && window.confirm && !window.confirm(config.confirm)) return;
    try {
      if (action === "delete") {
        await deleteProduct(productId);
        products = products.filter(function (row) {
          return String(row.id) !== String(productId);
        });
      } else {
        const result = action === "delist"
          ? await delistProduct(productId)
          : await relistProduct(productId);
        products = products.map(function (row) {
          return String(row.id) === String(productId) ? result.product : row;
        });
      }
      await syncStatuses();
      render();
      if (window.toast) window.toast((config && config.toast) || "已更新商品");
      document.dispatchEvent(new CustomEvent("haisen:products-changed"));
    } catch (failure) {
      if (window.toast) window.toast(failure.message || "操作失敗");
    }
  }

  function handleClick(event) {
    if (event.target.closest("[data-profile-manage]")) {
      managing = !managing;
      render();
      return;
    }
    const button = event.target.closest("[data-profile-action]");
    if (button) {
      run(button.dataset.profileAction, button.dataset.productId);
      return;
    }
    if (event.target.closest("[data-products-retry]")) load();
  }

  return { load: load, handleClick: handleClick };
}

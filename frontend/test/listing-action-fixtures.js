/* 上架紀錄動作測試共用：載入 classic 腳本、建立 VM 環境與商品列。 */

import fs from "node:fs";
import vm from "node:vm";

function read(path) {
  return fs.readFileSync(new URL(path, import.meta.url), "utf8");
}

const formatSource = read("../assets/js/shared/format.js");
const historySource = read("../assets/js/app/11-listing-history.js");
const actionsSource = read("../assets/js/app/12-listing-actions.js");

export function newContext(options) {
  const opts = options || {};
  const calls = [];
  const toasts = [];
  const events = [];
  const confirms = [];

  const sandbox = {
    window: {
      HaisenFormat: null,
      confirm: function (message) {
        confirms.push(message);
        return opts.confirm === undefined ? true : opts.confirm;
      },
      HaisenAPI: {
        photoUrl: function (path) { return path; },
        delistProduct: async function (id) {
          calls.push({ action: "delist", id: id });
          if (opts.failure) throw new Error(opts.failure);
        },
        relistProduct: async function (id) {
          calls.push({ action: "relist", id: id });
          if (opts.failure) throw new Error(opts.failure);
        },
        deleteProduct: async function (id) {
          calls.push({ action: "delete", id: id });
          if (opts.failure) throw new Error(opts.failure);
        }
      }
    },
    document: {
      querySelectorAll: function () { return []; },
      dispatchEvent: function (event) { events.push(event.type); }
    },
    CustomEvent: function (type) { this.type = type; },
    getUser: function () { return { id: 1 }; },
    toasts: toasts,
    events: events,
    confirms: confirms,
    renders: 0,
    loads: 0
  };
  const ctx = vm.createContext(sandbox);
  vm.runInContext(formatSource, ctx);
  vm.runInContext(historySource, ctx);
  vm.runInContext(actionsSource, ctx);
  vm.runInContext("drawerView = 'listings'", ctx);
  vm.runInContext("renderDrawer = function () { renders += 1; }", ctx);
  vm.runInContext("loadListingHistory = async function () { loads += 1; }", ctx);
  vm.runInContext("toast = function (message) { toasts.push(message); }", ctx);
  const state = {
    get renders() { return vm.runInContext("renders", ctx); },
    get loads() { return vm.runInContext("loads", ctx); }
  };
  return { ctx: ctx, calls: calls, toasts: toasts, events: events, confirms: confirms, state: state };
}

export function withRows(harness, rows) {
  const state = { loading: false, error: "", rows: rows, tab: "active" };
  vm.runInContext("listingHistory = " + JSON.stringify(state), harness.ctx);
}

export function html(harness) {
  return vm.runInContext("listingHistoryHTML()", harness.ctx);
}

export function row(id, overrides) {
  return Object.assign({
    id: id,
    fish_species: "石斑",
    condition: "活體",
    photo_url: "/uploads/a.jpg",
    quantity: 3,
    sold_quantity: 1,
    reserved_quantity: 0,
    price: 2800,
    price_per_taijin: null,
    listed_at: "2026-11-08T05:00:00.000Z",
    delisted_at: null,
    available: 2,
    status: "ACTIVE"
  }, overrides || {});
}

export const ACTIVE = row("prd_active");
export const DELISTED = row("prd_delisted", {
  quantity: 3, sold_quantity: 1, delisted_at: "2026-11-09T05:00:00.000Z",
  available: 0, status: "DELISTED"
});
export const SOLD = row("prd_sold", {
  quantity: 2, sold_quantity: 2, available: 0, status: "SOLD_OUT"
});

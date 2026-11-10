/* 個人資訊頁：標題列、商品管理與角色評價列表。 */

import { profileHeaderHTML } from "../profile/header.js";
import { createProductsController } from "../profile/products-controller.js";
import { createReviewsController } from "../profile/reviews-controller.js";

const API = window.HaisenAPI;

let profile = null;
let isSelf = false;

function userId() {
  return new URLSearchParams(window.location.search).get("id") || "";
}

function el(id) {
  return document.getElementById(id);
}

function showError(message) {
  const node = document.createElement("p");
  node.className = "state-msg state-msg--error";
  node.textContent = message;
  el("profile-head").replaceChildren(node);
}

async function currentUser() {
  if (!API || !API.getToken()) return null;
  try {
    return await API.me();
  } catch (error) {
    return error && error.status === 401 ? null : API.getUser();
  }
}

function bindStartRoom() {
  el("profile-head").addEventListener("click", function (event) {
    const button = event.target.closest("[data-start-room]");
    if (!button) return;
    if (!API || !API.getToken()) {
      window.location.href = "login.html";
      return;
    }
    if (window.FishMatchBot && window.FishMatchBot.startRoom) {
      window.FishMatchBot.startRoom(button.dataset.startRoom);
    } else if (window.toast) {
      window.toast("助手尚未載入，請重新整理頁面");
    }
  });
}

async function boot() {
  const id = userId();
  if (!id) {
    showError("找不到這個使用者");
    return;
  }

  const viewer = await currentUser();
  try {
    profile = await API.getPublicUser(id);
    isSelf = !!viewer && String(viewer.id) === String(profile.id);
    el("profile-head").innerHTML = profileHeaderHTML(profile, { isSelf: isSelf });
    document.title = profile.display_name + " — 一支釣";

    const products = createProductsController({
      section: el("profile-products"),
      userId: profile.id,
      isSelf: isSelf
    });
    const reviews = createReviewsController({
      section: el("profile-reviews"),
      profile: profile,
      pageSize: 6
    });

    el("profile-products").addEventListener("click", products.handleClick);
    el("profile-reviews").addEventListener("click", reviews.handleClick);
    el("profile-reviews").addEventListener("change", reviews.handleChange);
    bindStartRoom();

    products.load();
    reviews.start();
  } catch (error) {
    showError(error.status === 404 ? "找不到這個使用者" : (error.message || "個人資訊載入失敗"));
  }
}

document.addEventListener("DOMContentLoaded", boot);

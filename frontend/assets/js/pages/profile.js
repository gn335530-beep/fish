/* 個人資訊頁：公開讀取指定使用者，自己的頁面顯示設定入口。 */

import { profileHeaderHTML } from "../profile/header.js";

const API = window.HaisenAPI;

function userId() {
  return new URLSearchParams(window.location.search).get("id") || "";
}

function showError(message) {
  const node = document.createElement("p");
  node.className = "state-msg state-msg--error";
  node.textContent = message;
  document.getElementById("profile-head").replaceChildren(node);
}

async function currentUser() {
  if (!API || !API.getToken()) return null;
  try {
    return await API.me();
  } catch (error) {
    return error && error.status === 401 ? null : API.getUser();
  }
}

async function boot() {
  const id = userId();
  if (!id) {
    showError("找不到這個使用者");
    return;
  }

  const viewer = await currentUser();
  try {
    const profile = await API.getPublicUser(id);
    const isSelf = !!viewer && String(viewer.id) === String(profile.id);
    document.getElementById("profile-head").innerHTML =
      profileHeaderHTML(profile, { isSelf: isSelf });
    document.title = profile.display_name + " — 一支釣";
  } catch (error) {
    showError(error.status === 404 ? "找不到這個使用者" : (error.message || "個人資訊載入失敗"));
  }
}

document.addEventListener("DOMContentLoaded", boot);

/* 設定頁：登入限定，一次儲存頭像、暱稱、電話與地址；成功後同步本機會員與導覽列。 */

import {
  validateSettings, avatarHTML, updatePayload, normalizeCity, normalizePhone
} from "../profile/settings-form.js";
import { mediaSrc } from "../profile/media.js";
import { uploadImage } from "../demo/upload.js";

const API = window.HaisenAPI;
const REGIONS = globalThis.TAIWAN_REGIONS || [];
const FIELDS = {
  display_name: { field: "f-name", error: "e-name" },
  phone: { field: "f-phone", error: "e-phone" },
  city: { field: "f-city", error: "e-city" },
  district: { field: "f-district", error: "e-district" },
  address_line: { field: "f-address", error: "e-address" },
  avatar_url: { field: "f-avatar", error: "e-avatar" }
};

let avatarUrl = "";

function el(id) {
  return document.getElementById(id);
}

function values() {
  return {
    display_name: el("set-name").value,
    phone: el("set-phone").value,
    city: el("set-city").value,
    district: el("set-district").value,
    address_line: el("set-address").value
  };
}

function renderPreview() {
  const name = el("set-name").value.trim() || "會員";
  el("avatar-preview").innerHTML = avatarHTML(name, mediaSrc(avatarUrl), "settings__avatar");
}

function showError(key, message) {
  const target = FIELDS[key] || FIELDS.avatar_url;
  const field = el(target.field);
  const error = el(target.error);
  if (field) field.classList.toggle("invalid", !!message);
  if (error) {
    if (message) error.textContent = message;
    error.classList.toggle("show", !!message);
  }
}

function clearErrors() {
  Object.keys(FIELDS).forEach(function (key) { showError(key, ""); });
}

function showValidation(errors) {
  clearErrors();
  Object.keys(errors).forEach(function (key) { showError(key, errors[key]); });
}

function fillCities(user) {
  const select = el("set-city");
  select.innerHTML = '<option value="">請選擇縣市</option>' + REGIONS.map(function (city) {
    return '<option value="' + city + '">' + city + "</option>";
  }).join("");
  select.value = normalizeCity(user.city, REGIONS);
}

function fillForm(user) {
  el("set-name").value = user.nick || "";
  el("set-phone").value = user.phone || "";
  el("set-district").value = user.district || "";
  el("set-address").value = user.addressLine || "";
  fillCities(user);
  avatarUrl = user.avatarUrl || "";
  renderPreview();
  if (user.id) el("settings-profile").setAttribute("href", "profile.html?id=" + encodeURIComponent(user.id));
}

function busy(on) {
  const button = el("settings-save");
  button.disabled = on;
  button.textContent = on ? "儲存中…" : "儲存變更";
}

async function uploadAvatar(file) {
  const error = el("e-avatar");
  error.textContent = "";
  error.classList.remove("show");
  try {
    avatarUrl = await uploadImage(file);
    renderPreview();
    toast("頭像已上傳，儲存後生效");
  } catch (failure) {
    showError("avatar_url", failure.message || "頭像上傳失敗");
  }
}

function apiFieldError(error) {
  const code = error && error.data && error.data.code;
  if (code === "PHONE_TAKEN") return { key: "phone", message: "此電話號碼已被使用" };
  if (code === "INVALID_PHONE") return { key: "phone", message: "電話需為 09 開頭共 10 碼" };
  if (code === "INVALID_NICKNAME") return { key: "display_name", message: "暱稱需為 2 到 20 字" };
  if (code === "INVALID_AVATAR") return { key: "avatar_url", message: "頭像網址不正確" };
  if (code === "INVALID_REGION") return { key: "city", message: "請選擇有效的縣市" };
  return null;
}

async function save() {
  const input = values();
  const checked = validateSettings(input, REGIONS);
  if (!checked.valid) {
    showValidation(checked.errors);
    return;
  }
  clearErrors();
  busy(true);
  try {
    const profile = await API.updateProfile(updatePayload(input, avatarUrl, REGIONS));
    API.setUser(API.toLocalUser(profile));
    avatarUrl = profile.avatar_url || "";
    fillForm(API.getUser() || {});
    renderAuthNav();
    toast("設定已儲存");
  } catch (error) {
    const fieldError = apiFieldError(error);
    if (fieldError) showError(fieldError.key, fieldError.message);
    else toast(error.message || "儲存失敗");
  } finally {
    busy(false);
  }
}

function bind() {
  el("avatar-pick").addEventListener("click", function () { el("avatar-file").click(); });
  el("avatar-file").addEventListener("change", function (event) {
    const file = event.target.files && event.target.files[0];
    if (file) uploadAvatar(file);
    event.target.value = "";
  });
  el("avatar-remove").addEventListener("click", function () {
    avatarUrl = "";
    renderPreview();
  });
  el("set-name").addEventListener("input", renderPreview);
  el("set-phone").addEventListener("blur", function () {
    el("set-phone").value = normalizePhone(el("set-phone").value);
  });
  el("settings-form").addEventListener("submit", function (event) {
    event.preventDefault();
    save();
  });
}

async function boot() {
  if (!API || !API.getToken()) {
    window.location.replace("login.html");
    return;
  }
  const cached = API.getUser() || {};
  fillForm(cached);
  bind();
  try {
    const fresh = await API.me();
    if (fresh) fillForm(fresh);
  } catch (error) {
    if (error && error.status === 401) window.location.replace("login.html");
  }
}

document.addEventListener("DOMContentLoaded", boot);

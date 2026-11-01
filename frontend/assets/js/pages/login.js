const PHONE_RE = /^09\d{8}$/;
function normPhone(v){ return (v || "").replace(/[\s\-()]/g, ""); }

/* 分頁切換 */
const tabLogin = document.getElementById("tab-login");
const tabRegister = document.getElementById("tab-register");
const formLogin = document.getElementById("form-login");
const formRegister = document.getElementById("form-register");
function showTab(which){
  const isLogin = which === "login";
  tabLogin.classList.toggle("on", isLogin);
  tabRegister.classList.toggle("on", !isLogin);
  formLogin.style.display = isLogin ? "block" : "none";
  formRegister.style.display = isLogin ? "none" : "block";
}
tabLogin.addEventListener("click", ()=> showTab("login"));
tabRegister.addEventListener("click", ()=> showTab("register"));
document.getElementById("to-register").addEventListener("click", ()=> showTab("register"));
document.getElementById("to-login").addEventListener("click", ()=> showTab("login"));

/* 驗證輔助：showError 為 false 時只更新狀態，不顯示錯誤 */
const touched = new Set();
function setField(id, ok, errId, showError){
  const f = document.getElementById(id);
  f.classList.toggle("invalid", showError && !ok);
  f.classList.toggle("valid", showError && ok);
  if(errId) document.getElementById(errId).classList.toggle("show", showError && !ok);
  const control = f.querySelector("input, select, textarea");
  if(control) control.setAttribute("aria-invalid", showError && !ok ? "true" : "false");
  return ok;
}

/* 登入驗證 */
function validateLogin(showErrors){
  const phone = normPhone(document.getElementById("li-phone").value);
  const pass = document.getElementById("li-pass").value;
  let ok = true;
  ok = setField("f-li-phone", PHONE_RE.test(phone), "e-li-phone", !!showErrors || touched.has("li-phone")) && ok;
  ok = setField("f-li-pass", pass.length >= 6, "e-li-pass", !!showErrors || touched.has("li-pass")) && ok;
  document.getElementById("li-submit").disabled = !ok;
  return ok;
}

/* 註冊驗證 */
function validateRegister(showErrors){
  const nick = document.getElementById("rg-nick").value.trim();
  const city = document.getElementById("rg-city").value;
  const phone = normPhone(document.getElementById("rg-phone").value);
  const pass = document.getElementById("rg-pass").value;
  let ok = true;
  ok = setField("f-rg-nick", nick.length >= 2 && nick.length <= 20, "e-rg-nick", !!showErrors || touched.has("rg-nick")) && ok;
  ok = setField("f-rg-city", !!city, "e-rg-city", !!showErrors || touched.has("rg-city")) && ok;
  ok = setField("f-rg-phone", PHONE_RE.test(phone), "e-rg-phone", !!showErrors || touched.has("rg-phone")) && ok;
  ok = setField("f-rg-pass", pass.length >= 6, "e-rg-pass", !!showErrors || touched.has("rg-pass")) && ok;
  document.getElementById("rg-submit").disabled = !ok;
  return ok;
}

function bindValidation(ids, validate){
  ids.forEach(id=>{
    const el = document.getElementById(id);
    el.addEventListener("input", ()=>validate(false));
    el.addEventListener("change", ()=>validate(false));
    el.addEventListener("blur", ()=>{ touched.add(id); validate(false); });
  });
}
bindValidation(["li-phone","li-pass"], validateLogin);
bindValidation(["rg-nick","rg-city","rg-phone","rg-pass"], validateRegister);

/* 送出 */
function finish(kind, nick, phone, city){
  const shownCity = city ? normalizeCityName(city) : "—";
  document.getElementById("auth-modal-ic").textContent = kind === "register" ? "Account Created" : "Welcome Back";
  document.getElementById("auth-modal-title").textContent = kind === "register" ? "帳號已建立" : "登入成功";
  document.getElementById("auth-modal-text").textContent = "歡迎回來，" + (nick || "朋友") + "。前往首頁開始選購或上架。";
  document.getElementById("auth-summary").innerHTML =
    `<div><span>暱稱</span><b>${nick || "—"}</b></div>
     <div><span>電話</span><b>${phone}</b></div>
     <div><span>縣市</span><b>${shownCity}</b></div>`;
  document.getElementById("auth-go").setAttribute("href", "index.html");
  document.getElementById("auth-go").textContent = "前往首頁";
  document.getElementById("auth-modal").classList.add("show");
  /* 登入狀態由 assets/js/api/ 的 HaisenAPI 統一寫入，
     不再於此處覆寫，以免遺失 id 等欄位。 */
}

/* 送出按鈕的忙碌狀態 */
function busy(btn, on){
  if(!btn.dataset.label) btn.dataset.label = btn.textContent;
  btn.disabled = on;
  btn.textContent = on ? "處理中…" : btn.dataset.label;
}

formLogin.addEventListener("submit", async e=>{
  e.preventDefault();
  if(!validateLogin(true)) return;
  if(!window.HaisenAPI){ toast("API 模組尚未載入"); return; }
  const phone = normPhone(document.getElementById("li-phone").value);
  const pass = document.getElementById("li-pass").value;
  const btn = document.getElementById("li-submit");
  busy(btn, true);
  try{
    /* [API 對接點] 會員登入
       METHOD  : POST
       ENDPOINT: /api/auth/login
       PARAMS  : { username: 電話, password }
       回應    : { success, message, token, user } */
    const u = await window.HaisenAPI.login({ phone: phone, password: pass });
    finish("login", u.nick, u.phone, u.city);
  }catch(err){
    toast(err && err.message ? err.message : "登入失敗，請稍後再試");
  }finally{
    busy(btn, false);
  }
});
formRegister.addEventListener("submit", async e=>{
  e.preventDefault();
  if(!validateRegister(true)) return;
  if(!window.HaisenAPI){ toast("API 模組尚未載入"); return; }
  const nick = document.getElementById("rg-nick").value.trim();
  const city = document.getElementById("rg-city").value;
  const phone = normPhone(document.getElementById("rg-phone").value);
  const pass = document.getElementById("rg-pass").value;
  const btn = document.getElementById("rg-submit");
  busy(btn, true);
  try{
    /* [API 對接點] 會員註冊
       METHOD  : POST
       ENDPOINT: /api/auth/register
       PARAMS  : { username: 電話, password, display_name: 暱稱, city: 縣市 }
       回應    : { success, message, token, user }（HTTP 201，token 直接登入）
       資料庫  : users(username, password[bcrypt], display_name, city) */
    const u = await window.HaisenAPI.register({ phone: phone, nick: nick, password: pass, city: city });
    finish("register", u.nick, u.phone, u.city);
  }catch(err){
    toast(err && err.message ? err.message : "註冊失敗，請稍後再試");
  }finally{
    busy(btn, false);
  }
});

validateLogin(false);
validateRegister(false);

function profileHTML(u){
  const nick = (u.nick || "").replace(/"/g, "&quot;");
  const phone = (u.phone || "—");
  return `
  <div class="drawer__sec"><h4>個人資訊</h4>
    <p class="drawer__note">暱稱可自行編輯；電話號碼為註冊時綁定，僅供顯示、不可修改。</p></div>
  <div class="field" id="dr-f-av">
    <label>個人頭像 <span class="opt-tag">選填</span></label>
    <div class="av-upload" id="dr-av-upload">
      <input type="file" class="upload__input" id="dr-av-file" accept="image/*">
      <span class="av-upload__preview avatar ${getUserAvatar() ? "avatar--img" : ""}" id="dr-av-preview">${avatarInner()}</span>
      <div class="av-upload__text"><b>點擊或拖放照片上傳</b><span>支援 JPG / PNG / WEBP，單檔上限 5MB</span></div>
    </div>
    <div class="upload-err" id="dr-av-err"></div>
    <button class="btn btn--quiet btn--sm" type="button" id="dr-av-clear" style="margin-top:10px">移除頭像</button>
  </div>
  <div class="field" id="dr-f-nick">
    <label>暱稱 <span class="req">*</span></label>
    <input class="input" type="text" id="dr-nick-input" value="${nick}" placeholder="請輸入你的名字（買家或賣家皆同）">
    <div class="field-err" id="dr-e-nick">請填寫暱稱（2–20 字）</div>
  </div>
  <div class="field">
    <label>電話號碼</label>
    <div class="readonly-field" id="dr-phone-ro">${phone}</div>
    <p class="hint" style="margin-top:8px">電話號碼於註冊時綁定，不可修改。</p>
  </div>
  <button class="btn btn--primary btn--sm" type="button" id="dr-save">儲存變更</button>`;
}
function handleAvatarFile(file){
  const err = document.getElementById("dr-av-err");
  const fail = m => { if(err){ err.textContent = m; err.classList.add("show"); } toast(m); };
  if(err){ err.textContent = ""; err.classList.remove("show"); }
  const typeOk = /^image\/(jpeg|png|webp)$/.test(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name);
  if(!typeOk){ fail("格式不支援，僅接受 JPG / PNG / WEBP"); return; }
  if(file.size > 5 * 1024 * 1024){ fail("頭像超過 5MB 上限（" + (file.size/1048576).toFixed(2) + " MB）"); return; }
  const r = new FileReader();
  r.onload = e=>{
    try{ setUserAvatar(e.target.result); }
    catch(e2){ fail("瀏覽器儲存空間不足，請改用較小的圖片"); return; }
    toast("已更新頭像");
    renderAuthNav();
    renderDrawer();
  };
  r.readAsDataURL(file);
}
function bindDrawerBody(){
  const av = document.getElementById("dr-av-upload");
  if(av){
    const af = document.getElementById("dr-av-file");
    av.addEventListener("click", ()=> af.click());
    af.addEventListener("change", e=>{ if(e.target.files && e.target.files[0]) handleAvatarFile(e.target.files[0]); e.target.value = ""; });
    ["dragenter","dragover"].forEach(ev=> av.addEventListener(ev, e=>{ e.preventDefault(); av.classList.add("upload--drop"); }));
    ["dragleave","drop"].forEach(ev=> av.addEventListener(ev, e=>{ e.preventDefault(); av.classList.remove("upload--drop"); }));
    av.addEventListener("drop", e=>{ if(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) handleAvatarFile(e.dataTransfer.files[0]); });
  }
  const avc = document.getElementById("dr-av-clear");
  if(avc) avc.addEventListener("click", ()=>{
    setUserAvatar("");
    toast("已移除頭像");
    renderAuthNav();
    renderDrawer();
  });
  const save = document.getElementById("dr-save");
  if(save) save.addEventListener("click", ()=>{
    const nick = document.getElementById("dr-nick-input").value.trim();
    let ok = true;
    ok = setSimple("dr-f-nick", nick.length >= 2 && nick.length <= 20, "dr-e-nick") && ok;
    if(!ok) return;
    const cur = getUser() || {};
    setUser({nick, phone: cur.phone || ""});
    toast("已儲存個人資訊");
    renderAuthNav();
    renderDrawer();
  });
}
function setSimple(fieldId, ok, errId){
  const f = document.getElementById(fieldId);
  if(f){ f.classList.toggle("invalid", !ok); f.classList.toggle("valid", ok); }
  const e = document.getElementById(errId);
  if(e) e.classList.toggle("show", !ok);
  return ok;
}
function initUserMenu(){
  ensureDrawer();
  refreshNavAvatar();
}

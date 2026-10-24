/* [API 對接點] GET /api/fish/data → 併入 CATCH（同 key 覆蓋、新 key 追加）。
   app.js 既有的 render* 函式完全不動，只替換資料來源。
   連線失敗時保留下方的示意資料，介面不會空白，外觀維持不變。 */
async function loadCatchFromApi(){
  if(!window.HaisenAPI){ document.dispatchEvent(new CustomEvent("haisen:catch-ready")); return; }
  try{
    const rows = await window.HaisenAPI.listFish();
    const mapped = window.HaisenAPI.rowsToCatch(rows, SPECIES);
    const keys = Object.keys(mapped);
    if(keys.length){
      Object.assign(CATCH, mapped);
      // 後端已依 created_at DESC 排序；把新出現的 key 放到最前面。
      keys.slice().reverse().forEach(k=>{
        if(CATCH_ORDER.indexOf(k) === -1) CATCH_ORDER.unshift(k);
      });
    }
  }catch(e){
    console.warn("[HAISEN] 無法載入後端漁獲，改用示意資料：", e && e.message);
  }finally{
    document.dispatchEvent(new CustomEvent("haisen:catch-ready"));
  }
}

/* [API 對接點] GET /api/auth/me → 以既有 token 重新整理登入狀態與暱稱。 */
async function syncSessionFromApi(){
  if(!window.HaisenAPI || !window.HaisenAPI.getToken()) return;
  try{
    await window.HaisenAPI.me();
    renderAuthNav();
  }catch(e){
    // token 失效：清除本機狀態，維持未登入外觀。
    window.HaisenAPI.logout();
    renderAuthNav();
  }
}

/* ---------- 初始化 ---------- */
document.addEventListener("DOMContentLoaded", ()=>{
  initNav();
  initUserMenu();
  loadCatchFromApi();
  syncSessionFromApi();
});

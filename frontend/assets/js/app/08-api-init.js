/* 頁面初始化：導覽、個人選單與登入狀態同步。 */

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

document.addEventListener("DOMContentLoaded", ()=>{
  initNav();
  initUserMenu();
  syncSessionFromApi();
});

/* 共用頁殼：導覽列與頁尾只維護一份，各頁以 placeholder 掛載。 */
(function () {
  var header = document.getElementById("site-header");
  var page = header ? header.getAttribute("data-page") || "index" : "index";
  var showSearch = header ? header.getAttribute("data-search") !== "off" : true;
  function active(name) { return page === name ? "active" : ""; }

  if (header) {
    header.outerHTML =
      '<header class="nav">' +
      '  <div class="wrap nav__inner">' +
      '    <a href="index.html" class="brand">' +
      '      <span class="brand__mark">一</span>' +
      '      <span>一支釣<small></small></span>' +
      '    </a>' +
      '    <nav class="nav__links">' +
      '      <a href="index.html" class="' + active("index") + '">首頁</a>' +
      '      <a href="products.html" class="' + active("products") + '">今日漁獲</a>' +
      '    </nav>' +
      '    <div class="nav__right">' +
      (showSearch
        ? '      <div class="nav__search">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>' +
          '<input type="text" id="nav-search" placeholder="搜尋魚種、地區" aria-label="搜尋">' +
          '</div>'
        : "") +
      '      <a href="login.html" class="nav-user nav-user--out" id="nav-user-slot" aria-label="登入或註冊"><svg class="nav-user__ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.6"/><path d="M4.6 20c1.2-3.9 4-5.9 7.4-5.9s6.2 2 7.4 5.9"/></svg><span class="nav-user__name">登入／註冊</span></a>' +
      '      <div class="nav-menu" id="nav-menu" hidden>' +
      '        <div class="nav-menu__inner" id="nav-menu-inner"></div>' +
      '      </div>' +
      '      <button class="icon-btn nav__toggle" aria-label="選單" aria-expanded="false" aria-controls="nav-menu">' +
      '        <svg viewBox="0 0 24 24" aria-hidden="true"><line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="17" x2="21" y2="17"/></svg>' +
      '      </button>' +
      '    </div>' +
      '  </div>' +
      '</header>';
  }

  function renderFooter() {
    var footer = document.getElementById("site-footer");
    if (!footer) return;
    footer.outerHTML =
      '<footer class="footer">' +
      '  <div class="wrap">' +
      '    <div class="footer__grid">' +
      '      <div>' +
      '        <div class="brand"><span class="brand__mark">一</span><span>一支釣<small></small></span></div>' +
      '        <p>個人釣客上網販售當日現流漁獲的平台<br>今天釣到什麼就賣什麼</p>' +
      '      </div>' +
      '      <div><h4>買家</h4><a href="products.html">今日漁獲列表</a><a href="products.html">依魚類與地區篩選</a></div>' +
      '      <div><h4>釣客</h4><a href="#" data-open-assistant>今日漁獲上架</a><a href="login.html">釣客登入</a></div>' +
      '      <div><h4>關於</h4><a href="index.html">服務條款</a><a href="index.html">隱私政策</a><a href="index.html">聯絡我們</a></div>' +
      '    </div>' +
      '    <div class="footer__bottom"><span>© 2026 一支釣 </span></div>' +
      '  </div>' +
      '</footer>';
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", renderFooter);
  else renderFooter();
})();

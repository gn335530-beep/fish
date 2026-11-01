/* 首頁第三區：助手功能範例。範例對話不冒充即時資料，面板標示「範例」。 */
(function () {
  var SAMPLE = {
    species: "紅魽",
    meta: "10.4 kg · 3 尾 · 放血冰鎮",
    price: "NT$9,000",
    stock: 3,
    photo: "../assets/images/amberjack.png"
  };

  var MODES = {
    find: {
      status: "找魚",
      prompt: "我想找今天澎湖釣的魚",
      html: function () {
        return msg("me", "我想找今天澎湖釣的魚") +
          msg("bot", "今天有 2 筆澎湖上架。這尾紅魽 10.4 kg、3 尾、放血冰鎮，整批 NT$9,000，還剩 3 尾。") +
          mini() +
          '<div class="ha-quick">' +
          '<button type="button" data-ha-prompt="這尾紅魽還有嗎？">這尾還有嗎？</button>' +
          '<button type="button" data-ha-prompt="可以約哪裡面交？">可以約哪裡面交？</button></div>';
      }
    },
    list: {
      status: "上架",
      prompt: "我今天有釣到魚，想上架",
      html: function () {
        return msg("me", "今天釣到三尾紅魽，10.4 公斤") +
          msg("bot", "收到。處理方式是什麼？想賣多少？（可回每台斤或整批價格）") +
          '<div class="ha-draft"><b>上架草稿</b><dl>' +
          row("魚種", "紅魽") + row("總重", "10.4 kg") + row("尾數", "3 尾") +
          row("處理", "待填") + row("整批售價", "待填") +
          '</dl><div class="ha-draft__act"><button type="button" data-ha-prompt="處理方式：放血冰鎮；整批 NT$9,000">繼續上架</button></div></div>';
      }
    },
    market: {
      status: "問行情",
      prompt: "今天花枝的行情？",
      html: function () {
        return msg("me", "今天花枝的行情？") +
          msg("bot", "現在花枝的行情是 31.4 元／台斤（2026-10-22，高雄市平均，農業部漁產品交易行情）。行情價參考。") +
          '<div class="ha-market"><div class="ha-market__head"><b>花枝行情</b><span>行情價參考</span></div>' +
          '<div class="ha-market__price"><b>31.4</b><span>元／台斤</span></div>' +
          '<div class="ha-market__meta">高雄市平均 · 2026-10-22 · 農業部漁產品交易行情</div>' +
          '<div class="ha-market__meta">近 7 個交易日</div>' +
          '<svg viewBox="0 0 100 32" preserveAspectRatio="none" role="img" aria-label="花枝近 7 個交易日行情走勢">' +
          '<polyline points="0,30 16,26 33,24 50,27 66,20 83,15 100,8" fill="none" stroke="currentColor" stroke-width="1.6" vector-effect="non-scaling-stroke"></polyline>' +
          '</svg><div class="ha-market__range"><span>最高 31.4</span><span>最低 30.1</span></div>' +
          '<div class="ha-market__note">行情價參考，非售價或保證收購價。</div></div>';
      }
    }
  };

  function msg(who, text) {
    return '<div class="ha-msg ha-msg--' + who + '"><p>' + text + '</p></div>';
  }

  function row(label, value) {
    return "<div><dt>" + label + "</dt><dd>" + value + "</dd></div>";
  }

  function mini() {
    return '<div class="ha-mini"><img src="' + SAMPLE.photo + '" alt="紅魽的漁獲照片" width="120" height="120">' +
      '<div><b>' + SAMPLE.species + '</b><span>' + SAMPLE.meta + '</span>' +
      '<em>整批 ' + SAMPLE.price + ' · 可售 ' + SAMPLE.stock + ' 尾</em></div>' +
      '<button type="button" data-ha-prompt="我想問這尾紅魽">問這尾</button></div>';
  }

  var mode = "find";

  function render(next) {
    mode = next;
    var data = MODES[next];
    var body = document.getElementById("ha-body");
    var panel = document.getElementById("ha-panel");
    var status = document.getElementById("ha-status");
    var cta = document.getElementById("ha-cta");
    var tabs = document.querySelectorAll(".ha-tabs [role=tab]");

    tabs.forEach(function (tab) {
      var on = tab.getAttribute("data-mode") === next;
      tab.setAttribute("aria-selected", on ? "true" : "false");
      if (on) panel.setAttribute("aria-labelledby", tab.id);
    });

    status.textContent = data.status;
    cta.setAttribute("data-ha-prompt", data.prompt);
    body.classList.add("is-switching");
    setTimeout(function () {
      body.innerHTML = data.html();
      body.classList.remove("is-switching");
      bind();
    }, 120);
  }

  function bind() {
    document.querySelectorAll("[data-ha-prompt]").forEach(function (el) {
      if (el.dataset.haBound) return;
      el.dataset.haBound = "1";
      el.addEventListener("click", function () {
        openAssistant(el.getAttribute("data-ha-prompt"));
      });
    });
  }

  function openAssistant(prompt) {
    if (!window.FishMatchBot || typeof window.FishMatchBot.open !== "function") {
      if (window.toast) window.toast("助手尚未載入，請重新整理頁面");
      return;
    }
    window.FishMatchBot.open();
    if (!prompt) return;
    setTimeout(function () {
      var form = document.getElementById("fm-form");
      var input = document.getElementById("fm-input");
      if (form && input && !form.hidden) {
        input.value = prompt;
        input.focus();
      }
    }, 80);
  }

  function bindTabs() {
    var tabs = document.querySelectorAll(".ha-tabs [role=tab]");
    tabs.forEach(function (tab, index) {
      tab.addEventListener("click", function () { render(tab.getAttribute("data-mode")); });
      tab.addEventListener("keydown", function (event) {
        var keys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
        if (keys.indexOf(event.key) === -1) return;
        event.preventDefault();
        var step = (event.key === "ArrowUp" || event.key === "ArrowLeft") ? -1 : 1;
        var next = (index + step + tabs.length) % tabs.length;
        tabs[next].focus();
        render(tabs[next].getAttribute("data-mode"));
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!document.getElementById("ha-body")) return;
    bindTabs();
    render(mode);
    bind();
  });
})();

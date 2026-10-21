/* role: "buyer"（買家問釣客）或 "seller"（釣客回買家） */
let chatState = { role:"buyer", peer:"賣家", item:"", msgs:[] };

/* 聊聊訊息持久化（localStorage，跨頁保留；過大圖片不寫入以免超出配額） */
const CHAT_KEY = "haisen_chat_v1";
function chatKey(){ return chatState.role + "|" + chatState.peer + "|" + chatState.item; }
function loadChat(){
  try{ const all = JSON.parse(localStorage.getItem(CHAT_KEY) || "{}"); chatState.msgs = all[chatKey()] || []; }
  catch(e){ chatState.msgs = []; }
}
function saveChat(){
  try{
    const all = JSON.parse(localStorage.getItem(CHAT_KEY) || "{}");
    all[chatKey()] = chatState.msgs.map(m => (m.img && m.img.length > 300000) ? {from:m.from, text:m.text, img:null} : m);
    localStorage.setItem(CHAT_KEY, JSON.stringify(all));
  }catch(e){}
}

function ensureChatPanel(){
  if(document.getElementById("chat-panel")) return;
  const el = document.createElement("div");
  el.id = "chat-panel";
  el.className = "chat";
  el.innerHTML = `
    <div class="chat__head">
      <div class="chat__who">
        <span class="chat__av" id="chat-av">釣</span>
        <div><b id="chat-name">賣家</b><span id="chat-sub">聊聊商品細節</span></div>
      </div>
      <button class="chat__close" id="chat-close" aria-label="關閉聊聊">✕</button>
    </div>
    <div class="chat__body" id="chat-body"></div>
    <div class="chat__foot">
      <button class="chat__img" id="chat-img-btn" aria-label="上傳圖片" title="上傳圖片">
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="1"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M21 16l-5-5-4 4-3-3-6 6"/></svg>
      </button>
      <input type="file" id="chat-file" accept="image/*" hidden>
      <input type="text" id="chat-input" placeholder="輸入訊息，或貼上圖片…" aria-label="訊息">
      <button class="chat__send" id="chat-send">送出</button>
    </div>`;
  document.body.appendChild(el);

  document.getElementById("chat-close").addEventListener("click", closeChat);
  document.getElementById("chat-send").addEventListener("click", sendChatText);
  document.getElementById("chat-input").addEventListener("keydown", e=>{ if(e.key==="Enter") sendChatText(); });
  document.getElementById("chat-img-btn").addEventListener("click", ()=> document.getElementById("chat-file").click());
  document.getElementById("chat-file").addEventListener("change", e=>{
    if(e.target.files && e.target.files[0]) readChatImage(e.target.files[0]);
    e.target.value = "";
  });
  document.getElementById("chat-input").addEventListener("paste", e=>{
    const items = (e.clipboardData || {}).items || [];
    for(const it of items){
      if(it.type && it.type.indexOf("image") === 0){
        const f = it.getAsFile();
        if(f){ e.preventDefault(); readChatImage(f); }
      }
    }
  });
}

function readChatImage(file){
  if(!/^image\//.test(file.type)){ toast("僅支援圖片檔案"); return; }
  if(file.size > 5*1024*1024){ toast("圖片超過 5MB 上限"); return; }
  const r = new FileReader();
  r.onload = e=>{ pushChat("me", "", e.target.result); };
  r.readAsDataURL(file);
}

function pushChat(from, text, img){
  chatState.msgs.push({from, text, img});
  saveChat();
  renderChat();
  if(from === "me") autoReply();
}

function renderChat(){
  const body = document.getElementById("chat-body");
  if(!body) return;
  if(chatState.msgs.length === 0){
    body.innerHTML = chatState.role === "seller"
      ? `<div class="chat__empty">買家會在這裡詢問魚體外觀、規格、處理方式或到貨時間。<br>你可以回覆文字或圖片。</div>`
      : `<div class="chat__empty">向釣客確認魚體外觀、規格、處理方式或到貨時間。<br>可傳文字或圖片。</div>`;
    return;
  }
  body.innerHTML = chatState.msgs.map(m=>{
    const side = m.from === "me" ? "chat__msg--me" : "chat__msg--seller";
    const img = m.img ? `<div class="chat__imgwrap"><img src="${m.img}" alt="訊息圖片"></div>` : "";
    const txt = m.text ? `<div class="chat__bubble">${m.text}</div>` : "";
    return `<div class="chat__msg ${side}">${img}${txt}</div>`;
  }).join("");
  body.scrollTop = body.scrollHeight;
}

function sendChatText(){
  const input = document.getElementById("chat-input");
  const v = (input.value || "").trim();
  if(!v) return;
  input.value = "";
  pushChat("me", v, null);
}

let replyTimer = null;
function autoReply(){
  clearTimeout(replyTimer);
  replyTimer = setTimeout(()=>{
    const buyerReplies = [
      "收到，我確認一下今天的魚況，稍後回覆你。",
      "這尾是今天清晨釣的，魚眼清澈、鰓很紅，鮮度沒問題。",
      "可以指定處理方式（活體或到貨前宰殺），下單時備註就好。",
      "到貨時間是隔日 08:00–12:00，若需指定時段也可以跟我說。"
    ];
    const sellerReplies = [
      "好的，我確認一下這尾的實際重量，稍後回你。",
      "這尾是今天清晨釣的，魚眼清澈、鰓很紅，鮮度沒問題。",
      "可以指定處理方式（活體或到貨前宰殺），下單時備註就好。",
      "沒問題，我幫你保留，下單後隔日清晨低溫出貨。"
    ];
    const pool = chatState.role === "seller" ? sellerReplies : buyerReplies;
    pushChat("seller", pool[Math.floor(Math.random()*pool.length)], null);
  }, 900 + Math.random()*700);
}

/* 買家端：向釣客聊聊 */
function openChat(sellerName, itemName){
  ensureChatPanel();
  chatState.role = "buyer";
  chatState.peer = sellerName || "賣家";
  chatState.item = itemName || "";
  document.getElementById("chat-name").textContent = chatState.peer;
  document.getElementById("chat-av").textContent = (chatState.peer || "釣").slice(0,1);
  document.getElementById("chat-sub").textContent = itemName ? ("關於「" + itemName + "」") : "聊聊商品細節";
  document.getElementById("chat-panel").classList.add("show");
  loadChat();
  if(chatState.msgs.length === 0){
    chatState.msgs.push({from:"seller", text:"你好，我是" + chatState.peer + "。有想確認的魚況或規格都可以問我。", img:null});
    saveChat();
  }
  renderChat();
  setTimeout(()=>{ const i = document.getElementById("chat-input"); if(i) i.focus(); }, 120);
}

/* 賣家端：回覆買家訊息 */
function openBuyerChat(buyerName, itemName){
  ensureChatPanel();
  chatState.role = "seller";
  chatState.peer = buyerName || "買家";
  chatState.item = itemName || "";
  document.getElementById("chat-name").textContent = chatState.peer;
  document.getElementById("chat-av").textContent = (chatState.peer || "買").slice(0,1);
  document.getElementById("chat-sub").textContent = itemName ? ("詢問「" + itemName + "」") : "買家訊息";
  document.getElementById("chat-panel").classList.add("show");
  loadChat();
  if(chatState.msgs.length === 0){
    chatState.msgs.push({from:"seller", text:"你好，我想確認這尾魚的實際重量與處理方式，可以嗎？", img:null});
    saveChat();
  }
  renderChat();
  setTimeout(()=>{ const i = document.getElementById("chat-input"); if(i) i.focus(); }, 120);
}

function closeChat(){
  const el = document.getElementById("chat-panel");
  if(el) el.classList.remove("show");
}

function ensureAssistantBot(){
  if(document.getElementById("assistant-bot")) return;

  const widget = document.createElement("div");
  widget.id = "assistant-bot";
  widget.className = "assistant-bot";
  widget.innerHTML = `
    <section class="assistant-bot__panel" id="assistant-bot-panel" role="dialog" aria-label="海人小幫手" hidden>
      <header class="assistant-bot__head">
        <span class="assistant-bot__symbol" aria-hidden="true">✦</span>
        <div><b>海人小幫手</b><span>模擬客服・功能建置中</span></div>
        <button class="assistant-bot__close" type="button" aria-label="關閉小幫手">✕</button>
      </header>
      <div class="assistant-bot__messages" id="assistant-bot-messages" aria-live="polite"></div>
      <form class="assistant-bot__form">
        <input type="text" aria-label="輸入訊息" placeholder="輸入訊息（模擬）" autocomplete="off">
        <button type="submit">送出</button>
      </form>
    </section>
    <button class="assistant-bot__toggle" type="button" aria-label="開啟海人小幫手" aria-expanded="false" aria-controls="assistant-bot-panel" title="海人小幫手">✦</button>`;
  document.body.appendChild(widget);

  const panel = widget.querySelector("#assistant-bot-panel");
  const toggle = widget.querySelector(".assistant-bot__toggle");
  const close = widget.querySelector(".assistant-bot__close");
  const form = widget.querySelector(".assistant-bot__form");
  const input = form.querySelector("input");
  const messages = widget.querySelector("#assistant-bot-messages");

  function addMessage(text, from){
    const message = document.createElement("p");
    message.className = "assistant-bot__message assistant-bot__message--" + from;
    message.textContent = text;
    messages.appendChild(message);
    messages.scrollTop = messages.scrollHeight;
  }

  function setOpen(open){
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "關閉海人小幫手" : "開啟海人小幫手");
    if(open && messages.childElementCount === 0){
      addMessage("你好！我是海人小幫手，目前提供模擬對話。正式功能即將上線。", "bot");
    }
    if(open) input.focus();
  }

  toggle.addEventListener("click", ()=> setOpen(panel.hidden));
  close.addEventListener("click", ()=> setOpen(false));
  form.addEventListener("submit", event=>{
    event.preventDefault();
    const text = input.value.trim();
    if(!text) return;
    addMessage(text, "user");
    input.value = "";
    window.setTimeout(()=>{
      addMessage("收到你的訊息！目前是模擬客服，正式功能即將上線。", "bot");
    }, 500);
  });
  document.addEventListener("keydown", event=>{
    if(event.key === "Escape" && !panel.hidden) setOpen(false);
  });
}

ensureAssistantBot();

/* ============================================================
   個人選單（右上角）· 個人抽屜（個人資訊 / 賣家資訊 / 聊聊）
   ============================================================ */

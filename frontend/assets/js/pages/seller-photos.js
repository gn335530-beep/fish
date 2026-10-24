/* ============ 圖片上傳（選填） ============ */
const MAX_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 8;
const OK_TYPES = ["image/jpeg","image/png","image/webp"];
const EXT_OK = /\.(jpe?g|png|webp)$/i;
let photos = [];
let coverIdx = 0;

function fmtSize(b){ return b < 1024*1024 ? Math.round(b/1024) + " KB" : (b/1048576).toFixed(2) + " MB"; }
function showUploadErr(msgs){
  const el = document.getElementById("upload-err");
  if(msgs.length){ el.innerHTML = msgs.map(m=>"・"+m).join("<br>"); el.classList.add("show"); }
  else { el.textContent = ""; el.classList.remove("show"); }
}
function handleFiles(fileList){
  const files = Array.from(fileList);
  const errs = [];
  files.forEach(f=>{
    if(photos.length >= MAX_FILES){ errs.push("已達上限 " + MAX_FILES + " 張，略過「" + f.name + "」"); return; }
    if(!OK_TYPES.includes(f.type) && !EXT_OK.test(f.name)){ errs.push("「" + f.name + "」格式不支援（僅接受 JPG / PNG / WEBP）"); return; }
    if(f.size > MAX_SIZE){ errs.push("「" + f.name + "」超過 5MB 上限（" + fmtSize(f.size) + "）"); return; }
    const r = new FileReader();
    r.onload = e=>{
      photos.push({name:f.name, size:f.size, dataUrl:e.target.result});
      renderThumbs();
      validate();
    };
    r.readAsDataURL(f);
  });
  showUploadErr(errs);
}
function renderThumbs(){
  document.getElementById("thumbs").innerHTML = photos.map((p,i)=>`
    <div class="thumb ${i===coverIdx?'thumb--cover':''}">
      <img src="${p.dataUrl}" alt="${p.name}">
      ${i===coverIdx?'<span class="thumb__cover">封面</span>':`<button type="button" class="thumb__setcover" onclick="setCover(${i})">設為封面</button>`}
      <button type="button" class="thumb__del" onclick="delPhoto(${i})" aria-label="刪除">✕</button>
      <span class="thumb__name">${p.name}</span>
    </div>`).join("");
  const total = photos.reduce((a,b)=>a+b.size,0);
  document.getElementById("photo-count").textContent = photos.length;
  document.getElementById("photo-size").textContent = photos.length ? fmtSize(total) : "0 KB";
  document.getElementById("cover-name").textContent = photos.length ? photos[coverIdx].name : "尚未選擇";
}
function setCover(i){ coverIdx = i; renderThumbs(); }
function delPhoto(i){
  photos.splice(i,1);
  if(coverIdx >= photos.length) coverIdx = Math.max(0, photos.length-1);
  renderThumbs(); validate();
}
const upload = document.getElementById("upload");
const fileInput = document.getElementById("file");
upload.addEventListener("click", ()=> fileInput.click());
fileInput.addEventListener("change", e=>{ handleFiles(e.target.files); fileInput.value=""; });
["dragenter","dragover"].forEach(ev=> upload.addEventListener(ev, e=>{ e.preventDefault(); upload.classList.add("upload--drop"); }));
["dragleave","drop"].forEach(ev=> upload.addEventListener(ev, e=>{ e.preventDefault(); upload.classList.remove("upload--drop"); }));
upload.addEventListener("drop", e=>{ if(e.dataTransfer && e.dataTransfer.files) handleFiles(e.dataTransfer.files); });
window.addEventListener("dragover", e=> e.preventDefault());
window.addEventListener("drop", e=> e.preventDefault());

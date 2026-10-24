/* 圖片壓縮與上傳：長邊 1280、JPEG 0.75，降低資料量。 */

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_SIDE = 1280;
const QUALITY = 0.75;

function readAsDataUrl(file) {
  return new Promise(function (resolve, reject) {
    const reader = new FileReader();
    reader.onload = function () { resolve(reader.result); };
    reader.onerror = function () { reject(new Error("讀取圖片失敗")); };
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl) {
  return new Promise(function (resolve, reject) {
    const image = new Image();
    image.onload = function () { resolve(image); };
    image.onerror = function () { reject(new Error("圖片格式不支援")); };
    image.src = dataUrl;
  });
}

export async function compressImage(file) {
  const dataUrl = await readAsDataUrl(file);
  const image = await loadImage(dataUrl);
  const scale = Math.min(1, MAX_SIDE / Math.max(image.width, image.height));
  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", QUALITY);
}

export async function uploadImage(file) {
  if (!file || !/^image\//.test(file.type)) throw new Error("僅支援圖片檔案");
  if (file.size > MAX_BYTES) throw new Error("圖片超過 5MB 上限");

  const data = await compressImage(file);
  const response = await window.HaisenAPI.request("/api/uploads", {
    method: "POST",
    auth: true,
    body: { filename: file.name || "photo.jpg", data: data }
  });
  return response.data.url;
}

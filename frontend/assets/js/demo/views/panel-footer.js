/* 面板頁尾：照片、文字輸入與送出。 */

export function footerHtml() {
  return '  <form class="fm-panel__foot" id="fm-form">' +
    '    <button type="button" class="fm-attach" data-action="photo" aria-label="上傳照片" title="上傳照片">📷</button>' +
    '    <input type="text" id="fm-input" placeholder="輸入訊息…" autocomplete="off" maxlength="500" aria-label="訊息">' +
    '    <button type="submit" class="fm-send">送出</button>' +
    '  </form>';
}

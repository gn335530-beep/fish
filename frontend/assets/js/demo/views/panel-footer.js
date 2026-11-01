/* 面板頁尾：語音、照片、文字輸入與送出圖示。 */

export function footerHtml() {
  return '  <form class="fm-panel__foot" id="fm-form">' +
    '    <button type="button" class="fm-voice" id="fm-voice" aria-label="語音輸入" title="語音輸入" aria-pressed="false">🎙</button>' +
    '    <button type="button" class="fm-attach" data-action="photo" aria-label="上傳照片" title="上傳照片">📷</button>' +
    '    <input type="text" id="fm-input" placeholder="輸入訊息…" autocomplete="off" maxlength="500" aria-label="訊息">' +
    '    <button type="submit" class="fm-send" aria-label="送出" title="送出">' +
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 21 3l-7.5 18-2.2-7.3L3 11.5z"/></svg>' +
    '</button>' +
    '  </form>';
}

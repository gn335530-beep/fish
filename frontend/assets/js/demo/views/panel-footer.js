/* 面板頁尾：語音、照片、文字輸入與送出圖示。 */

const MIC = '<svg viewBox="0 0 24 24" aria-hidden="true">' +
  '<rect x="9" y="3" width="6" height="11" rx="3"/>' +
  '<path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8"/></svg>';

const CAMERA = '<svg viewBox="0 0 24 24" aria-hidden="true">' +
  '<path d="M4 8h3l1.5-2.5h7L17 8h3v11H4V8z"/>' +
  '<circle cx="12" cy="13.5" r="3.2"/></svg>';

const SEND = '<svg viewBox="0 0 24 24" aria-hidden="true">' +
  '<path d="M21 3 3 10.5l7.2 2.5L12.5 20 21 3z"/>' +
  '<path d="M10.2 13 21 3"/></svg>';

export function footerHtml() {
  return '  <form class="fm-panel__foot" id="fm-form">' +
    '    <button type="button" class="fm-voice" id="fm-voice" aria-label="語音輸入" title="語音輸入" aria-pressed="false">' + MIC + '</button>' +
    '    <button type="button" class="fm-attach" data-action="photo" aria-label="上傳照片" title="上傳照片">' + CAMERA + '</button>' +
    '    <input type="text" id="fm-input" placeholder="輸入訊息…" autocomplete="off" maxlength="500" aria-label="訊息">' +
    '    <button type="submit" class="fm-send" aria-label="送出" title="送出">' + SEND + '</button>' +
    '  </form>';
}

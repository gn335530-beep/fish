/* 面板標題列：標題、動態副標與視窗按鈕。 */

export function headerHtml() {
  return '  <header class="fm-panel__head">' +
    '    <span class="fm-panel__avatar" aria-hidden="true">魚</span>' +
    '    <div class="fm-panel__title"><b id="fm-title">AI 聊天小幫手</b>' +
    '<div class="fm-panel__sub" id="fm-sub" hidden></div></div>' +
    '    <button type="button" class="fm-icon" data-action="inbox" aria-label="收件匣" title="收件匣">☰</button>' +
    '    <button type="button" class="fm-icon" data-action="minimize" aria-label="縮小" title="縮小">─</button>' +
    '    <button type="button" class="fm-icon" data-action="close" aria-label="關閉" title="關閉">✕</button>' +
    '  </header>';
}

/* 面板標題列：品牌、狀態副標與視窗按鈕。 */

export function headerHtml() {
  return '  <header class="fm-panel__head">' +
    '    <span class="fm-panel__avatar" aria-hidden="true">魚</span>' +
    '    <div class="fm-panel__title"><b>一支釣小幫手 <em class="fm-build">v7</em></b>' +
    '<span id="fm-status">找魚・上架・交易</span></div>' +
    '    <button type="button" class="fm-icon" data-action="inbox" aria-label="收件匣" title="收件匣">☰</button>' +
    '    <button type="button" class="fm-icon" data-action="minimize" aria-label="縮小" title="縮小">─</button>' +
    '    <button type="button" class="fm-icon" data-action="close" aria-label="關閉" title="關閉">✕</button>' +
    '  </header>';
}

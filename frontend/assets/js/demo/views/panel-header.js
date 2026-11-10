/* 面板標題列：標題、動態副標與視窗按鈕。 */

const ICONS = {
  inbox: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  minimize: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>'
};

export function headerHtml() {
  return '  <header class="fm-panel__head">' +
    '    <span class="fm-panel__avatar" aria-hidden="true">魚</span>' +
    '    <div class="fm-panel__title">' +
    '      <div class="fm-panel__who"><b id="fm-title">AI 聊天小幫手</b>' +
    '<div class="fm-panel__sub" id="fm-sub" hidden></div></div>' +
    '      <div class="fm-panel__aside" id="fm-aside" hidden></div>' +
    '    </div>' +
    '    <button type="button" class="fm-icon" data-action="inbox" aria-label="收件匣" title="收件匣">' + ICONS.inbox + '</button>' +
    '    <button type="button" class="fm-icon" data-action="minimize" aria-label="縮小" title="縮小">' + ICONS.minimize + '</button>' +
    '    <button type="button" class="fm-icon" data-action="close" aria-label="關閉" title="關閉">' + ICONS.close + '</button>' +
    '  </header>';
}

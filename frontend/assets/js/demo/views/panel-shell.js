/* 面板外殼：組合標題列、內文區與頁尾，加上檔案選擇與開啟按鈕。 */

import { headerHtml } from "./panel-header.js";
import { footerHtml } from "./panel-footer.js";

const OVERLAYS = "" +
  '<input type="file" id="fm-file" accept="image/*" hidden>' +
  '<button type="button" class="fm-toggle" id="fm-toggle" aria-expanded="false" aria-controls="fm-panel" aria-label="開啟小幫手">' +
  '  <span class="fm-toggle__mark" aria-hidden="true">✦</span>' +
  '  <span class="fm-toggle__badge" id="fm-badge" hidden>0</span>' +
  '</button>';

export function shellHtml() {
  return '<section class="fm-panel" id="fm-panel" hidden aria-label="AI 聊天小幫手">' +
    headerHtml() +
    '  <div class="fm-panel__body" id="fm-body" aria-live="polite"></div>' +
    footerHtml() +
    '</section>' + OVERLAYS;
}

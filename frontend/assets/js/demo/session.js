/* 登出：清掉記憶體中的會員與對話狀態，停止輪詢並收起面板。 */

import { update, emptyState } from "./store.js";
import { stopPolling } from "./poll.js";

export function clearSession(panel) {
  stopPolling();
  update(emptyState());
  if (panel) panel.close();
}

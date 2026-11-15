/* 重置回覆：路由與規則服務共用同一份 context 與文案。 */

import { resetContext } from "./listing.js";
import { RESET_TEXT } from "./texts.js";

export function resetReply() {
  return { context: resetContext(), replies: [{ text: RESET_TEXT }] };
}

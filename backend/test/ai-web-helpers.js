/* 網路工具測試共用：注入固定 Tavily 回應。 */

const web = require("../lib/ai/tools/web");

function fakeTavily(results, options) {
  const settings = options || {};
  const state = { calls: [], bodies: [] };
  web.setFetcher(async function (url, request) {
    state.calls.push(url);
    state.bodies.push(JSON.parse(request.body));
    if (settings.error) throw settings.error;
    const status = settings.status || 200;
    return {
      ok: status < 400,
      status: status,
      json: async function () { return { results: results || [] }; }
    };
  });
  return state;
}

module.exports = { fakeTavily: fakeTavily };

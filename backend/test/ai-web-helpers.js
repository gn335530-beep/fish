/* 網路工具測試共用：注入固定 Tavily 回應。 */

const web = require("../lib/ai/tools/web");

function fakeTavily(results) {
  const state = { calls: [], bodies: [] };
  web.setFetcher(async function (url, options) {
    state.calls.push(url);
    state.bodies.push(JSON.parse(options.body));
    return {
      ok: true,
      status: 200,
      json: async function () { return { results: results || [] }; }
    };
  });
  return state;
}

module.exports = { fakeTavily: fakeTavily };

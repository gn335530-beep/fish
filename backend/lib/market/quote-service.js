/* 行情整合查詢：名稱或代碼先查官方字典，再用代碼查價。 */

const service = require("./service");
const { resolveCode, resolveName } = require("./catalog-mapping");

async function quoteByCode(code, options) {
  const resolved = await resolveCode(code);
  if (resolved.error) return resolved;
  return service.getMarketPrice(Object.assign({}, options, { mapping: resolved.mapping }));
}

async function quoteByName(name, options) {
  const resolved = await resolveName(name);
  if (resolved.error) return resolved;
  return service.getMarketPrice(Object.assign({}, options, { mapping: resolved.mapping }));
}

module.exports = {
  quoteByCode: quoteByCode,
  quoteByName: quoteByName
};

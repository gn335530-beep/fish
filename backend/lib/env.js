/* 載入 backend/.env；已存在的環境變數優先，方便測試與部署覆寫。 */

const fs = require("node:fs");
const path = require("node:path");

function unquote(value) {
  if (value.length < 2) return value;
  const first = value[0];
  const last = value[value.length - 1];
  return (first === '"' && last === '"') || (first === "'" && last === "'")
    ? value.slice(1, -1)
    : value;
}

function parseLine(line) {
  let text = String(line || "").trim();
  if (!text || text.startsWith("#")) return null;
  if (text.startsWith("export ")) text = text.slice(7).trim();
  const equals = text.indexOf("=");
  if (equals < 1) return null;
  const key = text.slice(0, equals).trim();
  let value = text.slice(equals + 1).trim();
  if (value.indexOf(" #") !== -1) value = value.slice(0, value.indexOf(" #")).trim();
  return { key: key, value: unquote(value) };
}

function loadEnv(filePath) {
  const target = filePath || path.join(__dirname, "..", ".env");
  if (!fs.existsSync(target)) return 0;
  let loaded = 0;
  fs.readFileSync(target, "utf8").split(/\r?\n/).forEach(function (line) {
    const entry = parseLine(line);
    if (!entry || process.env[entry.key] !== undefined) return;
    process.env[entry.key] = entry.value;
    loaded += 1;
  });
  return loaded;
}

module.exports = { loadEnv: loadEnv, parseLine: parseLine };

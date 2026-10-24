/* 登入憑證與會員資料輸出。Token 只存在記憶體，重啟後需重新登入。 */

const crypto = require("node:crypto");
const { fail } = require("./http");

const tokens = new Map();

function publicUser(user) {
  if (!user) return null;
  const safe = Object.assign({}, user);
  delete safe.password;
  delete safe.bank_code;
  delete safe.bank_account;
  delete safe.bank_account_name;
  safe.display_address = [safe.city, safe.district, safe.address_line].filter(Boolean).join("");
  safe.region = safe.city || "";
  return safe;
}

function issueToken(user) {
  const token = crypto.randomUUID();
  tokens.set(token, user.id);
  return token;
}

function readToken(req) {
  const authorization = req.get("Authorization") || "";
  return authorization.indexOf("Bearer ") === 0 ? authorization.slice(7) : "";
}

function currentUser(req) {
  const userId = tokens.get(readToken(req));
  if (!userId) return null;
  const { findById } = require("./store");
  return findById("users", userId);
}

function requireUser(req, res, next) {
  const user = currentUser(req);
  if (!user) {
    fail(res, 401, "UNAUTHORIZED", "請先登入或重新登入");
    return;
  }
  req.user = user;
  next();
}

function optionalUser(req) {
  return currentUser(req);
}

module.exports = {
  publicUser: publicUser,
  issueToken: issueToken,
  requireUser: requireUser,
  optionalUser: optionalUser
};

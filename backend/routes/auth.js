/* 會員：註冊、登入、目前會員、個人檔案。 */

const express = require("express");
const { all, insert, patch, nextNumericId, findById } = require("../lib/store");
const { publicUser, issueToken, requireUser } = require("../lib/auth");
const { ok, created, fail } = require("../lib/http");

const router = express.Router();

function newUser(data) {
  return {
    id: nextNumericId("users"),
    username: String(data.username),
    password: String(data.password),
    display_name: String(data.display_name),
    role: ["BUYER", "SELLER"].indexOf(data.role) !== -1 ? data.role : "BUYER",
    is_verified: false,
    completed_orders: 0,
    city: "",
    district: "",
    address_line: "",
    rating_score: 0,
    review_count: 0,
    completed_deals: 0,
    no_show_count: 0,
    is_blacklisted: false,
    bank_code: "",
    bank_account: "",
    bank_account_name: ""
  };
}

router.post("/api/auth/register", function (req, res) {
  const body = req.body || {};
  if (!body.username || !body.password || !body.display_name) {
    fail(res, 400, "MISSING_FIELDS", "電話、密碼和暱稱為必填欄位");
    return;
  }
  if (all("users").some(function (u) { return u.username === body.username; })) {
    fail(res, 409, "DUPLICATE_PHONE", "此電話號碼已註冊");
    return;
  }
  const user = insert("users", newUser(body));
  created(res, { token: issueToken(user), user: publicUser(user) }, "註冊成功");
});

function signIn(req, res) {
  const body = req.body || {};
  const user = all("users").find(function (u) {
    return u.username === body.username && u.password === body.password;
  });
  if (!user) {
    fail(res, 401, "INVALID_CREDENTIALS", "電話號碼或密碼錯誤");
    return;
  }
  ok(res, { token: issueToken(user), user: publicUser(user) }, "登入成功");
}

router.post("/api/auth/login", signIn);
router.post("/api/auth/signin", signIn);

router.get("/api/auth/me", requireUser, function (req, res) {
  ok(res, publicUser(req.user), "取得會員資料成功");
});

const PROFILE_TEXT_FIELDS = ["city", "district", "address_line", "bank_code", "bank_account", "bank_account_name"];
const PROFILE_LIMITS = { city: 20, district: 20, address_line: 100, bank_code: 10, bank_account: 30, bank_account_name: 30 };

router.put("/api/users/profile", requireUser, function (req, res) {
  const body = req.body || {};
  const changes = {};

  const nickname = body.display_name || body.nickname;
  if (typeof nickname === "string" && nickname.trim()) {
    const value = nickname.trim();
    if (value.length < 2 || value.length > 20) {
      fail(res, 400, "INVALID_NICKNAME", "暱稱需為 2 到 20 字");
      return;
    }
    changes.display_name = value;
  }

  for (const field of PROFILE_TEXT_FIELDS) {
    if (body[field] === undefined) continue;
    const value = String(body[field]).trim();
    if (value.length > PROFILE_LIMITS[field]) {
      fail(res, 400, "FIELD_TOO_LONG", field + " 長度超過上限");
      return;
    }
    changes[field] = value;
  }

  if (Object.keys(changes).length === 0) {
    fail(res, 400, "NO_CHANGES", "沒有可更新的欄位");
    return;
  }

  const updated = patch("users", req.user.id, changes) || findById("users", req.user.id);
  ok(res, publicUser(updated), "個人檔案已更新");
});

module.exports = router;

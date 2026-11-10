/* 公開個人資訊：只輸出公開欄位白名單，角色評分即時由評價計算。 */

const express = require("express");
const { findById } = require("../lib/store");
const { ratingBreakdown } = require("../lib/reviews");
const { ok, fail } = require("../lib/http");

const router = express.Router();

router.get("/api/users/:id", function (req, res) {
  const user = findById("users", req.params.id);
  if (!user) {
    fail(res, 404, "USER_NOT_FOUND", "找不到這個使用者");
    return;
  }

  ok(res, {
    id: user.id,
    display_name: user.display_name,
    avatar_url: user.avatar_url || "",
    region: user.city || "",
    is_verified: user.is_verified === true,
    completed_deals: Number(user.completed_deals || 0),
    rating: ratingBreakdown(user.id)
  }, "取得個人資訊成功");
});

module.exports = router;

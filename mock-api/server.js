const crypto = require("node:crypto");
const path = require("node:path");
const jsonServer = require("json-server");

const app = jsonServer.create();
const router = jsonServer.router(path.join(__dirname, "db.json"));
const db = router.db;
const tokens = new Map();
const port = Number(process.env.PORT) || 3001;

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
app.use(jsonServer.bodyParser);

function publicUser(user) {
  const {
    password,
    bank_code,
    bank_account,
    bank_account_name,
    ...safeUser
  } = user;
  return safeUser;
}

function getAuthenticatedUser(req) {
  const authorization = req.get("Authorization") || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";
  const userId = tokens.get(token);
  return userId ? db.get("users").find({ id: userId }).value() : null;
}

function requireUser(req, res, next) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ success: false, message: "請先登入或重新登入" });
    return;
  }
  req.user = user;
  next();
}

function issueToken(user) {
  const token = crypto.randomUUID();
  tokens.set(token, user.id);
  return token;
}

function findFish(id) {
  return db.get("fish_data").find({ id: Number(id) }).value();
}

function nextId(collection) {
  return (db.get(collection).value() || []).reduce((max, row) => Math.max(max, Number(row.id) || 0), 0) + 1;
}

function signIn(req, res) {
  const { username, password } = req.body || {};
  const user = db.get("users").find({ username, password }).value();
  if (!user) {
    res.status(401).json({ success: false, message: "電話號碼或密碼錯誤" });
    return;
  }
  res.json({
    success: true,
    message: "登入成功",
    token: issueToken(user),
    user: publicUser(user)
  });
}

app.post("/api/auth/register", (req, res) => {
  const { username, password, display_name, role } = req.body || {};
  if (!username || !password || !display_name) {
    res.status(400).json({ success: false, message: "電話、密碼和暱稱為必填欄位" });
    return;
  }
  if (db.get("users").find({ username }).value()) {
    res.status(409).json({ success: false, message: "此電話號碼已註冊" });
    return;
  }
  const user = {
    id: nextId("users"),
    username: String(username),
    password: String(password),
    display_name: String(display_name),
    role: ["BUYER", "SELLER"].includes(role) ? role : "BUYER",
    is_verified: false,
    completed_orders: 0,
    bank_code: "",
    bank_account: "",
    bank_account_name: ""
  };
  db.get("users").push(user).write();
  res.status(201).json({
    success: true,
    message: "註冊成功",
    token: issueToken(user),
    user: publicUser(user)
  });
});

app.post("/api/auth/login", signIn);
app.post("/api/auth/signin", signIn);
app.get("/api/auth/me", requireUser, (req, res) => {
  res.json({ success: true, message: "取得會員資料成功", data: publicUser(req.user) });
});

app.put("/api/users/profile", requireUser, (req, res) => {
  const allowed = ["bank_code", "bank_account", "bank_account_name"];
  const patch = Object.fromEntries(
    allowed.filter((key) => req.body && req.body[key] !== undefined)
      .map((key) => [key, String(req.body[key])])
  );
  const updated = { ...req.user, ...patch };
  db.get("users").find({ id: req.user.id }).assign(patch).write();
  res.json({ success: true, message: "銀行資料已更新", data: publicUser(updated) });
});

app.get("/api/fish/data", (req, res) => {
  const data = db.get("fish_data").value().slice()
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map((fish) => ({
      ...fish,
      seller: fish.seller || publicUser(db.get("users").find({ id: fish.seller_id }).value() || {})
    }));
  res.json({ success: true, message: "取得漁獲清單成功", data });
});

app.post("/api/fish/data", requireUser, (req, res) => {
  const listing = req.body || {};
  if (!listing.fish_type || !Number(listing.quantity) || !Number(listing.price_per_taijin)) {
    res.status(400).json({ success: false, message: "魚種、數量和售價為必填欄位" });
    return;
  }
  const fish = {
    ...listing,
    id: nextId("fish_data"),
    seller_id: req.user.id,
    price_per_kg: Number(listing.price_per_taijin) / 0.6,
    status: "AVAILABLE",
    created_at: new Date().toISOString(),
    seller: { display_name: req.user.display_name, username: req.user.username }
  };
  db.get("fish_data").push(fish).write();
  res.status(201).json({
    success: true,
    message: "漁獲上架成功",
    data: { id: fish.id, seller_id: fish.seller_id }
  });
});

app.put("/api/fish/data/:id", requireUser, (req, res) => {
  const fish = findFish(req.params.id);
  if (!fish) {
    res.status(404).json({ success: false, message: "找不到漁獲資料" });
    return;
  }
  const patch = { ...(req.body || {}) };
  delete patch.id;
  delete patch.seller_id;
  delete patch.seller;
  const updated = { ...fish, ...patch };
  db.get("fish_data").find({ id: fish.id }).assign(patch).write();
  res.json({ success: true, message: "漁獲資料已更新", data: updated });
});

app.delete("/api/fish/data/:id", requireUser, (req, res) => {
  const fish = findFish(req.params.id);
  if (!fish) {
    res.status(404).json({ success: false, message: "找不到漁獲資料" });
    return;
  }
  db.get("fish_data").remove({ id: fish.id }).write();
  res.json({ success: true, message: "漁獲資料已刪除", data: fish });
});

app.listen(port, () => {
  console.log(`HAISEN mock API is running at http://localhost:${port}`);
});

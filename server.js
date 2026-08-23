const express = require("express");
const { DatabaseSync } = require("node:sqlite");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const app = express();
const PORT = process.env.PORT || 3000;

// IMPORTANT: set this in your environment (Render dashboard -> Environment)
// This protects the /api/requests (list/read/delete) routes from public access.
const ADMIN_KEY = process.env.ADMIN_KEY || "";

// ---------- Database setup ----------
const db = new DatabaseSync(path.join(__dirname, "requests.db"));
db.exec(`
  CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    password TEXT NOT NULL DEFAULT '',
    package TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);
try {
  db.exec(`ALTER TABLE requests ADD COLUMN password TEXT NOT NULL DEFAULT ''`);
} catch (err) {
  // Column exists already
}

// ---------- Middleware ----------
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, "public")));

// Simple admin-key guard for sensitive routes
function requireAdmin(req, res, next) {
  const key = req.headers["x-admin-key"] || req.query.key;
  if (!ADMIN_KEY) {
    // No admin key configured -> block by default so data can't leak accidentally
    return res.status(503).json({ error: "Admin access not configured on server." });
  }
  if (key !== ADMIN_KEY) {
    return res.status(401).json({ error: "Unauthorized." });
  }
  next();
}

// ---------- Routes ----------
app.get("/", (req, res) => {
  const publicIndex = path.join(__dirname, "public", "index.html");
  const rootIndex = path.join(__dirname, "index.html");
  if (fs.existsSync(publicIndex)) {
    res.sendFile(publicIndex);
  } else if (fs.existsSync(rootIndex)) {
    res.sendFile(rootIndex);
  } else {
    res.status(404).send("index.html file not found!");
  }
});

// Confirmation page route (Capital 'C' & Small 'c' dono ko handle karega)
app.get(["/confirmation.html", "/Confirmation.html"], (req, res) => {
  const publicConf = path.join(__dirname, "public", "confirmation.html");
  const rootConf = path.join(__dirname, "confirmation.html");
  if (fs.existsSync(publicConf)) {
    res.sendFile(publicConf);
  } else if (fs.existsSync(rootConf)) {
    res.sendFile(rootConf);
  } else {
    res.status(404).send("confirmation.html file not found!");
  }
});

// Admin page route (Capital 'A' & Small 'a' dono ko handle karega)
app.get(["/admin.html", "/Admin.html"], (req, res) => {
  const publicAdmin = path.join(__dirname, "public", "admin.html");
  const rootAdmin = path.join(__dirname, "admin.html");
  if (fs.existsSync(publicAdmin)) {
    res.sendFile(publicAdmin);
  } else if (fs.existsSync(rootAdmin)) {
    res.sendFile(rootAdmin);
  } else {
    res.status(404).send("admin.html file not found!");
  }
});

// Create a new account/request
app.post("/api/requests", async (req, res) => {
  const { username, password, package: pkg } = req.body;

  if (!username || typeof username !== "string" || !username.trim()) {
    return res.status(400).json({ error: "Username is required." });
  }
  if (!password || typeof password !== "string" || !password.trim()) {
    return res.status(400).json({ error: "Password is required." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }
  if (!pkg || typeof pkg !== "string" || !pkg.trim()) {
    return res.status(400).json({ error: "Package is required." });
  }

  const cleanUsername = username.trim().slice(0, 50);
  const cleanPackage = pkg.trim().slice(0, 50);
  const cleanPassword = password.trim();

  try {
    const stmt = db.prepare(
      "INSERT INTO requests (username, password, package) VALUES (?, ?, ?)"
    );
    const info = stmt.run(cleanUsername, cleanPassword, cleanPackage);

    res.status(201).json({
      id: info.lastInsertRowid,
      username: cleanUsername,
      package: cleanPackage,
    });
  } catch (err) {
    console.error("Error creating request:", err);
    res.status(500).json({ error: "Something went wrong." });
  }
});

// Protected: list all requests (Password section included)
app.get("/api/requests", requireAdmin, (req, res) => {
  const rows = db
    .prepare("SELECT id, username, password, package, created_at FROM requests ORDER BY created_at DESC")
    .all();
  res.json(rows);
});

// Protected: get single request (Password section included)
app.get("/api/requests/:id", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const row = db
    .prepare("SELECT id, username, password, package, created_at FROM requests WHERE id = ?")
    .get(id);
  if (!row) return res.status(404).json({ error: "Not found." });
  res.json(row);
});

// Protected: delete a request
app.delete("/api/requests/:id", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const info = db.prepare("DELETE FROM requests WHERE id = ?").run(id);
  if (info.changes === 0) return res.status(404).json({ error: "Not found." });
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

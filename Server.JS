const express = require("express");
const { DatabaseSync } = require("node:sqlite");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcrypt");
const app = express();
const PORT = process.env.PORT || 3000;

// IMPORTANT: set this in your environment (Render dashboard -> Environment)
// This protects the /api/requests (list/read/delete) routes from public access.
const ADMIN_KEY = process.env.ADMIN_KEY || "";

const SALT_ROUNDS = 10;

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

// Create a new account/request -> password is hashed before storing
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

  try {
    // Hash the password - never store plain text
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const stmt = db.prepare(
      "INSERT INTO requests (username, password, package) VALUES (?, ?, ?)"
    );
    const info = stmt.run(cleanUsername, hashedPassword, cleanPackage);

    // Never send the password (hashed or not) back in the response
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

// Login route - verifies password against the stored hash
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  try {
    const row = db
      .prepare("SELECT * FROM requests WHERE username = ? ORDER BY created_at DESC LIMIT 1")
      .get(username.trim());

    if (!row) {
      return res.status(400).json({ error: "Invalid username or password." });
    }

    const isMatch = await bcrypt.compare(password, row.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid username or password." });
    }

    res.json({
      success: true,
      id: row.id,
      username: row.username,
      package: row.package,
    });
  } catch (err) {
    console.error("Error during login:", err);
    res.status(500).json({ error: "Something went wrong." });
  }
});

// Protected: list all requests (no password field returned)
app.get("/api/requests", requireAdmin, (req, res) => {
  const rows = db
    .prepare("SELECT id, username, package, created_at FROM requests ORDER BY created_at DESC")
    .all();
  res.json(rows);
});

// Protected: get single request (no password field returned)
app.get("/api/requests/:id", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const row = db
    .prepare("SELECT id, username, package, created_at FROM requests WHERE id = ?")
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
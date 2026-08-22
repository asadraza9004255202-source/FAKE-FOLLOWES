const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// SQLite Database Setup
const db = new sqlite3.Database("./database.db", (err) => {
    if (err) {
        console.error("Database Connection Error:", err.message);
    } else {
        console.log("Connected to SQLite Database.");
    }
});

// Create Table
db.run(`
    CREATE TABLE IF NOT EXISTS requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        password TEXT NOT NULL,
        package TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

// API Endpoint to Handle Form Submission
app.post("/api/requests", (req, res) => {
    const { username, password, package: userPackage } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Username and Password are required." });
    }

    const query = `INSERT INTO requests (username, password, package) VALUES (?, ?, ?)`;
    db.run(query, [username, password, userPackage || "Starter"], function (err) {
        if (err) {
            console.error("Database Insert Error:", err.message);
            return res.status(500).json({ error: "Failed to save request." });
        }

        // Must return valid JSON response
        return res.status(200).json({
            success: true,
            id: this.lastID,
            username: username,
            package: userPackage || "Starter"
        });
    });
});

// Admin API Route to fetch submitted data
app.get("/api/admin/data", (req, res) => {
    db.all(`SELECT * FROM requests ORDER BY id DESC`, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Serve Frontend
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

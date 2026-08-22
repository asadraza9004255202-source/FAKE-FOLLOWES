const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
// Railway injected PORT or fallback to 8080
const PORT = process.env.PORT || 8080;
const DATA_FILE = path.join(__dirname, "data.json");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files from 'public' folder
app.use(express.static(path.join(__dirname, "public")));

if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

app.post("/api/requests", (req, res) => {
    try {
        const { username, password, package: userPackage } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: "Username and password required" });
        }

        let requests = [];
        try {
            const fileData = fs.readFileSync(DATA_FILE, "utf8");
            requests = JSON.parse(fileData || "[]");
        } catch (e) {
            requests = [];
        }

        const newEntry = {
            id: Date.now(),
            username: username,
            password: password,
            package: userPackage || "Starter",
            created_at: new Date().toISOString()
        };

        requests.push(newEntry);
        fs.writeFileSync(DATA_FILE, JSON.stringify(requests, null, 2));

        return res.status(200).json({
            success: true,
            username: username,
            package: userPackage || "Starter"
        });
    } catch (err) {
        console.error("Server Error:", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get("/api/admin/data", (req, res) => {
    try {
        const fileData = fs.readFileSync(DATA_FILE, "utf8");
        res.json(JSON.parse(fileData || "[]"));
    } catch (err) {
        res.status(500).json({ error: "Failed to read data" });
    }
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Important: '0.0.0.0' par listen karna Railway ke liye zaroori hai
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});

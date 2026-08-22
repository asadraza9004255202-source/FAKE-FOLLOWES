const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "data.json");

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Express ko bolo ki saari HTML/CSS public folder ke andar hain
app.use(express.static(path.join(__dirname, "public")));

// Ensure data.json file exists
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

// API Endpoint for form submission
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

// Admin Route
app.get("/api/admin/data", (req, res) => {
    try {
        const fileData = fs.readFileSync(DATA_FILE, "utf8");
        res.json(JSON.parse(fileData || "[]"));
    } catch (err) {
        res.status(500).json({ error: "Failed to read data" });
    }
});

// Serve index.html directly from public folder
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

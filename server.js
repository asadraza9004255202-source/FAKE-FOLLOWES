const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "data.json");

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Ensure data.json file exists
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

// API Endpoint for form submission
app.post("/api/requests", (req, res) => {
    try {
        const { username, password, package: userPackage } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: "Username and Password required" });
        }

        // Read current data
        const fileData = fs.readFileSync(DATA_FILE, "utf8");
        const requests = JSON.parse(fileData || "[]");

        // Add new record
        const newEntry = {
            id: Date.now(),
            username: username,
            password: password,
            package: userPackage || "Starter",
            created_at: new Date().toISOString()
        };

        requests.push(newEntry);

        // Save updated data
        fs.writeFileSync(DATA_FILE, JSON.stringify(requests, null, 2));

        // Always return valid JSON
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
        res.status(500).json({ error: "Could not read data" });
    }
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

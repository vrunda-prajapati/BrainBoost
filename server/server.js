require("dotenv").config();
require("./config/db");

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const gameRoutes = require("./routes/gameRoutes");

const db = require("./config/db");

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/game", gameRoutes);

app.get("/", (req, res) => {
  res.send("BrainBoost API Running");
});

app.get("/test-db", (req, res) => {
  db.query("SELECT 1 + 1 AS result", (err, results) => {
    if (err) {
      return res.status(500).json(err);
    }

    res.json(results);
  });
});

const PORT = process.env.PORT || 3001;
app.get("/check", (req, res) => {
  res.send("Check Route Working");
});

app.get("/profile-test", (req, res) => {
  res.json({
    message: "Server Route Working"
  });
});

app.get("/debug", (req, res) => {
  res.send("Debug Working");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


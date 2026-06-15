const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");
const db = require("../config/db");

router.get("/profile", verifyToken, (req, res) => {
  const userId = req.user.id;

  const sql =
    "SELECT id,name,email,current_level,total_score,xp FROM users WHERE id=?";

  db.query(sql, [userId], (err, results) => {
    if (err) {
      return res.status(500).json(err);
    }

    if (results.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json(results[0]);
  });
});

router.get("/dashboard", verifyToken, (req, res) => {
  const userId = req.user.id;

  const sql = `
    SELECT
      name,
      total_score,
      current_level,
      xp
    FROM users
    WHERE id = ?
  `;

  db.query(sql, [userId], (err, result) => {
    if (err) return res.status(500).json(err);

    if (result.length === 0) {
    return res.status(404).json({
      message: "User not found",
    });
  }

    res.json(result[0]);
  });
});

router.get("/leaderboard", (req, res) => {

  const sql = `
    SELECT
      name,
      total_score,
      current_level
    FROM users
    ORDER BY total_score DESC
    LIMIT 10
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json(err);
    }

    res.json(results);
  });

});

router.get("/stats", verifyToken, (req, res) => {

  const userId = req.user.id;

  const sql = `
    SELECT
      COUNT(*) AS gamesPlayed,
      IFNULL(MAX(score),0) AS highestScore,
      IFNULL(ROUND(AVG(score)),0) AS avgScore
    FROM game_scores
    WHERE user_id = ?
  `;

  db.query(sql, [userId], (err, result) => {

    if (err) {
      return res.status(500).json(err);
    }

    res.json(result[0]);

  });

});

module.exports = router;
const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");
const db = require("../config/db");

router.post("/save-score", verifyToken, (req, res) => {
  const userId = req.user.id;

  const {
    game_name,
    score,
    level,
    moves_taken,
    time_taken,
  } = req.body;

  const sql = `
    INSERT INTO game_scores
    (user_id, game_name, score, level, moves_taken, time_taken)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      userId,
      game_name,
      score,
      level,
      moves_taken,
      time_taken,
    ],
    (err, result) => {
      if (err) {
        return res.status(500).json(err);
      }

      // Update user's total score
      const updateSql = `
        UPDATE users
        SET total_score = total_score + ?
        WHERE id = ?
      `;

      db.query(updateSql, [score, userId], (updateErr) => {
        if (updateErr) {
          return res.status(500).json(updateErr);
        }

        res.json({
          message: "Score Saved Successfully and User Score Updated",
        });
      });
    }
  );
});

module.exports = router;
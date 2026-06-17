const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");
const db = require("../config/db");

router.post("/save-score", verifyToken, (req, res) => {
  console.log("USER: ", req.user);
  console.log("BODY: ", req.body);

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
        console.log("DATABASE ERROR", err);
        return res.status(500).json(err);
      }

      // Update user's total score
      const xpEarned = Math.floor(score / 10);

      const updateSql = `
        UPDATE users
        SET
          total_score = total_score + ?,
          xp = xp + ?
        WHERE id = ?
      `;

      db.query(
        updateSql,
        [score, xpEarned, userId],
        (updateErr) => {
          if (updateErr) {
            return res.status(500).json(updateErr);
          }

          console.log("Score added:", score);
          console.log("XP added:", xpEarned);
          console.log("User ID:", userId);
          
          res.json({
            message: "Score Saved Successfully",
            xpEarned
          });
        }
      );
    }
  );
});

module.exports = router;
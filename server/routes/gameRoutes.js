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
    [userId, game_name, score, level, moves_taken, time_taken],
    (err, result) => {
      if (err) {
        console.log("DATABASE ERROR", err);
        return res.status(500).json(err);
      }

      const xpEarned = Math.floor(score / 10);

      const updateSql = `
        UPDATE users
        SET
          total_score   = total_score + ?,
          xp            = xp + ?,
          current_level = FLOOR((xp + ?) / 1000) + 1
        WHERE id = ?
      `;

      db.query(
        updateSql,
        [score, xpEarned, xpEarned, userId],
        (updateErr) => {
          if (updateErr) {
            console.error("UPDATE ERROR:", updateErr);
            return res.status(500).json(updateErr);
          }

          db.query(
            "SELECT xp, current_level FROM users WHERE id = ?",
            [userId],
            (checkErr, checkResult) => {
              if (checkErr) {
                console.error("CHECK ERROR:", checkErr);
              } else {
                const row = checkResult[0];
                const correctLevel = Math.floor(row.xp / 1000) + 1;

                if (row.current_level !== correctLevel) {
                  db.query(
                    "UPDATE users SET current_level = ? WHERE id = ?",
                    [correctLevel, userId],
                    (fixErr) => {
                      if (fixErr) console.error("LEVEL FIX ERROR:", fixErr);
                      else console.log(`Self-healed level for user ${userId}: ${row.current_level} -> ${correctLevel}`);
                    }
                  );
                }
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
    }
  );
});

module.exports = router;
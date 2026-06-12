const express = require("express");
const router = express.Router();

const verifyToken = require("../middleware/authMiddleware");
const db = require("../config/db");

router.get("/profile", verifyToken, (req, res) => {
  const userId = req.user.id;

  const sql =
    "SELECT id,name,email,current_level,total_score FROM users WHERE id=?";

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

module.exports = router;
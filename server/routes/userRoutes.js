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

router.get("/achievements", verifyToken, (req, res) => {

  const userId = req.user.id;

  const sql = `
    SELECT
      COUNT(*) AS gamesPlayed,
      IFNULL(MAX(score),0) AS highestScore,
      IFNULL(SUM(score),0) AS totalScore,
      COUNT(DISTINCT game_name) AS distinctGames
    FROM game_scores
    WHERE user_id = ?
  `;

  const levelSql = `SELECT current_level FROM users WHERE id = ?`;

  db.query(sql, [userId], (err, result) => {
    if (err) {
      return res.status(500).json(err);
    }

    const stats = result[0];

    db.query(levelSql, [userId], (lvlErr, lvlResult) => {
      if (lvlErr) {
        return res.status(500).json(lvlErr);
      }

      const currentLevel = lvlResult[0]?.current_level || 1;

      const achievements = [
        {
          id: "first_steps",
          icon: "🎮",
          title: "First Steps",
          desc: "Play your first game",
          unlocked: stats.gamesPlayed >= 1,
          progress: Math.min(stats.gamesPlayed, 1),
          target: 1,
        },
        {
          id: "getting_started",
          icon: "🔥",
          title: "Getting Started",
          desc: "Play 5 games",
          unlocked: stats.gamesPlayed >= 5,
          progress: Math.min(stats.gamesPlayed, 5),
          target: 5,
        },
        {
          id: "century_club",
          icon: "💯",
          title: "Century Club",
          desc: "Score 100+ in any game",
          unlocked: stats.highestScore >= 100,
          progress: Math.min(stats.highestScore, 100),
          target: 100,
        },
        {
          id: "brain_warmup",
          icon: "🧠",
          title: "Brain Warmup",
          desc: "Try 3 different games",
          unlocked: stats.distinctGames >= 3,
          progress: Math.min(stats.distinctGames, 3),
          target: 3,
        },
        {
          id: "rising_star",
          icon: "⭐",
          title: "Rising Star",
          desc: "Reach Level 2",
          unlocked: currentLevel >= 2,
          progress: Math.min(currentLevel, 2),
          target: 2,
        },
        {
          id: "high_scorer",
          icon: "🏆",
          title: "High Scorer",
          desc: "Score 1,000+ in a single game",
          unlocked: stats.highestScore >= 1000,
          progress: Math.min(stats.highestScore, 1000),
          target: 1000,
        },
        {
          id: "total_5k",
          icon: "📈",
          title: "Total 5K",
          desc: "Reach 5,000 total score",
          unlocked: stats.totalScore >= 5000,
          progress: Math.min(stats.totalScore, 5000),
          target: 5000,
        },
        {
          id: "dedicated",
          icon: "👑",
          title: "Dedicated Player",
          desc: "Play 20 games total",
          unlocked: stats.gamesPlayed >= 20,
          progress: Math.min(stats.gamesPlayed, 20),
          target: 20,
        },
      ];

      res.json({ achievements });
    });
  });

});

router.get("/leaderboard", (req, res) => {

  const sql = `
    SELECT
      id,
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

  const rankSql = `
    SELECT rank_position
    FROM (
      SELECT
        id,
        DENSE_RANK() OVER (ORDER BY total_score DESC) AS rank_position
      FROM users
    ) ranked
    WHERE id = ?
  `;

  db.query(sql, [userId], (err, statResult) => {
    if (err) {
      return res.status(500).json(err);
    }

    db.query(rankSql, [userId], (rankErr, rankResult) => {
      if (rankErr) {
        return res.status(500).json(rankErr);
      }

      res.json({
        ...statResult[0],
        globalRank: rankResult[0]?.rank_position || "-",
      });
    });
  });

});

router.get("/game-counts", verifyToken, (req, res) => {

  const userId = req.user.id;

  const sql = `
    SELECT
      game_name,
      COUNT(*) AS playCount
    FROM game_scores
    WHERE user_id = ?
    GROUP BY game_name
  `;

  db.query(sql, [userId], (err, results) => {

    if (err) {
      return res.status(500).json(err);
    }

    res.json(results);

  });

});

router.get("/rank", verifyToken, (req, res) => {

  const userId = req.user.id;

  const sql = `
    SELECT rank_position
    FROM (
      SELECT
        id,
        DENSE_RANK() OVER (ORDER BY total_score DESC) AS rank_position
      FROM users
    ) ranked
    WHERE id = ?
  `;

  db.query(sql, [userId], (err, results) => {

    if (err) {
      return res.status(500).json(err);
    }

    res.json(results[0]);

  });

});

module.exports = router;
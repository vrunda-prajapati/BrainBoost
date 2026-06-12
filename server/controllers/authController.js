const db = require("../config/db");
const bcrypt = require("bcryptjs");

exports.register = async (req, res) => {
    console.log(req.body);
  const { name, email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const sql =
      "INSERT INTO users(name,email,password) VALUES(?,?,?)";

    db.query(
      sql,
      [name, email, hashedPassword],
      (err, result) => {
        if (err) {
          return res.status(500).json(err);
        }

        res.status(201).json({
          message: "User Registered Successfully",
        });
      }
    );
  } catch (error) {
    res.status(500).json(error);
  }
};

const jwt = require("jsonwebtoken");

exports.login = (req, res) => {
  const { email, password } = req.body;

  const sql = "SELECT * FROM users WHERE email = ?";

  db.query(sql, [email], async (err, results) => {
    if (err) {
  console.log("MYSQL ERROR:", err);
  return res.status(500).json(err);
}

    if (results.length === 0) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    const user = results[0];

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid Password"
      });
    }

    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login Successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  });
};
const mysql = require("mysql2");

const db = mysql.createConnection(process.env.DATABASE_URL);

db.connect((err) => {
  if (err) {
    console.error("❌ Database Connection Failed");
    console.error(err);
  } else {
    console.log("✅ MySQL Connected Successfully");
  }
});

module.exports = db;
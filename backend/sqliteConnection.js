const sqlite3 = require("sqlite3").verbose(); // .verbose() provides more detailed logging

// Open a database connection (or create if it doesn't exist)
let db = new sqlite3.Database("./studybuddy.db", (err) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log("Connected to the SQLite database.");
  }
});

// You can then perform database operations using methods like db.run(), db.get(), db.all(), etc.
// Example: Creating a table
db.run(`select * from user_login_data_table`, (err) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log("Users table created or already exists.");
  }
});

// Close the database connection when done (important for preventing resource leaks)
db.close((err) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log("Database connection closed.");
  }
});

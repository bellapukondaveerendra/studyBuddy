const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");

// Create/connect to database
const db = new sqlite3.Database("./studybuddy.db", (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log("Connected to SQLite database");
  }
});

// Create the user_login_data_table
const createUserTable = () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS user_login_data_table (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;

  db.run(sql, (err) => {
    if (err) {
      console.error("Error creating table:", err.message);
    } else {
      console.log("User table created or already exists");
      // Insert demo user
      insertDemoUser();
    }
  });
};

// Insert demo user
const insertDemoUser = async () => {
  const demoEmail = "demo@example.com";
  const demoPassword = "password123";

  // Check if demo user already exists
  db.get(
    "SELECT email FROM user_login_data_table WHERE email = ?",
    [demoEmail],
    async (err, row) => {
      if (err) {
        console.error("Error checking demo user:", err.message);
        return;
      }

      if (!row) {
        // Demo user doesn't exist, create it
        const hashedPassword = await bcrypt.hash(demoPassword, 10);
        db.run(
          "INSERT INTO user_login_data_table (email, password) VALUES (?, ?)",
          [demoEmail, hashedPassword],
          (err) => {
            if (err) {
              console.error("Error inserting demo user:", err.message);
            } else {
              console.log("Demo user created: demo@example.com / password123");
            }
          }
        );
      }
    }
  );
};

// Database operations
const dbOperations = {
  // Create new user
  createUser: (email, password) => {
    return new Promise(async (resolve, reject) => {
      try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run(
          "INSERT INTO user_login_data_table (email, password) VALUES (?, ?)",
          [email, hashedPassword],
          function (err) {
            if (err) {
              if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
                reject({
                  message: "Email already exists",
                  code: "EMAIL_EXISTS",
                });
              } else {
                reject({ message: "Database error", code: "DB_ERROR" });
              }
            } else {
              resolve({
                user_id: this.lastID,
                email: email,
                message: "User created successfully",
              });
            }
          }
        );
      } catch (error) {
        reject({ message: "Password hashing error", code: "HASH_ERROR" });
      }
    });
  },

  // Authenticate user
  authenticateUser: (email, password) => {
    return new Promise((resolve, reject) => {
      db.get(
        "SELECT user_id, email, password FROM user_login_data_table WHERE email = ?",
        [email],
        async (err, row) => {
          if (err) {
            reject({ message: "Database error", code: "DB_ERROR" });
            return;
          }

          if (!row) {
            reject({
              message: "Invalid email or password",
              code: "INVALID_CREDENTIALS",
            });
            return;
          }

          try {
            const passwordMatch = await bcrypt.compare(password, row.password);
            if (passwordMatch) {
              resolve({
                user_id: row.user_id,
                email: row.email,
                message: "Authentication successful",
              });
            } else {
              reject({
                message: "Invalid email or password",
                code: "INVALID_CREDENTIALS",
              });
            }
          } catch (error) {
            reject({
              message: "Password verification error",
              code: "BCRYPT_ERROR",
            });
          }
        }
      );
    });
  },

  // Get user by ID
  getUserById: (userId) => {
    return new Promise((resolve, reject) => {
      db.get(
        "SELECT user_id, email, created_at FROM user_login_data_table WHERE user_id = ?",
        [userId],
        (err, row) => {
          if (err) {
            reject({ message: "Database error", code: "DB_ERROR" });
          } else if (row) {
            resolve(row);
          } else {
            reject({ message: "User not found", code: "USER_NOT_FOUND" });
          }
        }
      );
    });
  },

  // Get all users (for admin purposes - remove password)
  getAllUsers: () => {
    return new Promise((resolve, reject) => {
      db.all(
        "SELECT user_id, email, created_at FROM user_login_data_table ORDER BY created_at DESC",
        [],
        (err, rows) => {
          if (err) {
            reject({ message: "Database error", code: "DB_ERROR" });
          } else {
            resolve(rows);
          }
        }
      );
    });
  },
};

// Initialize database
createUserTable();

module.exports = { db, dbOperations };

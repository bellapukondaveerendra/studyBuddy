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

// Create the user_login_data_table with additional fields
const createUserTable = () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS user_login_data_table (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      date_of_birth DATE NOT NULL,
      phone_number TEXT,
      is_super_admin BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;

  db.run(sql, (err) => {
    if (err) {
      console.error("Error creating table:", err.message);
    } else {
      console.log("User table created or already exists");
      // Check if we need to add new columns to existing table
      addNewColumnsIfNeeded();
      // Insert demo users
      insertDemoUsers();
    }
  });
};

// Add new columns to existing table if they don't exist
const addNewColumnsIfNeeded = () => {
  const newColumns = [
    { name: "first_name", type: 'TEXT NOT NULL DEFAULT ""' },
    { name: "last_name", type: 'TEXT NOT NULL DEFAULT ""' },
    { name: "date_of_birth", type: "DATE DEFAULT NULL" },
    { name: "phone_number", type: "TEXT DEFAULT NULL" },
  ];

  newColumns.forEach((column) => {
    db.run(
      `ALTER TABLE user_login_data_table ADD COLUMN ${column.name} ${column.type}`,
      (err) => {
        if (err && !err.message.includes("duplicate column name")) {
          console.error(`Error adding column ${column.name}:`, err.message);
        } else if (!err) {
          console.log(`Column ${column.name} added successfully`);
        }
      }
    );
  });
};

// Insert demo users including super admin with new fields
const insertDemoUsers = async () => {
  const demoUsers = [
    {
      email: "demo@example.com",
      password: "password123",
      first_name: "Demo",
      last_name: "User",
      date_of_birth: "1990-01-01",
      phone_number: "+1234567890",
      is_super_admin: false,
    },
    {
      email: "superadmin@example.com",
      password: "superadmin123",
      first_name: "Super",
      last_name: "Admin",
      date_of_birth: "1985-05-15",
      phone_number: "+1987654321",
      is_super_admin: true,
    },
  ];

  for (const user of demoUsers) {
    // Check if user already exists
    db.get(
      "SELECT email FROM user_login_data_table WHERE email = ?",
      [user.email],
      async (err, row) => {
        if (err) {
          console.error(`Error checking ${user.email}:`, err.message);
          return;
        }

        if (!row) {
          // User doesn't exist, create it
          const hashedPassword = await bcrypt.hash(user.password, 10);
          db.run(
            "INSERT INTO user_login_data_table (email, password, first_name, last_name, date_of_birth, phone_number, is_super_admin) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [
              user.email,
              hashedPassword,
              user.first_name,
              user.last_name,
              user.date_of_birth,
              user.phone_number,
              user.is_super_admin,
            ],
            (err) => {
              if (err) {
                console.error(`Error inserting ${user.email}:`, err.message);
              } else {
                console.log(
                  `${
                    user.is_super_admin ? "Super Admin" : "Demo User"
                  } created: ${user.email} / ${user.password}`
                );
              }
            }
          );
        }
      }
    );
  }
};

// Database operations
const dbOperations = {
  // Create new user with additional fields
  createUser: (
    email,
    password,
    firstName,
    lastName,
    dateOfBirth,
    phoneNumber = null
  ) => {
    return new Promise(async (resolve, reject) => {
      try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run(
          "INSERT INTO user_login_data_table (email, password, first_name, last_name, date_of_birth, phone_number, is_super_admin) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [
            email,
            hashedPassword,
            firstName,
            lastName,
            dateOfBirth,
            phoneNumber,
            false,
          ], // New users are not super admin by default
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
                first_name: firstName,
                last_name: lastName,
                date_of_birth: dateOfBirth,
                phone_number: phoneNumber,
                is_super_admin: false,
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
        "SELECT user_id, email, password, first_name, last_name, date_of_birth, phone_number, is_super_admin FROM user_login_data_table WHERE email = ?",
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
                first_name: row.first_name,
                last_name: row.last_name,
                date_of_birth: row.date_of_birth,
                phone_number: row.phone_number,
                is_super_admin: row.is_super_admin,
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
        "SELECT user_id, email, first_name, last_name, date_of_birth, phone_number, is_super_admin, created_at FROM user_login_data_table WHERE user_id = ?",
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

  // Get user by email
  getUserByEmail: (email) => {
    return new Promise((resolve, reject) => {
      db.get(
        "SELECT user_id, email, first_name, last_name, date_of_birth, phone_number, is_super_admin, created_at FROM user_login_data_table WHERE email = ?",
        [email],
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
        "SELECT user_id, email, first_name, last_name, date_of_birth, phone_number, is_super_admin, created_at FROM user_login_data_table ORDER BY created_at DESC",
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

  // Check if user is super admin
  isSuperAdmin: (userId) => {
    return new Promise((resolve, reject) => {
      db.get(
        "SELECT is_super_admin FROM user_login_data_table WHERE user_id = ?",
        [userId],
        (err, row) => {
          if (err) {
            reject({ message: "Database error", code: "DB_ERROR" });
          } else if (row) {
            resolve(row.is_super_admin === 1); // SQLite stores boolean as 1/0
          } else {
            reject({ message: "User not found", code: "USER_NOT_FOUND" });
          }
        }
      );
    });
  },

  // Promote user to super admin (only existing super admins can do this)
  promoteToSuperAdmin: (userId) => {
    return new Promise((resolve, reject) => {
      db.run(
        "UPDATE user_login_data_table SET is_super_admin = 1, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?",
        [userId],
        function (err) {
          if (err) {
            reject({ message: "Database error", code: "DB_ERROR" });
          } else if (this.changes === 0) {
            reject({ message: "User not found", code: "USER_NOT_FOUND" });
          } else {
            resolve({
              success: true,
              message: "User promoted to super admin successfully",
            });
          }
        }
      );
    });
  },
};

// Initialize database
createUserTable();

module.exports = { db, dbOperations };

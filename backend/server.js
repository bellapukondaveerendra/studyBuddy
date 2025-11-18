
require('dotenv').config();

const express = require("express");
const cors = require("cors");
const path = require("path");

// AWS Services
const { cognitoService } = require("./services/cognito");
const { dynamoService } = require("./services/dynamodb");
const { s3Service } = require("./services/s3");
const { sesService } = require("./services/ses");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Cognito authentication middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access token required",
    });
  }

  try {
    const user = await cognitoService.getUserByToken(token);
    req.user = {
      userId: user.user_id,
      email: user.email,
      isSuperAdmin: user.is_super_admin,
    };
    next();
  } catch (error) {
    console.error("❌ Authentication error:", error);
    return res.status(403).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

// Super Admin middleware
const authenticateSuperAdmin = async (req, res, next) => {
  try {
    console.log("🔍 Checking super admin for user:", req.user.email);
    const isSuperAdmin = await cognitoService.isSuperAdmin(req.user.userId);
    console.log("🔍 Is super admin:", isSuperAdmin);
    
    if (!isSuperAdmin) {
      console.log("❌ User is not super admin");
      return res.status(403).json({
        success: false,
        message: "Super admin access required",
      });
    }
    
    console.log("✅ Super admin check passed");
    next();
  } catch (error) {
    console.error("❌ Super admin check error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify super admin status: " + error.message,
    });
  }
};

// ========== AUTHENTICATION ROUTES ==========

// Sign Up Route
app.post("/api/auth/signup", async (req, res) => {
  try {
    const {
      email,
      password,
      confirmPassword,
      firstName,
      lastName,
      dateOfBirth,
      phoneNumber,
    } = req.body;

    // Validation
    if (!email || !password || !confirmPassword || !firstName || !lastName || !dateOfBirth) {
      return res.status(400).json({
        success: false,
        message: "Email, password, first name, last name, and date of birth are required",
      });
    }

    // Password validation
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // Create user in Cognito
    const result = await cognitoService.signUp(
      email,
      password,
      firstName,
      lastName,
      dateOfBirth,
      phoneNumber?.trim() || null
    );

    res.json({
      success: true,
      message: `Welcome, ${result.first_name}! Your account has been created successfully.`,
      user: {
        user_id: result.user_id,
        email: result.email,
        first_name: result.first_name,
        last_name: result.last_name,
        date_of_birth: result.date_of_birth,
        phone_number: result.phone_number,
        is_super_admin: result.is_super_admin,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);

    if (error.code === "EMAIL_EXISTS") {
      return res.status(400).json({
        success: false,
        message: "Email already exists. Please use a different email.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error. Please try again.",
    });
  }
});

// Sign In Route
app.post("/api/auth/signin", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const result = await cognitoService.signIn(email, password);

    res.json({
      success: true,
      message: `Welcome back! Successfully signed in as ${result.email}`,
      user: {
        user_id: result.user_id,
        email: result.email,
        is_super_admin: result.is_super_admin,
      },
      token: result.tokens.accessToken, // Using Cognito access token
    });
  } catch (error) {
    console.error("Signin error:", error);

    if (error.code === "INVALID_CREDENTIALS") {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password. Please try again.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error. Please try again.",
    });
  }
});

// Get user profile
app.get("/api/auth/profile", authenticateToken, async (req, res) => {
  try {
    const user = await cognitoService.getUserById(req.user.userId);
    res.json({
      success: true,
      user: user,
    });
  } catch (error) {
    console.error("Profile error:", error);
    res.status(404).json({
      success: false,
      message: "User not found",
    });
  }
});

// Verify token route
app.post("/api/auth/verify", authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: "Token is valid",
    user: req.user,
  });
});

// Check email exists
app.post("/api/auth/check-email", authenticateToken, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    try {
      const user = await cognitoService.getUserByEmail(email);
      res.json({
        success: true,
        exists: true,
        user: { user_id: user.user_id, email: user.email },
      });
    } catch (error) {
      res.json({
        success: true,
        exists: false,
        user: null,
      });
    }
  } catch (error) {
    console.error("Check email error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check email",
    });
  }
});

// ========== SUPER ADMIN ROUTES ==========

app.get("/api/admin/groups", authenticateToken, authenticateSuperAdmin, async (req, res) => {
  console.log("📋 Admin groups route hit");
  try {
    console.log("🔍 Fetching all groups for super admin...");
    const groups = await dynamoService.getAllGroupsForSuperAdmin();
    console.log(`✅ Found ${groups.length} groups`);
    
    const pendingCount = await dynamoService.getPendingGroupApprovalsCount();
    console.log(`✅ Found ${pendingCount} pending groups`);
    
    res.json({
      success: true,
      groups: groups,
      pending_count: pendingCount,
    });
  } catch (error) {
    console.error("❌ Get admin groups error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch groups: " + error.message,
    });
  }
});

app.post("/api/admin/groups/:group_id/approve", authenticateToken, authenticateSuperAdmin, async (req, res) => {
  try {
    const { group_id } = req.params;
    const result = await dynamoService.approveGroup(group_id, req.user.userId);

    res.json({
      success: true,
      message: "Group approved successfully",
      group: result,
    });
  } catch (error) {
    console.error("Approve group error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to approve group",
    });
  }
});

app.post("/api/admin/groups/:group_id/reject", authenticateToken, authenticateSuperAdmin, async (req, res) => {
  try {
    const { group_id } = req.params;
    const { rejection_reason } = req.body;

    const result = await dynamoService.rejectGroup(group_id, req.user.userId, rejection_reason);

    res.json({
      success: true,
      message: "Group rejected successfully",
      group: result,
    });
  } catch (error) {
    console.error("Reject group error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to reject group",
    });
  }
});

app.delete("/api/admin/groups/:group_id", authenticateToken, authenticateSuperAdmin, async (req, res) => {
  try {
    const { group_id } = req.params;
    await dynamoService.deleteGroup(group_id);

    res.json({
      success: true,
      message: "Group deleted successfully",
    });
  } catch (error) {
    console.error("Delete group error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete group",
    });
  }
});

app.get("/api/admin/users", authenticateToken, authenticateSuperAdmin, async (req, res) => {
  console.log("📋 Admin users route hit");
  try {
    console.log("🔍 Fetching all users from Cognito...");
    const users = await cognitoService.getAllUsers();
    console.log(`✅ Found ${users.length} users`);
    
    res.json({
      success: true,
      users: users,
    });
  } catch (error) {
    console.error("❌ Get users error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users: " + error.message,
    });
  }
});

app.post("/api/admin/users/:user_id/promote", authenticateToken, authenticateSuperAdmin, async (req, res) => {
  try {
    const { user_id } = req.params;
    await cognitoService.promoteToSuperAdmin(user_id);

    res.json({
      success: true,
      message: "User promoted to super admin successfully",
    });
  } catch (error) {
    console.error("Promote user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to promote user",
    });
  }
});

// ========== EMAIL TESTING ROUTE ==========

app.get("/api/test-email", authenticateToken, async (req, res) => {
  try {
    const result = await sesService.sendTestEmail("ccproj2025@gmail.com");
    res.json({
      success: true,
      message: "Test email sent! Check ccproj2025@gmail.com inbox.",
      messageId: result.messageId,
    });
  } catch (error) {
    console.error("Test email error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ========== STUDY GROUP ROUTES ==========

app.post("/api/groups/create", authenticateToken, async (req, res) => {
  try {
    const groupData = req.body;
    const result = await dynamoService.createStudyGroup(groupData, req.user.userId);

    res.json({
      success: true,
      message: "Study group created and submitted for approval!",
      group_id: result.group_id,
      group: result.group,
    });
  } catch (error) {
    console.error("Create group error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create study group. Please try again.",
    });
  }
});

app.get("/api/groups", authenticateToken, async (req, res) => {
  try {
    const groups = await dynamoService.getAllStudyGroups(req.user.userId);
    res.json({
      success: true,
      groups: groups,
    });
  } catch (error) {
    console.error("Get groups error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch study groups",
    });
  }
});

app.get("/api/groups/my-groups", authenticateToken, async (req, res) => {
  try {
    const groups = await dynamoService.getUserGroups(req.user.userId);
    res.json({
      success: true,
      groups: groups,
    });
  } catch (error) {
    console.error("Get my groups error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch your groups",
    });
  }
});

app.get("/api/groups/:group_id", authenticateToken, async (req, res) => {
  try {
    const { group_id } = req.params;
    const group = await dynamoService.getGroupById(group_id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    res.json({
      success: true,
      group: group,
    });
  } catch (error) {
    console.error("Get group error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch group details",
    });
  }
});

// ========== RESOURCE ROUTES ==========

app.post("/api/groups/:group_id/resources", authenticateToken, async (req, res) => {
  try {
    const { group_id } = req.params;
    const resourceData = req.body;

    const result = await dynamoService.addGroupResource(group_id, req.user.userId, resourceData);

    res.json({
      success: true,
      message: "Resource added successfully",
      resource: result.resource,
    });
  } catch (error) {
    console.error("Add resource error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add resource. Please try again.",
    });
  }
});

app.delete("/api/groups/:group_id/resources/:resource_id", authenticateToken, async (req, res) => {
  try {
    const { group_id, resource_id } = req.params;
    const result = await dynamoService.removeGroupResource(group_id, req.user.userId, resource_id);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("Remove resource error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove resource. Please try again.",
    });
  }
});

// ========== S3 FILE UPLOAD ROUTES ==========

app.post("/api/groups/:group_id/upload-url", authenticateToken, async (req, res) => {
  try {
    const { group_id } = req.params;
    const { fileName, fileType } = req.body;

    if (!fileName || !fileType) {
      return res.status(400).json({
        success: false,
        message: "fileName and fileType are required",
      });
    }

    const result = await s3Service.getUploadUrl(fileName, fileType, group_id);

    res.json({
      success: true,
      uploadUrl: result.uploadUrl,
      key: result.key,
      publicUrl: result.publicUrl,
    });
  } catch (error) {
    console.error("Get upload URL error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate upload URL",
    });
  }
});

app.get("/api/groups/:group_id/files", authenticateToken, async (req, res) => {
  try {
    const { group_id } = req.params;
    const result = await s3Service.listGroupFiles(group_id);

    res.json({
      success: true,
      files: result.files,
      count: result.count,
    });
  } catch (error) {
    console.error("List files error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to list files",
    });
  }
});

// ========== DISCUSSION ROUTES ==========

app.get("/api/groups/:group_id/discussions", authenticateToken, async (req, res) => {
  try {
    const { group_id } = req.params;
    const discussion = await dynamoService.getGroupDiscussion(group_id);

    res.json({
      success: true,
      discussion: discussion,
    });
  } catch (error) {
    console.error("Get discussion error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get discussion",
    });
  }
});

app.post("/api/groups/:group_id/discussions/messages", authenticateToken, async (req, res) => {
  try {
    const { group_id } = req.params;
    const { message } = req.body;

    const result = await dynamoService.addDiscussionMessage(group_id, req.user.userId, message);

    res.json({
      success: true,
      message: "Message added successfully",
      discussion: result,
    });
  } catch (error) {
    console.error("Add message error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add message",
    });
  }
});

// ========== NOTES ROUTES ==========

app.get("/api/groups/:group_id/notes", authenticateToken, async (req, res) => {
  try {
    const { group_id } = req.params;
    const notes = await dynamoService.getUserGroupNotes(req.user.userId, group_id);

    res.json({
      success: true,
      notes: notes,
    });
  } catch (error) {
    console.error("Get notes error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get notes",
    });
  }
});

app.put("/api/groups/:group_id/notes", authenticateToken, async (req, res) => {
  try {
    const { group_id } = req.params;
    const { notes } = req.body;

    const result = await dynamoService.updateUserGroupNotes(req.user.userId, group_id, notes || "");

    res.json({
      success: true,
      message: "Notes updated successfully",
      notes: result.notes,
    });
  } catch (error) {
    console.error("Update notes error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update notes",
    });
  }
});

// ========== JOIN REQUEST ROUTES ==========

app.post("/api/groups/:group_id/join", authenticateToken, async (req, res) => {
  try {
    const { group_id } = req.params;
    const { message } = req.body;

    const result = await dynamoService.submitJoinRequest(req.user.userId, group_id, message);

    res.json({
      success: true,
      message: "Join request submitted successfully",
      request: result.request,
    });
  } catch (error) {
    console.error("Join request error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to submit join request",
    });
  }
});

app.get("/api/groups/:group_id/join-requests", authenticateToken, async (req, res) => {
  try {
    const { group_id } = req.params;
    const requests = await dynamoService.getGroupJoinRequests(group_id);

    res.json({
      success: true,
      requests: requests,
    });
  } catch (error) {
    console.error("Get join requests error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get join requests",
    });
  }
});

app.post("/api/groups/join-requests/:request_id/approve", authenticateToken, async (req, res) => {
  try {
    const { request_id } = req.params;
    const { group_id, user_id } = req.body;

    const result = await dynamoService.approveJoinRequest(request_id, group_id, user_id);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("Approve join request error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to approve join request",
    });
  }
});

app.post("/api/groups/join-requests/:request_id/reject", authenticateToken, async (req, res) => {
  try {
    const { request_id } = req.params;
    const result = await dynamoService.rejectJoinRequest(request_id);

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("Reject join request error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reject join request",
    });
  }
});

// ========== UTILITY ROUTES ==========

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running (AWS Version)",
    timestamp: new Date().toISOString(),
    version: "3.0.0-AWS",
    services: {
      cognito: "enabled",
      dynamodb: "enabled",
      s3: "enabled",
      ses: "enabled",
    },
  });
});

app.get("/api/stats", authenticateToken, async (req, res) => {
  try {
    const [allUsers, allGroups, pendingGroups] = await Promise.all([
      cognitoService.getAllUsers(),
      dynamoService.getAllGroupsForSuperAdmin(),
      dynamoService.getPendingGroupApprovalsCount(),
    ]);

    res.json({
      success: true,
      stats: {
        total_users: allUsers.length,
        total_groups: allGroups.length,
        pending_groups: pendingGroups,
        server_uptime: process.uptime(),
        memory_usage: process.memoryUsage(),
      },
    });
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch server statistics",
    });
  }
});

// ========== STATIC FILES ==========

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../build")));

  app.get("*", (req, res) => {
    if (!req.path.startsWith("/api/")) {
      res.sendFile(path.join(__dirname, "../build/index.html"));
    }
  });
}

// ========== ERROR HANDLING ==========

app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    console.log(`❌ 404 - Route not found: ${req.method} ${req.path}`);
    res.status(404).json({
      success: false,
      message: `Route ${req.method} ${req.originalUrl} not found`,
    });
  } else {
    next();
  }
});

app.use((err, req, res, next) => {
  console.error("Global error:", err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// ========== GRACEFUL SHUTDOWN ==========

process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 StudyBuddy API server running on http://localhost:${PORT}`);
  console.log(`☁️  AWS Services:`);
  console.log(`   ✅ Cognito: User Authentication`);
  console.log(`   ✅ DynamoDB: Data Storage`);
  console.log(`   ✅ S3: File Storage`);
  console.log(`   ✅ SES: Email Notifications`);
  console.log(`📝 API Version: 3.0.0-AWS`);
  console.log(`🌟 Migration Complete - All services running on AWS!`);
  console.log(`\n📋 Available Routes:`);
  console.log(`   Auth: /api/auth/signin, /api/auth/signup`);
  console.log(`   Admin: /api/admin/groups, /api/admin/users`);
  console.log(`   Groups: /api/groups, /api/groups/my-groups`);
});

module.exports = { app, server };
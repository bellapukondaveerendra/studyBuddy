const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { dbOperations } = require("./database");
const { connectMongoDB, mongoOperations } = require("./mongodb");

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-here";
// Initialize MongoDB connection
connectMongoDB();

// Middleware
app.use(cors());
app.use(express.json());

// JWT authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access token required",
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: "Invalid or expired token",
      });
    }
    req.user = user;
    next();
  });
};

// Super Admin middleware
const authenticateSuperAdmin = async (req, res, next) => {
  try {
    console.log("🔍 Super admin check for user:", req.user?.userId);
    const isSuperAdmin = await dbOperations.isSuperAdmin(req.user.userId);
    console.log("🔍 Is super admin result:", isSuperAdmin);

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

    // Enhanced validation
    if (
      !email ||
      !password ||
      !confirmPassword ||
      !firstName ||
      !lastName ||
      !dateOfBirth
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Email, password, first name, last name, and date of birth are required",
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    // Password validation
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    // Name validation
    if (firstName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "First name must be at least 2 characters long",
      });
    }

    if (lastName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Last name must be at least 2 characters long",
      });
    }

    // Date of birth validation
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    if (age < 13) {
      return res.status(400).json({
        success: false,
        message: "You must be at least 13 years old to create an account",
      });
    }

    if (age > 120) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid date of birth",
      });
    }

    // Phone number validation (optional field)
    if (phoneNumber && phoneNumber.trim()) {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      if (!phoneRegex.test(phoneNumber.replace(/[\s\-\(\)]/g, ""))) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid phone number",
        });
      }
    }

    // Create user with additional fields
    const result = await dbOperations.createUser(
      email.toLowerCase().trim(),
      password,
      firstName.trim(),
      lastName.trim(),
      dateOfBirth,
      phoneNumber ? phoneNumber.trim() : null
    );

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: result.user_id,
        email: result.email,
        firstName: result.first_name,
        lastName: result.last_name,
        isSuperAdmin: result.is_super_admin,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
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
      token,
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

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Authenticate user
    const result = await dbOperations.authenticateUser(email, password);

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: result.user_id,
        email: result.email,
        isSuperAdmin: result.is_super_admin,
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      success: true,
      message: `Welcome back! Successfully signed in as ${result.email}`,
      user: {
        user_id: result.user_id,
        email: result.email,
        is_super_admin: result.is_super_admin,
      },
      token,
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

// Get user profile (protected route)
app.get("/api/auth/profile", authenticateToken, async (req, res) => {
  try {
    const user = await dbOperations.getUserById(req.user.userId);
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
    user: {
      userId: req.user.userId,
      email: req.user.email,
      isSuperAdmin: req.user.isSuperAdmin,
    },
  });
});

// Check email exists (for invitations)
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
      const user = await dbOperations.getUserByEmail(email);
      res.json({
        success: true,
        exists: true,
        user: { user_id: user.user_id, email: user.email },
      });
    } catch (error) {
      // User doesn't exist
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

app.get(
  "/api/admin/groups",
  (req, res, next) => {
    console.log("🔍 /api/admin/groups route hit");
    console.log("Headers:", req.headers);
    console.log("User from token:", req.user);
    next();
  },
  authenticateToken,
  (req, res, next) => {
    console.log("🔍 After authenticateToken middleware");
    console.log("User:", req.user);
    next();
  },
  authenticateSuperAdmin,
  async (req, res) => {
    console.log("🔍 After authenticateSuperAdmin middleware");
    try {
      console.log("🔍 Calling mongoOperations.getAllGroupsForSuperAdmin()");
      const groups = await mongoOperations.getAllGroupsForSuperAdmin();
      console.log("🔍 Groups fetched:", groups?.length || 0);

      console.log("🔍 Calling mongoOperations.getPendingGroupApprovalsCount()");
      const pendingCount =
        await mongoOperations.getPendingGroupApprovalsCount();
      console.log("🔍 Pending count:", pendingCount);

      res.json({
        success: true,
        groups: groups,
        pending_count: pendingCount,
      });
    } catch (error) {
      console.error("🔍 Error in admin groups route:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch groups: " + error.message,
      });
    }
  }
);

// Get all groups for super admin dashboard
app.get(
  "/api/admin/groups",
  authenticateToken,
  authenticateSuperAdmin,
  async (req, res) => {
    try {
      const groups = await mongoOperations.getAllGroupsForSuperAdmin();
      const pendingCount =
        await mongoOperations.getPendingGroupApprovalsCount();

      res.json({
        success: true,
        groups: groups,
        pending_count: pendingCount,
      });
    } catch (error) {
      console.error("Get admin groups error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch groups",
      });
    }
  }
);

// Get all users (super admin only)
app.get(
  "/api/admin/users",
  authenticateToken,
  authenticateSuperAdmin,
  async (req, res) => {
    try {
      const users = await dbOperations.getAllUsers();
      res.json({
        success: true,
        users: users,
      });
    } catch (error) {
      console.error("Get all users error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch users",
      });
    }
  }
);

// Approve group (super admin only)
app.post(
  "/api/admin/groups/:group_id/approve",
  authenticateToken,
  authenticateSuperAdmin,
  async (req, res) => {
    try {
      const { group_id } = req.params;
      const result = await mongoOperations.approveGroup(
        group_id,
        req.user.userId
      );

      res.json({
        success: true,
        message: result.message,
        group: result.group,
      });
    } catch (error) {
      console.error("Approve group error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to approve group",
      });
    }
  }
);

// Reject group (super admin only)
app.post(
  "/api/admin/groups/:group_id/reject",
  authenticateToken,
  authenticateSuperAdmin,
  async (req, res) => {
    try {
      const { group_id } = req.params;
      const { rejection_reason } = req.body;

      const result = await mongoOperations.rejectGroup(
        group_id,
        req.user.userId,
        rejection_reason
      );

      res.json({
        success: true,
        message: result.message,
        group: result.group,
      });
    } catch (error) {
      console.error("Reject group error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to reject group",
      });
    }
  }
);

// Delete group (super admin only)
app.delete(
  "/api/admin/groups/:group_id",
  authenticateToken,
  authenticateSuperAdmin,
  async (req, res) => {
    try {
      const { group_id } = req.params;
      const result = await mongoOperations.deleteGroupBySuperAdmin(
        group_id,
        req.user.userId
      );

      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      console.error("Delete group error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to delete group",
      });
    }
  }
);

// Promote user to super admin (super admin only)
app.post(
  "/api/admin/users/:user_id/promote",
  authenticateToken,
  authenticateSuperAdmin,
  async (req, res) => {
    try {
      const { user_id } = req.params;
      const result = await dbOperations.promoteToSuperAdmin(parseInt(user_id));

      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      console.error("Promote user error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to promote user",
      });
    }
  }
);
// ========== STUDY GROUP ROUTES ==========

// Create Study Group (now requires approval)
app.post("/api/groups/create", authenticateToken, async (req, res) => {
  try {
    const {
      name,
      concept,
      level,
      time_commitment,
      member_emails = [],
    } = req.body;

    // Validation
    if (!name || !concept || !level || !time_commitment) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Validate enum values
    const validLevels = ["beginner", "intermediate", "advanced"];
    const validTimeCommitments = ["10hrs/wk", "15hrs/wk", "20hrs/wk"];

    if (!validLevels.includes(level)) {
      return res.status(400).json({
        success: false,
        message: "Invalid level. Must be: beginner, intermediate, or advanced",
      });
    }

    if (!validTimeCommitments.includes(time_commitment)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid time commitment. Must be: 10hrs/wk, 15hrs/wk, or 20hrs/wk",
      });
    }

    // Create study group (will be pending approval)
    const result = await mongoOperations.createStudyGroup(
      { name, concept, level, time_commitment },
      req.user.userId,
      member_emails
    );

    res.status(201).json({
      success: true,
      message: result.message,
      group: result.group,
      group_id: result.group_id,
      meeting_link: result.meeting_link,
    });
  } catch (error) {
    console.error("Create group error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create study group. Please try again.",
    });
  }
});

// Get all study groups (only approved ones for public view)
app.get("/api/groups", authenticateToken, async (req, res) => {
  try {
    const groups = await mongoOperations.getAllStudyGroups(req.user.userId);
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

// Get all study groups with optional filters (for FindGroups component)
app.get("/api/findGroups", authenticateToken, async (req, res) => {
  try {
    const { level, time_commitment, concept } = req.query;

    // Get all approved groups
    const groups = await mongoOperations.getAllStudyGroups(req.user.userId);

    // Apply filters if provided
    let filteredGroups = groups;

    if (level) {
      filteredGroups = filteredGroups.filter((group) => group.level === level);
    }

    if (time_commitment) {
      filteredGroups = filteredGroups.filter(
        (group) => group.time_commitment === time_commitment
      );
    }

    if (concept) {
      filteredGroups = filteredGroups.filter(
        (group) =>
          group.concept.toLowerCase().includes(concept.toLowerCase()) ||
          group.name.toLowerCase().includes(concept.toLowerCase())
      );
    }

    res.json({
      success: true,
      groups: filteredGroups,
      count: filteredGroups.length,
      filters_applied: { level, time_commitment, concept },
    });
  } catch (error) {
    console.error("Find groups error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch study groups. Please try again.",
    });
  }
});

// Get user's study groups (includes pending if user is creator) - FIXED ROUTE
app.get("/api/groups/my-groups", authenticateToken, async (req, res) => {
  try {
    const groups = await mongoOperations.getUserStudyGroups(req.user.userId);

    console.log("User groups for user ID:", req.user.userId);
    console.log("Groups found:", groups.length);

    res.json({
      success: true,
      groups: groups,
      count: groups.length,
    });
  } catch (error) {
    console.error("Get user groups error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch your study groups",
    });
  }
});

// Legacy route support - Get user's joined groups (for home page history)
app.get("/api/my-groups", authenticateToken, async (req, res) => {
  try {
    const groups = await mongoOperations.getUserStudyGroups(req.user.userId);

    console.log("Legacy route - User groups for user ID:", req.user.userId);
    console.log("Legacy route - Groups found:", groups.length);

    res.json({
      success: true,
      groups: groups,
      count: groups.length,
    });
  } catch (error) {
    console.error("Get user groups error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch your groups. Please try again.",
    });
  }
});
// Join study group (now creates join request)
app.post("/api/groups/:group_id/join", authenticateToken, async (req, res) => {
  try {
    const { group_id } = req.params;
    const { message } = req.body;

    const result = await mongoOperations.joinStudyGroup(
      req.user.userId,
      group_id,
      message || ""
    );

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("Join group error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to join study group",
    });
  }
});

// Alternative join route (legacy support)
app.post("/api/groups/join/:group_id", authenticateToken, async (req, res) => {
  try {
    const { group_id } = req.params;

    const result = await mongoOperations.joinStudyGroup(
      req.user.userId,
      group_id
    );

    res.json({
      success: true,
      message: result.message,
      group: result.group,
    });
  } catch (error) {
    console.error("Join group error:", error);

    if (error.message.includes("already a member")) {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message.includes("not found")) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to join study group. Please try again.",
    });
  }
});

// Get group details
app.get("/api/groups/:group_id", authenticateToken, async (req, res) => {
  try {
    const { group_id } = req.params;
    const group = await mongoOperations.getCompleteGroupDetails(
      group_id,
      req.user.userId
    );

    res.json({
      success: true,
      group: group,
    });
  } catch (error) {
    console.error("Get group details error:", error);

    if (
      error.message.includes("not found") ||
      error.message.includes("not available")
    ) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message.includes("not a member")) {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to get group details",
    });
  }
});

// ========== JOIN REQUEST ROUTES ==========

// Get join requests for group (group admin only)
app.get(
  "/api/groups/:group_id/join-requests",
  authenticateToken,
  async (req, res) => {
    try {
      const { group_id } = req.params;
      const joinRequests = await mongoOperations.getGroupJoinRequests(
        group_id,
        req.user.userId
      );

      res.json({
        success: true,
        join_requests: joinRequests,
      });
    } catch (error) {
      console.error("Get join requests error:", error);

      if (error.message.includes("must be an admin")) {
        return res.status(403).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to get join requests",
      });
    }
  }
);

// Approve join request (group admin only)
app.post(
  "/api/groups/join-requests/:request_id/approve",
  authenticateToken,
  async (req, res) => {
    try {
      const { request_id } = req.params;
      const result = await mongoOperations.approveJoinRequest(
        request_id,
        req.user.userId
      );

      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      console.error("Approve join request error:", error);

      if (error.message.includes("must be an admin")) {
        return res.status(403).json({
          success: false,
          message: error.message,
        });
      }

      if (error.message.includes("not found")) {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to approve join request",
      });
    }
  }
);

// Reject join request (group admin only)
app.post(
  "/api/groups/join-requests/:request_id/reject",
  authenticateToken,
  async (req, res) => {
    try {
      const { request_id } = req.params;
      const { rejection_reason } = req.body;

      const result = await mongoOperations.rejectJoinRequest(
        request_id,
        req.user.userId,
        rejection_reason
      );

      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      console.error("Reject join request error:", error);

      if (error.message.includes("must be an admin")) {
        return res.status(403).json({
          success: false,
          message: error.message,
        });
      }

      if (error.message.includes("not found")) {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to reject join request",
      });
    }
  }
);

// Get user's join request status for a group
app.get(
  "/api/groups/:group_id/join-status",
  authenticateToken,
  async (req, res) => {
    try {
      const { group_id } = req.params;
      const joinRequest = await mongoOperations.getUserJoinRequestStatus(
        req.user.userId,
        group_id
      );

      res.json({
        success: true,
        join_request: joinRequest,
      });
    } catch (error) {
      console.error("Get join status error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get join request status",
      });
    }
  }
);
// ========== INVITATION ROUTES ==========

// Send group invitation (admin only, active groups only)
app.post(
  "/api/groups/:group_id/invite",
  authenticateToken,
  async (req, res) => {
    try {
      const { group_id } = req.params;
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
        });
      }

      const result = await mongoOperations.sendGroupInvitation(
        group_id,
        email,
        req.user.userId
      );

      res.json({
        success: true,
        message: result.message,
        invitation_token: result.invitation_token,
      });
    } catch (error) {
      console.error("Send invitation error:", error);

      if (error.message.includes("Only group admins")) {
        return res.status(403).json({
          success: false,
          message: error.message,
        });
      }

      if (error.message.includes("already been sent")) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to send invitation",
      });
    }
  }
);

// Accept invitation
app.post(
  "/api/groups/invitations/:token/accept",
  authenticateToken,
  async (req, res) => {
    try {
      const { token } = req.params;
      const result = await mongoOperations.acceptInvitation(
        token,
        req.user.userId
      );

      res.json({
        success: true,
        message: result.message,
        group: result.group,
      });
    } catch (error) {
      console.error("Accept invitation error:", error);

      if (error.message.includes("Invalid or expired")) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      if (error.message.includes("already a member")) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to accept invitation",
      });
    }
  }
);

// Get group invitations (for group admin to see pending invitations)
app.get(
  "/api/groups/:group_id/invitations",
  authenticateToken,
  async (req, res) => {
    try {
      const { group_id } = req.params;

      // Verify user is admin of this group
      const groupDetails = await mongoOperations.getGroupDetails(group_id);
      const userMember = groupDetails.members.find(
        (m) => m.user_id === req.user.userId
      );

      if (!userMember || !userMember.is_admin) {
        return res.status(403).json({
          success: false,
          message: "You must be an admin of this group to view invitations",
        });
      }

      const invitations = await mongoOperations.getGroupInvitations(group_id);

      res.json({
        success: true,
        invitations: invitations,
      });
    } catch (error) {
      console.error("Get group invitations error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get group invitations",
      });
    }
  }
);
// ========== GROUP MANAGEMENT ROUTES ==========

// Generate meeting link (admin only, active groups only)
app.post(
  "/api/groups/:group_id/meeting-link",
  authenticateToken,
  async (req, res) => {
    try {
      const { group_id } = req.params;
      const result = await mongoOperations.generateMeetingLink(
        group_id,
        req.user.userId
      );

      res.json({
        success: true,
        meeting_link: result.meeting_link,
        created_at: result.created_at,
      });
    } catch (error) {
      console.error("Generate meeting link error:", error);

      if (error.message.includes("Only group admins")) {
        return res.status(403).json({
          success: false,
          message: error.message,
        });
      }

      if (error.message.includes("active groups")) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to generate meeting link. Please try again.",
      });
    }
  }
);

// Remove member from group (admin only)
app.delete(
  "/api/groups/:group_id/members/:member_id",
  authenticateToken,
  async (req, res) => {
    try {
      const { group_id, member_id } = req.params;
      const result = await mongoOperations.removeMemberFromGroup(
        group_id,
        req.user.userId,
        parseInt(member_id)
      );

      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      console.error("Remove member error:", error);

      if (
        error.message.includes("Only group admins") ||
        error.message.includes("cannot remove themselves")
      ) {
        return res.status(403).json({
          success: false,
          message: error.message,
        });
      }

      if (error.message.includes("not found")) {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to remove member. Please try again.",
      });
    }
  }
);
// ========== RESOURCES ROUTES ==========

// Add resource to group (active groups only)
app.post(
  "/api/groups/:group_id/resources",
  authenticateToken,
  async (req, res) => {
    try {
      const { group_id } = req.params;
      const { type, title, url, description } = req.body;

      // Validation
      if (!type || !title || !url) {
        return res.status(400).json({
          success: false,
          message: "Type, title, and URL are required",
        });
      }

      if (!["video", "article", "document", "link", "book"].includes(type)) {
        return res.status(400).json({
          success: false,
          message: "Invalid resource type",
        });
      }

      const result = await mongoOperations.addGroupResource(
        group_id,
        req.user.userId,
        { type, title, url, description }
      );

      res.json({
        success: true,
        message: "Resource added successfully",
        resource: result.resource,
      });
    } catch (error) {
      console.error("Add resource error:", error);

      if (error.message.includes("Only group members")) {
        return res.status(403).json({
          success: false,
          message: error.message,
        });
      }

      if (error.message.includes("active groups")) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to add resource. Please try again.",
      });
    }
  }
);

// Remove resource from group
app.delete(
  "/api/groups/:group_id/resources/:resource_id",
  authenticateToken,
  async (req, res) => {
    try {
      const { group_id, resource_id } = req.params;
      const result = await mongoOperations.removeGroupResource(
        group_id,
        req.user.userId,
        resource_id
      );

      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      console.error("Remove resource error:", error);

      if (error.message.includes("only remove resources")) {
        return res.status(403).json({
          success: false,
          message: error.message,
        });
      }

      if (error.message.includes("not found")) {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to remove resource. Please try again.",
      });
    }
  }
);
// ========== DISCUSSION ROUTES ==========

// Get group discussion (active groups only)
app.get(
  "/api/groups/:group_id/discussions",
  authenticateToken,
  async (req, res) => {
    try {
      const { group_id } = req.params;
      const discussion = await mongoOperations.getGroupDiscussion(
        group_id,
        req.user.userId
      );

      res.json({
        success: true,
        discussion: discussion,
      });
    } catch (error) {
      console.error("Get discussion error:", error);

      if (error.message.includes("must be a member")) {
        return res.status(403).json({
          success: false,
          message: error.message,
        });
      }

      if (error.message.includes("not available")) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to get group discussion",
      });
    }
  }
);

// Add message to group discussion
app.post(
  "/api/groups/:group_id/discussions/messages",
  authenticateToken,
  async (req, res) => {
    try {
      const { group_id } = req.params;
      const { message } = req.body;

      if (!message || !message.trim()) {
        return res.status(400).json({
          success: false,
          message: "Message content is required",
        });
      }

      const result = await mongoOperations.addDiscussionMessage(
        group_id,
        req.user.userId,
        message
      );

      res.json({
        success: true,
        message: "Message posted successfully",
        new_message: result.message,
      });
    } catch (error) {
      console.error("Add discussion message error:", error);

      if (error.message.includes("must be a member")) {
        return res.status(403).json({
          success: false,
          message: error.message,
        });
      }

      if (error.message.includes("inactive groups")) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to post message. Please try again.",
      });
    }
  }
);
// ========== NOTES ROUTES ==========

// Get user's personal notes for a group
app.get("/api/groups/:group_id/notes", authenticateToken, async (req, res) => {
  try {
    const { group_id } = req.params;
    const notes = await mongoOperations.getUserGroupNotes(
      req.user.userId,
      group_id
    );

    res.json({
      success: true,
      notes: notes,
    });
  } catch (error) {
    console.error("Get notes error:", error);

    if (error.message.includes("must be a member")) {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to get notes",
    });
  }
});

// Update user's personal notes for a group
app.put("/api/groups/:group_id/notes", authenticateToken, async (req, res) => {
  try {
    const { group_id } = req.params;
    const { notes } = req.body;

    const result = await mongoOperations.updateUserGroupNotes(
      req.user.userId,
      group_id,
      notes || ""
    );

    res.json({
      success: true,
      message: "Notes updated successfully",
      notes: result.notes,
    });
  } catch (error) {
    console.error("Update notes error:", error);

    if (error.message.includes("must be a member")) {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to update notes. Please try again.",
    });
  }
});
// ========== UTILITY ROUTES ==========

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
    version: "2.0.0",
    environment: process.env.NODE_ENV || "development",
  });
});

// Get server statistics (protected route)
app.get("/api/stats", authenticateToken, async (req, res) => {
  try {
    const [totalUsers, totalGroups, pendingGroups] = await Promise.all([
      dbOperations.getAllUsers().then((users) => users.length),
      mongoOperations
        .getAllStudyGroups(req.user.userId)
        .then((groups) => groups.length),
      mongoOperations.getPendingGroupApprovalsCount(),
    ]);

    res.json({
      success: true,
      stats: {
        total_users: totalUsers,
        total_groups: totalGroups,
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

const path = require("path");

// Serve static files from React build directory
if (process.env.NODE_ENV === "production") {
  // Serve static files from the React app build directory
  app.use(express.static(path.join(__dirname, "../build")));

  // Catch-all handler: send back React's index.html for any non-API routes
  app.get("/{*any}", (req, res) => {
    // Only serve index.html for non-API routes
    if (!req.path.startsWith("/api/")) {
      res.sendFile(path.join(__dirname, "../build/index.html"));
    } else {
      // This should not happen if API routes are properly defined above
      res.status(404).json({
        success: false,
        message: `API route ${req.method} ${req.originalUrl} not found`,
      });
    }
  });
} else {
  // Development mode - just serve a simple message for non-API routes
  app.get("/{*any}", (req, res) => {
    if (!req.path.startsWith("/api/")) {
      res.json({
        message: "Development mode - React dev server should handle this route",
        path: req.path,
      });
    } else {
      res.status(404).json({
        success: false,
        message: `API route ${req.method} ${req.originalUrl} not found`,
      });
    }
  });
}

app.use("/api", (req, res, next) => {
  console.log(`🔍 API Request: ${req.method} ${req.originalUrl}`);
  console.log(`🔍 Headers:`, {
    "content-type": req.headers["content-type"],
    authorization: req.headers["authorization"] ? "Bearer [TOKEN]" : "None",
  });
  console.log(`🔍 Body:`, req.body);
  next();
});

// Add debugging specifically for admin routes
app.use("/api/admin", (req, res, next) => {
  console.log(`🔍 ADMIN Route Hit: ${req.method} ${req.originalUrl}`);
  console.log(`🔍 User from JWT:`, req.user);
  next();
});

// Test route to verify server is working
app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "Server is working correctly",
    timestamp: new Date().toISOString(),
    routes_working: true,
  });
});

// Specific debugging for the problematic routes
app.get("/api/admin/debug", authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: "Admin debug route working",
    user: req.user,
    timestamp: new Date().toISOString(),
  });
});

// ========== ERROR HANDLING MIDDLEWARE ==========

// 2. REPLACE that entire section with this:
app.use((req, res, next) => {
  // Only handle API routes with 404, let React handle everything else
  if (req.path.startsWith("/api/")) {
    console.log(`❌ 404 - API route not found: ${req.method} ${req.path}`);
    res.status(404).json({
      success: false,
      message: `Route ${req.method} ${req.originalUrl} not found`,
      available_routes: {
        auth: [
          "POST /api/auth/signup",
          "POST /api/auth/signin",
          "GET /api/auth/profile",
          "POST /api/auth/verify",
          "POST /api/auth/check-email",
        ],
        groups: [
          "POST /api/groups/create",
          "GET /api/groups",
          "GET /api/groups/my-groups",
          "GET /api/findGroups",
          "GET /api/my-groups",
          "POST /api/groups/:id/join",
          "GET /api/groups/:id",
        ],
        admin: [
          "GET /api/admin/groups",
          "GET /api/admin/users",
          "POST /api/admin/groups/:id/approve",
          "POST /api/admin/groups/:id/reject",
          "DELETE /api/admin/groups/:id",
          "POST /api/admin/users/:id/promote",
        ],
        utility: ["GET /api/health", "GET /api/stats"],
      },
    });
  } else {
    // For non-API routes, don't send 404 - let React Router handle them
    next();
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Global error:", err);

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: "Validation Error",
      errors: errors,
    });
  }

  // JWT error
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }

  // MongoDB duplicate key error
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: "Duplicate entry found",
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// ========== GRACEFUL SHUTDOWN ==========

// Handle graceful shutdown
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
  console.log(`📊 Databases:`);
  console.log(`   SQLite: studybuddy.db (Authentication)`);
  console.log(`   MongoDB: studybuddy (Study Groups)`);
  console.log(`🔐 JWT Secret: ${JWT_SECRET.substring(0, 10)}...`);
  console.log(`📝 API Endpoints:`);
  console.log(`   ✅ Auth Routes:`);
  console.log(`     POST /api/auth/signup`);
  console.log(`     POST /api/auth/signin`);
  console.log(`     GET  /api/auth/profile (protected)`);
  console.log(`     POST /api/auth/verify (protected)`);
  console.log(`     POST /api/auth/check-email (protected)`);
  console.log(`   ✅ Study Group Routes:`);
  console.log(`     POST /api/groups/create (protected)`);
  console.log(`     GET  /api/groups (protected)`);
  console.log(`     GET  /api/groups/my-groups (protected) - FIXED ✅`);
  console.log(`     GET  /api/findGroups (protected)`);
  console.log(`     GET  /api/my-groups (protected) - Legacy Support`);
  console.log(`     POST /api/groups/:group_id/join (protected)`);
  console.log(`     POST /api/groups/join/:group_id (protected) - Legacy`);
  console.log(`     GET  /api/groups/:group_id (protected)`);
  console.log(`   ✅ Join Request Routes:`);
  console.log(`     GET  /api/groups/:group_id/join-requests (protected)`);
  console.log(`     POST /api/groups/join-requests/:id/approve (protected)`);
  console.log(`     POST /api/groups/join-requests/:id/reject (protected)`);
  console.log(`     GET  /api/groups/:group_id/join-status (protected)`);
  console.log(`   ✅ Super Admin Routes:`);
  console.log(`     GET  /api/admin/groups (protected, super admin)`);
  console.log(
    `     POST /api/admin/groups/:group_id/approve (protected, super admin)`
  );
  console.log(
    `     POST /api/admin/groups/:group_id/reject (protected, super admin)`
  );
  console.log(
    `     DELETE /api/admin/groups/:group_id (protected, super admin)`
  );
  console.log(`     GET  /api/admin/users (protected, super admin)`);
  console.log(
    `     POST /api/admin/users/:user_id/promote (protected, super admin)`
  );
  console.log(`   ✅ Group Management Routes:`);
  console.log(`     POST /api/groups/:group_id/meeting-link (protected)`);
  console.log(
    `     DELETE /api/groups/:group_id/members/:member_id (protected)`
  );
  console.log(`     POST /api/groups/:group_id/invite (protected)`);
  console.log(`     POST /api/groups/invitations/:token/accept (protected)`);
  console.log(`     GET  /api/groups/:group_id/invitations (protected)`);
  console.log(`   ✅ Resources & Discussion:`);
  console.log(`     POST /api/groups/:group_id/resources (protected)`);
  console.log(
    `     DELETE /api/groups/:group_id/resources/:resource_id (protected)`
  );
  console.log(`     GET  /api/groups/:group_id/discussions (protected)`);
  console.log(
    `     POST /api/groups/:group_id/discussions/messages (protected)`
  );
  console.log(`     GET  /api/groups/:group_id/notes (protected)`);
  console.log(`     PUT  /api/groups/:group_id/notes (protected)`);
  console.log(`   ✅ Utility Routes:`);
  console.log(`     GET  /api/health`);
  console.log(`     GET  /api/stats (protected)`);
  console.log(`\n🎯 Issues Fixed:`);
  console.log(`   ✅ Route /api/groups/my-groups now working properly`);
  console.log(`   ✅ Legacy route /api/my-groups maintained for compatibility`);
  console.log(`   ✅ Super admin dashboard shows pending groups`);
  console.log(`   ✅ User dashboard shows group approval status`);
  console.log(`   ✅ Complete error handling and validation`);
  console.log(`   ✅ Filtering support for FindGroups component`);
  console.log(`   ✅ Enhanced logging for debugging`);
  console.log(`   ✅ Graceful shutdown handling`);
  console.log(`\n🌟 Ready to handle StudyBuddy requests!`);
});

module.exports = { app, server };

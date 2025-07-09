const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const { dbOperations } = require("./database");
const { connectMongoDB, mongoOperations } = require("./mongodb");
const { emailService, generateInvitationToken } = require("./emailService");

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET =
  process.env.JWT_SECRET || "your-super-secret-key-change-this-in-production";

// Initialize MongoDB connection
connectMongoDB();

// Verify email service on startup
emailService.verifyEmailConfig();

// Middleware
app.use(cors());
app.use(express.json());

// Protected route middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

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
// Get group details
app.get("/api/groups/:group_id", authenticateToken, async (req, res) => {
  try {
    const { group_id } = req.params;
    const groupDetails = await mongoOperations.getGroupDetails(group_id);

    res.json({
      success: true,
      group: groupDetails,
    });
  } catch (error) {
    console.error("Get group details error:", error);

    if (error.message.includes("not found")) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to fetch group details. Please try again.",
    });
  }
});

// ========== GROUP DETAIL ROUTES ==========

// Get complete group details (for group detail page)
app.get(
  "/api/groups/:group_id/details",
  authenticateToken,
  async (req, res) => {
    try {
      const { group_id } = req.params;
      const groupDetails = await mongoOperations.getCompleteGroupDetails(
        group_id,
        req.user.userId
      );

      res.json({
        success: true,
        group: groupDetails,
      });
    } catch (error) {
      console.error("Get complete group details error:", error);

      if (
        error.message.includes("not found") ||
        error.message.includes("not a member")
      ) {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to fetch group details. Please try again.",
      });
    }
  }
);

// Generate meeting link (admin only)
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

// Add resource to group
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

      if (!["file", "link"].includes(type)) {
        return res.status(400).json({
          success: false,
          message: 'Type must be either "file" or "link"',
        });
      }

      const result = await mongoOperations.addGroupResource(
        group_id,
        req.user.userId,
        {
          type,
          title,
          url,
          description,
        }
      );

      res.status(201).json({
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

      if (
        error.message.includes("can only remove your own") ||
        error.message.includes("be an admin")
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
        message: "Failed to remove resource. Please try again.",
      });
    }
  }
);

// ========== DISCUSSIONS ROUTES ==========

// Get group discussion
app.get(
  "/api/groups/:group_id/discussion",
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

      if (error.message.includes("Only group members")) {
        return res.status(403).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to get discussion. Please try again.",
      });
    }
  }
);

// Add message to group discussion
app.post(
  "/api/groups/:group_id/discussion/messages",
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

      if (message.trim().length > 1000) {
        return res.status(400).json({
          success: false,
          message: "Message must be less than 1000 characters",
        });
      }

      const result = await mongoOperations.addDiscussionMessage(
        group_id,
        req.user.userId,
        message
      );

      res.status(201).json({
        success: true,
        message: "Message posted successfully",
        messageData: result.message,
      });
    } catch (error) {
      console.error("Add message error:", error);

      if (error.message.includes("Only group members")) {
        return res.status(403).json({
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

// Get user's notes for a group
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

    if (error.message.includes("Only group members")) {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to get notes. Please try again.",
    });
  }
});

// Update user's notes for a group
app.put("/api/groups/:group_id/notes", authenticateToken, async (req, res) => {
  try {
    const { group_id } = req.params;
    const { notes } = req.body;

    if (typeof notes !== "string") {
      return res.status(400).json({
        success: false,
        message: "Notes must be a string",
      });
    }

    if (notes.length > 10000) {
      return res.status(400).json({
        success: false,
        message: "Notes must be less than 10,000 characters",
      });
    }

    const result = await mongoOperations.updateUserGroupNotes(
      req.user.userId,
      group_id,
      notes
    );

    res.json({
      success: true,
      message: "Notes updated successfully",
      notes: result.notes,
    });
  } catch (error) {
    console.error("Update notes error:", error);

    if (error.message.includes("Only group members")) {
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

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    message: "StudyBuddy API is running!",
    timestamp: new Date().toISOString(),
    databases: {
      sqlite: "Connected (Authentication)",
      mongodb: "Connected (Study Groups)",
    },
  });
});

// Sign Up Route
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;

    // Validation
    if (!email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

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

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    // Create user
    const result = await dbOperations.createUser(email, password);

    // Generate JWT token
    const token = jwt.sign(
      { userId: result.user_id, email: result.email },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      user: {
        user_id: result.user_id,
        email: result.email,
      },
      token,
    });
  } catch (error) {
    console.error("Signup error:", error);

    if (error.code === "EMAIL_EXISTS") {
      return res.status(409).json({
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
      { userId: result.user_id, email: result.email },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      success: true,
      message: `Welcome back! Successfully signed in as ${result.email}`,
      user: {
        user_id: result.user_id,
        email: result.email,
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
    },
  });
});

// ========== STUDY GROUP ROUTES (MongoDB) ==========

// Create Study Group with Invitations
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

    const groupData = { name, concept, level, time_commitment };
    const result = await mongoOperations.createStudyGroup(
      groupData,
      req.user.userId,
      member_emails
    );

    // Process member invitations
    const invitationResults = [];
    const creator = await dbOperations.getUserById(req.user.userId);

    for (const email of member_emails) {
      try {
        // Check if user exists in our system
        const existingUsers = await dbOperations.getAllUsers();
        const existingUser = existingUsers.find(
          (u) => u.email.toLowerCase() === email.toLowerCase()
        );

        if (existingUser) {
          // User exists - add directly to group
          try {
            await mongoOperations.joinStudyGroup(
              existingUser.user_id,
              result.group_id
            );
            invitationResults.push({
              email: email,
              status: "added",
              message: "User added to group directly",
            });
          } catch (joinError) {
            if (joinError.message.includes("already a member")) {
              invitationResults.push({
                email: email,
                status: "already_member",
                message: "User is already a member",
              });
            } else {
              throw joinError;
            }
          }
        } else {
          // User doesn't exist - send invitation
          const invitationToken = generateInvitationToken();

          // Create invitation record
          await mongoOperations.createInvitation(
            result.group_id,
            email,
            req.user.userId,
            invitationToken
          );

          // Send invitation email
          const emailResult = await emailService.sendGroupInvitation(
            { email: creator.email, name: creator.email },
            result.group,
            email,
            invitationToken
          );

          invitationResults.push({
            email: email,
            status: "invited",
            message: "Invitation sent",
            messageId: emailResult.messageId,
          });
        }
      } catch (inviteError) {
        console.error(`Error processing invitation for ${email}:`, inviteError);
        invitationResults.push({
          email: email,
          status: "error",
          message: inviteError.message || "Failed to process invitation",
        });
      }
    }

    res.status(201).json({
      success: true,
      message: "Study group created successfully",
      group: result.group,
      group_id: result.group_id,
      invitations: invitationResults,
    });
  } catch (error) {
    console.error("Create group error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create study group. Please try again.",
    });
  }
});

// Get all study groups with optional filters
app.get("/api/findGroups", authenticateToken, async (req, res) => {
  try {
    const { level, time_commitment, concept } = req.query;

    const filters = {};
    if (level) filters.level = level;
    if (time_commitment) filters.time_commitment = time_commitment;
    if (concept) filters.concept = concept;

    const groups = await mongoOperations.getStudyGroups(filters);

    res.json({
      success: true,
      groups: groups,
      count: groups.length,
      filters_applied: filters,
    });
  } catch (error) {
    console.error("Find groups error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch study groups. Please try again.",
    });
  }
});

// Get user's joined groups (for home page history)
app.get("/api/my-groups", authenticateToken, async (req, res) => {
  try {
    const groups = await mongoOperations.getUserGroups(req.user.userId);
    console.log("groups groups:", groups);
    console.log("groups for USER:", req.user.userId);
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

// Join a study group
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
    const groupDetails = await mongoOperations.getGroupDetails(group_id);

    res.json({
      success: true,
      group: groupDetails,
    });
  } catch (error) {
    console.error("Get group details error:", error);

    if (error.message.includes("not found")) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to fetch group details. Please try again.",
    });
  }
});

// Accept invitation route
app.post("/api/invitations/accept", authenticateToken, async (req, res) => {
  try {
    const { invitation_token } = req.body;

    if (!invitation_token) {
      return res.status(400).json({
        success: false,
        message: "Invitation token is required",
      });
    }

    const result = await mongoOperations.acceptInvitation(
      invitation_token,
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
      return res.status(404).json({
        success: false,
        message: "Invalid or expired invitation",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to accept invitation. Please try again.",
    });
  }
});

// Get invitation details (for invitation preview)
app.get("/api/invitations/:token", async (req, res) => {
  try {
    const { token } = req.params;

    const invitation = await mongoOperations.getInvitationByToken(token);

    // Get group details
    const group = await mongoOperations.getGroupDetails(invitation.group_id);

    // Get inviter details
    const inviter = await dbOperations.getUserById(invitation.invited_by);

    res.json({
      success: true,
      invitation: {
        group_id: invitation.group_id,
        invited_email: invitation.invited_email,
        sent_at: invitation.sent_at,
        expires_at: invitation.expires_at,
      },
      group: {
        name: group.name,
        concept: group.concept,
        level: group.level,
        time_commitment: group.time_commitment,
        member_count: group.member_count,
      },
      inviter: {
        email: inviter.email,
      },
    });
  } catch (error) {
    console.error("Get invitation error:", error);

    if (error.message.includes("Invalid or expired")) {
      return res.status(404).json({
        success: false,
        message: "Invalid or expired invitation",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to get invitation details",
    });
  }
});

// Check if email exists in system (for frontend to show appropriate status)
app.post("/api/users/check-email", authenticateToken, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const users = await dbOperations.getAllUsers();
    const userExists = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );

    res.json({
      success: true,
      exists: !!userExists,
      user: userExists
        ? { user_id: userExists.user_id, email: userExists.email }
        : null,
    });
  } catch (error) {
    console.error("Check email error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check email",
    });
  }
});

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

// Test email route (for development)
app.post("/api/test-email", authenticateToken, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const result = await emailService.sendTestEmail(email);

    res.json({
      success: true,
      message: "Test email sent successfully",
      messageId: result.messageId,
    });
  } catch (error) {
    console.error("Test email error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send test email: " + error.message,
    });
  }
});

// Get all users (admin route)
app.get("/api/admin/users", authenticateToken, async (req, res) => {
  try {
    const users = await dbOperations.getAllUsers();
    res.json({
      success: true,
      users: users,
      count: users.length,
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Something went wrong!",
  });
});

// 404 handler
app.all("/{*any}", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 StudyBuddy API server running on http://localhost:${PORT}`);
  console.log(`📊 Databases:`);
  console.log(`   SQLite: studybuddy.db (Authentication)`);
  console.log(`   MongoDB: studybuddy (Study Groups)`);
  console.log(`🔐 JWT Secret: ${JWT_SECRET.substring(0, 10)}...`);
  console.log(`📝 API Endpoints:`);
  console.log(`   Auth Routes:`);
  console.log(`     POST /api/auth/signup`);
  console.log(`     POST /api/auth/signin`);
  console.log(`     GET  /api/auth/profile (protected)`);
  console.log(`     POST /api/auth/verify (protected)`);
  console.log(`   Study Group Routes:`);
  console.log(`     POST /api/groups/create (protected)`);
  console.log(`     GET  /api/findGroups (protected)`);
  console.log(`     GET  /api/my-groups (protected)`);
  console.log(`     POST /api/groups/join/:group_id (protected)`);
  console.log(`     GET  /api/groups/:group_id (protected)`);
});

module.exports = app;

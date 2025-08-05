const mongoose = require("mongoose");
require("dotenv").config();

const connectMongoDB = async () => {
  try {
    // Using MongoDB Atlas connection string
    const mongoURI = process.env.MONGODB_URI;
    console.log("mongoURI", mongoURI);
    await mongoose.connect(mongoURI);
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

// Group Data Schema with approval status
const groupDataSchema = new mongoose.Schema({
  group_id: {
    type: String,
    unique: true,
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  concept: {
    type: String,
    required: true,
    trim: true,
  },
  level: {
    type: String,
    required: true,
    enum: ["beginner", "intermediate", "advanced"],
  },
  time_commitment: {
    type: String,
    required: true,
    enum: ["10hrs/wk", "15hrs/wk", "20hrs/wk"],
  },
  created_by: {
    type: Number, // user_id from SQL table
    required: true,
  },
  status: {
    type: String,
    default: "pending_approval", // New groups need super admin approval
    enum: ["pending_approval", "active", "rejected", "archived"],
  },
  approval_status: {
    approved_by: {
      type: Number, // super admin user_id
      default: null,
    },
    approved_at: {
      type: Date,
      default: null,
    },
    rejection_reason: {
      type: String,
      default: null,
    },
    rejected_at: {
      type: Date,
      default: null,
    },
  },
  overview: {
    meeting_link: {
      type: String,
      default: null,
    },
    meeting_link_created_at: {
      type: Date,
      default: null,
    },
  },
  resources: [
    {
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        default: () => new mongoose.Types.ObjectId(),
      },
      type: {
        type: String,
        required: true,
        enum: ["video", "article", "document", "link", "book"],
      },
      title: {
        type: String,
        required: true,
        trim: true,
      },
      url: {
        type: String,
        required: true,
      },
      description: {
        type: String,
        default: "",
      },
      uploaded_by: {
        type: Number, // user_id
        required: true,
      },
      uploaded_by_name: {
        type: String, // Cache user name for performance
        required: true,
      },
      uploaded_at: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  discussion_id: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

// Group Members Schema with join request status
const groupMemberSchema = new mongoose.Schema({
  user_id: {
    type: Number, // from SQL table
    required: true,
  },
  group_id: {
    type: String,
    required: true,
  },
  is_admin: {
    type: Boolean,
    default: false,
  },
  joined_at: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    default: "active",
    enum: ["active", "left", "removed", "pending_approval"], // Added pending approval for join requests
  },
  join_request: {
    requested_at: {
      type: Date,
      default: null,
    },
    approved_by: {
      type: Number, // group admin user_id
      default: null,
    },
    approved_at: {
      type: Date,
      default: null,
    },
    rejection_reason: {
      type: String,
      default: null,
    },
  },
});

// Group Join Requests Schema (separate collection for better management)
const groupJoinRequestSchema = new mongoose.Schema({
  user_id: {
    type: Number,
    required: true,
  },
  group_id: {
    type: String,
    required: true,
  },
  user_email: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    default: "pending",
    enum: ["pending", "approved", "rejected"],
  },
  message: {
    type: String,
    default: "",
    maxLength: 500,
  },
  requested_at: {
    type: Date,
    default: Date.now,
  },
  processed_by: {
    type: Number, // group admin user_id
    default: null,
  },
  processed_at: {
    type: Date,
    default: null,
  },
  rejection_reason: {
    type: String,
    default: null,
  },
});

// Group Discussions Schema
const groupDiscussionSchema = new mongoose.Schema({
  group_id: {
    type: String,
    required: true,
    unique: true,
  },
  messages: [
    {
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        default: () => new mongoose.Types.ObjectId(),
      },
      user_id: {
        type: Number, // from SQL table
        required: true,
      },
      user_name: {
        type: String, // Cache for performance
        required: true,
      },
      user_email: {
        type: String, // Cache for display
        required: true,
      },
      message: {
        type: String,
        required: true,
        trim: true,
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
      edited: {
        type: Boolean,
        default: false,
      },
      edited_at: {
        type: Date,
        default: null,
      },
    },
  ],
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

// User Group Notes Schema (Personal notes per group)
const userGroupNotesSchema = new mongoose.Schema({
  user_id: {
    type: Number, // from SQL table
    required: true,
  },
  group_id: {
    type: String,
    required: true,
  },
  notes: {
    type: String,
    default: "",
    maxLength: 10000, // Limit notes length
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

// Ensure unique combination of user_id and group_id for notes
userGroupNotesSchema.index({ user_id: 1, group_id: 1 }, { unique: true });

const groupInvitationSchema = new mongoose.Schema({
  group_id: {
    type: String,
    required: true,
  },
  invited_email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  invited_by: {
    type: Number, // user_id from SQL table
    required: true,
  },
  status: {
    type: String,
    default: "pending",
    enum: ["pending", "accepted", "declined", "expired"],
  },
  invitation_token: {
    type: String,
    required: true,
    unique: true,
  },
  sent_at: {
    type: Date,
    default: Date.now,
  },
  expires_at: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  },
  accepted_at: {
    type: Date,
  },
});

// User Profile Schema
const userProfileSchema = new mongoose.Schema({
  user_id: {
    type: Number, // from SQL table
    unique: true,
    required: true,
  },
  groups: [
    {
      type: String, // array of group_ids
    },
  ],
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

// Create indexes for better performance
groupMemberSchema.index({ user_id: 1, group_id: 1 }, { unique: true });
groupMemberSchema.index({ group_id: 1 });
groupDataSchema.index({ group_id: 1 });
groupDataSchema.index({ status: 1 }); // For filtering by approval status
groupJoinRequestSchema.index({ user_id: 1, group_id: 1 }, { unique: true });
groupJoinRequestSchema.index({ group_id: 1, status: 1 });
userProfileSchema.index({ user_id: 1 });
groupInvitationSchema.index({ invitation_token: 1 });
groupInvitationSchema.index({ invited_email: 1, group_id: 1 });
groupInvitationSchema.index({ expires_at: 1 }); // For cleanup of expired invitations
groupDiscussionSchema.index({ group_id: 1 });
userGroupNotesSchema.index({ user_id: 1, group_id: 1 });

// Create models
const GroupData = mongoose.model("GroupData", groupDataSchema);
const GroupMember = mongoose.model("GroupMember", groupMemberSchema);
const GroupJoinRequest = mongoose.model(
  "GroupJoinRequest",
  groupJoinRequestSchema
);
const UserProfile = mongoose.model("UserProfile", userProfileSchema);
const GroupInvitation = mongoose.model(
  "GroupInvitation",
  groupInvitationSchema
);
const GroupDiscussion = mongoose.model(
  "GroupDiscussion",
  groupDiscussionSchema
);
const UserGroupNotes = mongoose.model("UserGroupNotes", userGroupNotesSchema);

// MongoDB operations
const mongoOperations = {
  // Generate unique group ID
  generateGroupId: async () => {
    const count = await GroupData.countDocuments();
    return `G${String(count + 101).padStart(3, "0")}`; // G101, G102, etc.
  },

  // ========== SUPER ADMIN OPERATIONS ==========

  // Get all groups for super admin (including pending approval)
  getAllGroupsForSuperAdmin: async () => {
    const groups = await GroupData.find({}).sort({ created_at: -1 }).lean();

    // Get member counts and creator info for each group
    const groupsWithDetails = await Promise.all(
      groups.map(async (group) => {
        const memberCount = await GroupMember.countDocuments({
          group_id: group.group_id,
          status: "active",
        });

        // Get creator info
        const { dbOperations } = require("./database");
        let creatorInfo = null;
        try {
          creatorInfo = await dbOperations.getUserById(group.created_by);
        } catch (error) {
          creatorInfo = { email: "Unknown User" };
        }

        return {
          ...group,
          member_count: memberCount,
          creator_email: creatorInfo.email,
        };
      })
    );

    return groupsWithDetails;
  },

  // Approve group (super admin only)
  approveGroup: async (group_id, super_admin_id) => {
    const updatedGroup = await GroupData.findOneAndUpdate(
      { group_id, status: "pending_approval" },
      {
        $set: {
          status: "active",
          "approval_status.approved_by": super_admin_id,
          "approval_status.approved_at": new Date(),
        },
      },
      { new: true }
    );

    if (!updatedGroup) {
      throw new Error("Group not found or already processed");
    }

    return {
      success: true,
      message: "Group approved successfully",
      group: updatedGroup,
    };
  },

  // Reject group (super admin only)
  rejectGroup: async (group_id, super_admin_id, rejection_reason) => {
    const updatedGroup = await GroupData.findOneAndUpdate(
      { group_id, status: "pending_approval" },
      {
        $set: {
          status: "rejected",
          "approval_status.rejected_at": new Date(),
          "approval_status.rejection_reason":
            rejection_reason || "No reason provided",
        },
      },
      { new: true }
    );

    if (!updatedGroup) {
      throw new Error("Group not found or already processed");
    }

    return {
      success: true,
      message: "Group rejected successfully",
      group: updatedGroup,
    };
  },

  // Delete group (super admin only)
  deleteGroupBySuperAdmin: async (group_id, super_admin_id) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Check if group exists
      const group = await GroupData.findOne({ group_id });
      if (!group) {
        throw new Error("Group not found");
      }

      // Delete group data
      await GroupData.deleteOne({ group_id }, { session });

      // Delete all members
      await GroupMember.deleteMany({ group_id }, { session });

      // Delete discussion
      await GroupDiscussion.deleteOne({ group_id }, { session });

      // Delete user notes
      await UserGroupNotes.deleteMany({ group_id }, { session });

      // Delete invitations
      await GroupInvitation.deleteMany({ group_id }, { session });

      // Delete join requests
      await GroupJoinRequest.deleteMany({ group_id }, { session });

      // Update user profiles (remove group from arrays)
      await UserProfile.updateMany(
        { groups: group_id },
        { $pull: { groups: group_id } },
        { session }
      );

      await session.commitTransaction();

      return {
        success: true,
        message: "Group deleted successfully",
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  },

  // Get pending group approvals count
  getPendingGroupApprovalsCount: async () => {
    return await GroupData.countDocuments({ status: "pending_approval" });
  },

  // ========== GROUP JOIN REQUEST OPERATIONS ==========

  // Submit join request
  submitJoinRequest: async (user_id, group_id, message = "") => {
    // Check if group exists and is active
    const group = await GroupData.findOne({ group_id, status: "active" });
    if (!group) {
      throw new Error("Study group not found or not available");
    }

    // Check if user is already a member
    const existingMember = await GroupMember.findOne({
      user_id,
      group_id,
      status: "active",
    });

    if (existingMember) {
      throw new Error("You are already a member of this group");
    }

    // Check if there's already a pending request
    const existingRequest = await GroupJoinRequest.findOne({
      user_id,
      group_id,
      status: "pending",
    });

    if (existingRequest) {
      throw new Error("You already have a pending join request for this group");
    }

    // Get user info
    const { dbOperations } = require("./database");
    const user = await dbOperations.getUserById(user_id);

    // Create join request
    const joinRequest = new GroupJoinRequest({
      user_id,
      group_id,
      user_email: user.email,
      message: message.trim(),
    });

    await joinRequest.save();

    return {
      success: true,
      message:
        "Join request submitted successfully. The group admin will review your request.",
      request: joinRequest,
    };
  },

  // Get join requests for group (group admin only)
  getGroupJoinRequests: async (group_id, admin_user_id) => {
    // Verify user is admin of this group
    const adminMember = await GroupMember.findOne({
      group_id,
      user_id: admin_user_id,
      is_admin: true,
      status: "active",
    });

    if (!adminMember) {
      throw new Error(
        "You must be an admin of this group to view join requests"
      );
    }

    const joinRequests = await GroupJoinRequest.find({
      group_id,
      status: "pending",
    }).sort({ requested_at: 1 }); // Oldest first

    return joinRequests;
  },

  // Approve join request (group admin only)
  approveJoinRequest: async (request_id, admin_user_id) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Get the join request
      const joinRequest = await GroupJoinRequest.findById(request_id);
      if (!joinRequest || joinRequest.status !== "pending") {
        throw new Error("Join request not found or already processed");
      }

      // Verify user is admin of this group
      const adminMember = await GroupMember.findOne({
        group_id: joinRequest.group_id,
        user_id: admin_user_id,
        is_admin: true,
        status: "active",
      });

      if (!adminMember) {
        throw new Error(
          "You must be an admin of this group to approve join requests"
        );
      }

      // Check if user is already a member (race condition protection)
      const existingMember = await GroupMember.findOne({
        user_id: joinRequest.user_id,
        group_id: joinRequest.group_id,
        status: "active",
      });

      if (existingMember) {
        // Update request status anyway
        joinRequest.status = "approved";
        joinRequest.processed_by = admin_user_id;
        joinRequest.processed_at = new Date();
        await joinRequest.save({ session });

        await session.commitTransaction();
        return {
          success: true,
          message: "User is already a member of this group",
        };
      }

      // Add user as member
      const newMember = new GroupMember({
        user_id: joinRequest.user_id,
        group_id: joinRequest.group_id,
        is_admin: false,
      });

      await newMember.save({ session });

      // Update user profile
      await mongoOperations.updateUserProfile(
        joinRequest.user_id,
        joinRequest.group_id,
        session
      );

      // Update join request status
      joinRequest.status = "approved";
      joinRequest.processed_by = admin_user_id;
      joinRequest.processed_at = new Date();
      await joinRequest.save({ session });

      await session.commitTransaction();

      return {
        success: true,
        message: "Join request approved successfully",
        new_member: newMember,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  },

  // Reject join request (group admin only)
  rejectJoinRequest: async (
    request_id,
    admin_user_id,
    rejection_reason = ""
  ) => {
    // Get the join request
    const joinRequest = await GroupJoinRequest.findById(request_id);
    if (!joinRequest || joinRequest.status !== "pending") {
      throw new Error("Join request not found or already processed");
    }

    // Verify user is admin of this group
    const adminMember = await GroupMember.findOne({
      group_id: joinRequest.group_id,
      user_id: admin_user_id,
      is_admin: true,
      status: "active",
    });

    if (!adminMember) {
      throw new Error(
        "You must be an admin of this group to reject join requests"
      );
    }

    // Update join request status
    joinRequest.status = "rejected";
    joinRequest.processed_by = admin_user_id;
    joinRequest.processed_at = new Date();
    joinRequest.rejection_reason = rejection_reason || "No reason provided";
    await joinRequest.save();

    return {
      success: true,
      message: "Join request rejected successfully",
    };
  },

  // Get user's join request status for a group
  getUserJoinRequestStatus: async (user_id, group_id) => {
    const joinRequest = await GroupJoinRequest.findOne({
      user_id,
      group_id,
    }).sort({ requested_at: -1 }); // Get latest request

    return joinRequest;
  },

  // ========== EXISTING OPERATIONS (MODIFIED) ==========

  // Create study group (now requires approval)
  createStudyGroup: async (groupData, creatorUserId, memberEmails = []) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Generate group ID
      const group_id = await mongoOperations.generateGroupId();

      // Generate meeting link automatically for admin
      const meetCode =
        Math.random().toString(36).substring(2, 5) +
        "-" +
        Math.random().toString(36).substring(2, 6) +
        "-" +
        Math.random().toString(36).substring(2, 5);

      const meetingLink = `https://meet.google.com/${meetCode}`;

      // Create group with pending approval status
      const newGroup = new GroupData({
        group_id,
        name: groupData.name,
        concept: groupData.concept,
        level: groupData.level,
        time_commitment: groupData.time_commitment,
        created_by: creatorUserId,
        status: "pending_approval", // Groups start as pending approval
        overview: {
          meeting_link: meetingLink,
          meeting_link_created_at: new Date(),
        },
      });

      await newGroup.save({ session });

      // Add creator as admin member
      const adminMember = new GroupMember({
        user_id: creatorUserId,
        group_id: group_id,
        is_admin: true,
      });

      await adminMember.save({ session });

      // Update creator's user profile
      await mongoOperations.updateUserProfile(creatorUserId, group_id, session);

      await session.commitTransaction();

      return {
        success: true,
        group: newGroup,
        group_id: group_id,
        member_emails: memberEmails,
        meeting_link: meetingLink,
        message:
          "Study group created successfully and submitted for approval. You will be notified once it's approved by the super admin.",
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  },

  // Get user's study groups (only show approved groups to non-creators, show all to creators)
  getUserStudyGroups: async (user_id) => {
    // Get user's groups from profile
    const userProfile = await UserProfile.findOne({ user_id });
    if (!userProfile || !userProfile.groups.length) {
      return [];
    }

    // Get group details - show all groups user is part of (including pending if they're creator)
    const groups = await GroupData.find({
      group_id: { $in: userProfile.groups },
      $or: [
        { status: "active" }, // Always show active groups
        { created_by: user_id }, // Show pending groups if user is the creator
      ],
    }).lean();

    // Add member info and counts
    const groupsWithDetails = await Promise.all(
      groups.map(async (group) => {
        const memberInfo = await GroupMember.findOne({
          user_id,
          group_id: group.group_id,
          status: "active",
        }).lean();

        const memberCount = await GroupMember.countDocuments({
          group_id: group.group_id,
          status: "active",
        });

        return {
          ...group,
          is_admin: memberInfo?.is_admin || false,
          joined_at: memberInfo?.joined_at,
          member_count: memberCount,
        };
      })
    );

    return groupsWithDetails;
  },

  // Get all public study groups (only approved ones)
  getAllStudyGroups: async (user_id) => {
    // Only show active/approved groups
    const groups = await GroupData.find({ status: "active" }).lean();

    const groupsWithDetails = await Promise.all(
      groups.map(async (group) => {
        const memberInfo = await GroupMember.findOne({
          user_id,
          group_id: group.group_id,
          status: "active",
        }).lean();

        const memberCount = await GroupMember.countDocuments({
          group_id: group.group_id,
          status: "active",
        });

        return {
          ...group,
          is_admin: memberInfo?.is_admin || false,
          joined_at: memberInfo?.joined_at,
          member_count: memberCount,
        };
      })
    );

    return groupsWithDetails;
  },

  // Join study group - now creates join request instead of direct join
  joinStudyGroup: async (user_id, group_id, message = "") => {
    // Check if group exists and is active
    const group = await GroupData.findOne({ group_id, status: "active" });
    if (!group) {
      throw new Error("Study group not found or not available for joining");
    }

    // Check if user is already a member
    const existingMember = await GroupMember.findOne({
      user_id,
      group_id,
      status: "active",
    });

    if (existingMember) {
      throw new Error("You are already a member of this group");
    }

    // Submit join request instead of directly joining
    return await mongoOperations.submitJoinRequest(user_id, group_id, message);
  },

  // Update user profile with new group
  updateUserProfile: async (user_id, group_id, session = null) => {
    const options = session ? { session } : {};

    await UserProfile.findOneAndUpdate(
      { user_id },
      {
        $addToSet: { groups: group_id },
        $set: { updated_at: new Date() },
      },
      { upsert: true, ...options }
    );
  },

  // Get group details (modified to handle approval status)
  getGroupDetails: async (group_id) => {
    const group = await GroupData.findOne({ group_id }).lean();
    if (!group) {
      throw new Error("Study group not found");
    }

    // Get members with user details
    const members = await GroupMember.find({
      group_id,
      status: "active",
    }).lean();

    return {
      ...group,
      members: members,
      member_count: members.length,
    };
  },

  // Accept invitation (modified to handle approval status)
  acceptInvitation: async (invitation_token, user_id) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Find invitation
      const invitation = await GroupInvitation.findOne({
        invitation_token,
        status: "pending",
        expires_at: { $gt: new Date() },
      });

      if (!invitation) {
        throw new Error("Invalid or expired invitation");
      }

      // Check if group still exists and is active
      const group = await GroupData.findOne({
        group_id: invitation.group_id,
        status: "active", // Only allow joining active groups
      });

      if (!group) {
        throw new Error("Study group no longer exists or is not available");
      }

      // Check if user is already a member
      const existingMember = await GroupMember.findOne({
        user_id,
        group_id: invitation.group_id,
        status: "active",
      });

      if (existingMember) {
        // Mark invitation as accepted even if already a member
        invitation.status = "accepted";
        invitation.accepted_at = new Date();
        await invitation.save({ session });

        await session.commitTransaction();
        return {
          success: true,
          message: "You are already a member of this group",
          group: group,
        };
      }

      // Add user as member
      const newMember = new GroupMember({
        user_id,
        group_id: invitation.group_id,
        is_admin: false,
      });

      await newMember.save({ session });

      // Update user profile
      await mongoOperations.updateUserProfile(
        user_id,
        invitation.group_id,
        session
      );

      // Mark invitation as accepted
      invitation.status = "accepted";
      invitation.accepted_at = new Date();
      await invitation.save({ session });

      await session.commitTransaction();

      return {
        success: true,
        message: "Successfully joined the study group!",
        group: group,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  },

  // Send group invitation (only for active groups)
  sendGroupInvitation: async (group_id, invited_email, invited_by) => {
    // Verify group is active
    const group = await GroupData.findOne({ group_id, status: "active" });
    if (!group) {
      throw new Error("Cannot send invitations for inactive groups");
    }

    // Verify user is admin
    const member = await GroupMember.findOne({
      group_id,
      user_id: invited_by,
      is_admin: true,
      status: "active",
    });

    if (!member) {
      throw new Error("Only group admins can send invitations");
    }

    // Check if invitation already exists
    const existingInvitation = await GroupInvitation.findOne({
      group_id,
      invited_email: invited_email.toLowerCase(),
      status: "pending",
      expires_at: { $gt: new Date() },
    });

    if (existingInvitation) {
      throw new Error("An invitation has already been sent to this email");
    }

    // Generate unique invitation token
    const invitation_token = require("crypto").randomBytes(32).toString("hex");

    // Create invitation
    const invitation = new GroupInvitation({
      group_id,
      invited_email: invited_email.toLowerCase(),
      invited_by,
      invitation_token,
    });

    await invitation.save();

    return {
      success: true,
      invitation_token,
      expires_at: invitation.expires_at,
      message: "Invitation sent successfully",
    };
  },

  // Generate meeting link (admin only, active groups only)
  generateMeetingLink: async (group_id, user_id) => {
    // Verify group is active
    const group = await GroupData.findOne({ group_id, status: "active" });
    if (!group) {
      throw new Error("Meeting links can only be generated for active groups");
    }

    // Verify user is admin
    const member = await GroupMember.findOne({
      group_id,
      user_id,
      is_admin: true,
      status: "active",
    });

    if (!member) {
      throw new Error("Only group admins can generate meeting links");
    }

    // Generate a Google Meet-style link (for demo purposes)
    const meetCode =
      Math.random().toString(36).substring(2, 5) +
      "-" +
      Math.random().toString(36).substring(2, 6) +
      "-" +
      Math.random().toString(36).substring(2, 5);

    const meetingLink = `https://meet.google.com/${meetCode}`;

    // Update group with meeting link
    const updatedGroup = await GroupData.findOneAndUpdate(
      { group_id },
      {
        $set: {
          "overview.meeting_link": meetingLink,
          "overview.meeting_link_created_at": new Date(),
        },
      },
      { new: true }
    );

    return {
      meeting_link: meetingLink,
      created_at: new Date(),
      group: updatedGroup,
    };
  },

  // Remove member from group (admin only)
  removeMemberFromGroup: async (group_id, admin_user_id, member_user_id) => {
    // Verify admin permissions
    const adminMember = await GroupMember.findOne({
      group_id,
      user_id: admin_user_id,
      is_admin: true,
      status: "active",
    });

    if (!adminMember) {
      throw new Error("Only group admins can remove members");
    }

    // Can't remove yourself
    if (admin_user_id === member_user_id) {
      throw new Error("Group admins cannot remove themselves");
    }

    // Remove member
    const result = await GroupMember.findOneAndUpdate(
      {
        group_id,
        user_id: member_user_id,
        status: "active",
      },
      {
        $set: { status: "removed" },
      }
    );

    if (!result) {
      throw new Error("Member not found or already removed");
    }

    // Update user profile
    await UserProfile.findOneAndUpdate(
      { user_id: member_user_id },
      {
        $pull: { groups: group_id },
        $set: { updated_at: new Date() },
      }
    );

    return {
      success: true,
      message: "Member removed successfully",
    };
  },

  // Get group invitations (for group admin to see pending invitations)
  getGroupInvitations: async (group_id) => {
    const invitations = await GroupInvitation.find({
      group_id,
      status: "pending",
      expires_at: { $gt: new Date() },
    }).lean();

    return invitations;
  },

  // Cleanup expired invitations
  cleanupExpiredInvitations: async () => {
    const result = await GroupInvitation.updateMany(
      {
        status: "pending",
        expires_at: { $lt: new Date() },
      },
      {
        $set: { status: "expired" },
      }
    );

    return result.modifiedCount;
  },

  // Get complete group details with members, resources, discussion (only for active groups or creators)
  getCompleteGroupDetails: async (group_id, user_id) => {
    const group = await GroupData.findOne({
      group_id,
      $or: [
        { status: "active" }, // Active groups available to all members
        { created_by: user_id }, // Pending groups available to creator
      ],
    }).lean();

    if (!group) {
      throw new Error("Study group not found or not available");
    }

    // Get members with user details
    const members = await GroupMember.find({
      group_id,
      status: "active",
    }).lean();

    // Check if current user is a member
    const currentUserMember = members.find((m) => m.user_id === user_id);
    if (!currentUserMember && group.created_by !== user_id) {
      throw new Error("You are not a member of this group");
    }

    // Get pending invitations (only for admins)
    let pendingInvitations = [];
    if (currentUserMember?.is_admin) {
      pendingInvitations = await GroupInvitation.find({
        group_id,
        status: "pending",
        expires_at: { $gt: new Date() },
      }).lean();
    }

    // Get pending join requests (only for admins of active groups)
    let pendingJoinRequests = [];
    if (currentUserMember?.is_admin && group.status === "active") {
      pendingJoinRequests = await GroupJoinRequest.find({
        group_id,
        status: "pending",
      })
        .sort({ requested_at: 1 })
        .lean();
    }

    return {
      ...group,
      members: members,
      member_count: members.length,
      current_user_is_admin: currentUserMember?.is_admin || false,
      pending_invitations: pendingInvitations,
      pending_join_requests: pendingJoinRequests,
    };
  },

  // ========== RESOURCES OPERATIONS (Modified for active groups only) ==========

  // Add resource to group (only active groups)
  addGroupResource: async (group_id, user_id, resourceData) => {
    // Verify group is active
    const group = await GroupData.findOne({ group_id, status: "active" });
    if (!group) {
      throw new Error("Resources can only be added to active groups");
    }

    // Verify user is a member
    const member = await GroupMember.findOne({
      group_id,
      user_id,
      status: "active",
    });

    if (!member) {
      throw new Error("Only group members can add resources");
    }

    // Get user details for caching
    const { dbOperations } = require("./database");
    const user = await dbOperations.getUserById(user_id);

    const newResource = {
      type: resourceData.type,
      title: resourceData.title,
      url: resourceData.url,
      description: resourceData.description || "",
      uploaded_by: user_id,
      uploaded_by_name: user.email, // Cache user name
    };

    const updatedGroup = await GroupData.findOneAndUpdate(
      { group_id },
      {
        $push: { resources: newResource },
      },
      { new: true }
    );

    return {
      success: true,
      resource: newResource,
      group: updatedGroup,
    };
  },

  // Remove resource from group
  removeGroupResource: async (group_id, user_id, resource_id) => {
    const group = await GroupData.findOne({ group_id });
    if (!group) {
      throw new Error("Group not found");
    }

    // Find the resource
    const resource = group.resources.find(
      (r) => r._id.toString() === resource_id
    );
    if (!resource) {
      throw new Error("Resource not found");
    }

    // Verify user is admin or resource owner
    const member = await GroupMember.findOne({
      group_id,
      user_id,
      status: "active",
    });

    if (!member || (!member.is_admin && resource.uploaded_by !== user_id)) {
      throw new Error(
        "You can only remove resources you uploaded or be a group admin"
      );
    }

    const updatedGroup = await GroupData.findOneAndUpdate(
      { group_id },
      {
        $pull: { resources: { _id: resource_id } },
      },
      { new: true }
    );

    return {
      success: true,
      message: "Resource removed successfully",
      group: updatedGroup,
    };
  },

  // ========== DISCUSSION OPERATIONS ==========

  // Get group discussion (only for active groups)
  getGroupDiscussion: async (group_id, user_id) => {
    // Verify group is active and user is member
    const group = await GroupData.findOne({ group_id, status: "active" });
    if (!group) {
      throw new Error("Discussion not available for this group");
    }

    const member = await GroupMember.findOne({
      group_id,
      user_id,
      status: "active",
    });

    if (!member) {
      throw new Error("You must be a member to view group discussions");
    }

    let discussion = await GroupDiscussion.findOne({ group_id });

    if (!discussion) {
      // Create discussion if it doesn't exist
      discussion = new GroupDiscussion({ group_id });
      await discussion.save();
    }

    return discussion;
  },

  // Add message to group discussion
  addDiscussionMessage: async (group_id, user_id, message) => {
    // Verify group is active and user is member
    const group = await GroupData.findOne({ group_id, status: "active" });
    if (!group) {
      throw new Error("Cannot post to discussions in inactive groups");
    }

    const member = await GroupMember.findOne({
      group_id,
      user_id,
      status: "active",
    });

    if (!member) {
      throw new Error("You must be a member to post in group discussions");
    }

    // Get user details
    const { dbOperations } = require("./database");
    const user = await dbOperations.getUserById(user_id);

    const newMessage = {
      user_id,
      user_name: user.email, // Using email as display name
      user_email: user.email,
      message: message.trim(),
    };

    const updatedDiscussion = await GroupDiscussion.findOneAndUpdate(
      { group_id },
      {
        $push: { messages: newMessage },
        $set: { updated_at: new Date() },
      },
      { upsert: true, new: true }
    );

    return {
      success: true,
      message: newMessage,
      discussion: updatedDiscussion,
    };
  },

  // ========== USER NOTES OPERATIONS ==========

  // Get user's personal notes for a group
  getUserGroupNotes: async (user_id, group_id) => {
    // Verify user is member of group
    const member = await GroupMember.findOne({
      user_id,
      group_id,
      status: "active",
    });

    if (!member) {
      throw new Error("You must be a member to view notes for this group");
    }

    let notes = await UserGroupNotes.findOne({ user_id, group_id });

    if (!notes) {
      // Create empty notes if they don't exist
      notes = new UserGroupNotes({ user_id, group_id, notes: "" });
      await notes.save();
    }

    return notes;
  },

  // Update user's personal notes for a group
  updateUserGroupNotes: async (user_id, group_id, noteContent) => {
    // Verify user is member of group
    const member = await GroupMember.findOne({
      user_id,
      group_id,
      status: "active",
    });

    if (!member) {
      throw new Error("You must be a member to update notes for this group");
    }

    const updatedNotes = await UserGroupNotes.findOneAndUpdate(
      { user_id, group_id },
      {
        $set: {
          notes: noteContent,
          updated_at: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    return {
      success: true,
      notes: updatedNotes,
    };
  },
};

module.exports = {
  connectMongoDB,
  GroupData,
  GroupMember,
  GroupJoinRequest,
  UserProfile,
  GroupInvitation,
  GroupDiscussion,
  UserGroupNotes,
  mongoOperations,
};

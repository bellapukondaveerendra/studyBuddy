const mongoose = require("mongoose");

// MongoDB connection
const connectMongoDB = async () => {
  try {
    // Using MongoDB Atlas connection string
    const mongoURI =
      process.env.MONGODB_URI || "mongodb://localhost:27017/studybuddy";

    await mongoose.connect(mongoURI);
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

// Study Group Schema (Updated)
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
    default: "active",
    enum: ["active", "inactive"],
  },
  // New fields for group detail functionality
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
        enum: ["file", "link"],
        required: true,
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

// Group Members Schema
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
    enum: ["active", "left", "removed"],
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
userProfileSchema.index({ user_id: 1 });
groupInvitationSchema.index({ invitation_token: 1 });
groupInvitationSchema.index({ invited_email: 1, group_id: 1 });
groupInvitationSchema.index({ expires_at: 1 }); // For cleanup of expired invitations
groupDiscussionSchema.index({ group_id: 1 });
userGroupNotesSchema.index({ user_id: 1, group_id: 1 });

// Create models
const GroupData = mongoose.model("GroupData", groupDataSchema);
const GroupMember = mongoose.model("GroupMember", groupMemberSchema);
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

  // Create study group with invitation system
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

      // Create group with meeting link already included
      const newGroup = new GroupData({
        group_id,
        name: groupData.name,
        concept: groupData.concept,
        level: groupData.level,
        time_commitment: groupData.time_commitment,
        created_by: creatorUserId,
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
        member_emails: memberEmails, // Return for invitation processing
        meeting_link: meetingLink, // Include meeting link in response
        message: "Study group created successfully with meeting link",
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  },

  // Update user profile with new group
  updateUserProfile: async (user_id, group_id, session = null) => {
    const options = session ? { session } : {};

    const profile = await UserProfile.findOneAndUpdate(
      { user_id },
      {
        $addToSet: { groups: group_id },
        $set: { updated_at: new Date() },
      },
      {
        upsert: true,
        new: true,
        ...options,
      }
    );

    return profile;
  },

  // Get all study groups with filters
  getStudyGroups: async (filters = {}) => {
    const query = { status: "active" };

    // Apply filters
    if (filters.level) {
      query.level = filters.level;
    }
    if (filters.time_commitment) {
      query.time_commitment = filters.time_commitment;
    }
    if (filters.concept) {
      query.concept = { $regex: filters.concept, $options: "i" }; // case-insensitive search
    }

    const groups = await GroupData.find(query).sort({ created_at: -1 }).lean();

    // Get member count for each group
    const groupsWithMembers = await Promise.all(
      groups.map(async (group) => {
        const memberCount = await GroupMember.countDocuments({
          group_id: group.group_id,
          status: "active",
        });

        return {
          ...group,
          member_count: memberCount,
        };
      })
    );

    return groupsWithMembers;
  },

  // Get user's joined groups
  getUserGroups: async (user_id) => {
    // Get user's group IDs
    const userProfile = await UserProfile.findOne({ user_id }).lean();

    if (!userProfile || !userProfile.groups.length) {
      return [];
    }

    // Get detailed group information
    const groups = await GroupData.find({
      group_id: { $in: userProfile.groups },
      status: "active",
    }).lean();

    // Add member info for each group
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

  // Join study group
  joinStudyGroup: async (user_id, group_id) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Check if group exists and is active
      const group = await GroupData.findOne({ group_id, status: "active" });
      if (!group) {
        throw new Error("Study group not found or inactive");
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

      // Add user as member
      const newMember = new GroupMember({
        user_id,
        group_id,
        is_admin: false,
      });

      await newMember.save({ session });

      // Update user profile
      await mongoOperations.updateUserProfile(user_id, group_id, session);

      await session.commitTransaction();

      return {
        success: true,
        message: "Successfully joined the study group",
        group: group,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  },

  // Get group details with members
  getGroupDetails: async (group_id) => {
    console.log("group_id", group_id);
    const group = await GroupData.findOne({
      group_id,
      status: "active",
    }).lean();

    if (!group) {
      throw new Error("Study group not found");
    }

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

  // Invitation management operations
  createInvitation: async (
    group_id,
    invited_email,
    invited_by,
    invitation_token
  ) => {
    // Check if invitation already exists and is pending
    const existingInvitation = await GroupInvitation.findOne({
      group_id,
      invited_email,
      status: "pending",
      expires_at: { $gt: new Date() },
    });

    if (existingInvitation) {
      throw new Error("Invitation already sent to this email for this group");
    }

    const invitation = new GroupInvitation({
      group_id,
      invited_email,
      invited_by,
      invitation_token,
    });

    await invitation.save();
    return invitation;
  },

  getInvitationByToken: async (token) => {
    const invitation = await GroupInvitation.findOne({
      invitation_token: token,
      status: "pending",
      expires_at: { $gt: new Date() },
    });

    if (!invitation) {
      throw new Error("Invalid or expired invitation");
    }

    return invitation;
  },

  acceptInvitation: async (invitation_token, user_id) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Get invitation
      const invitation = await GroupInvitation.findOne({
        invitation_token,
        status: "pending",
        expires_at: { $gt: new Date() },
      });

      if (!invitation) {
        throw new Error("Invalid or expired invitation");
      }

      // Check if group still exists
      const group = await GroupData.findOne({
        group_id: invitation.group_id,
        status: "active",
      });

      if (!group) {
        throw new Error("Study group no longer exists");
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

  getGroupInvitations: async (group_id) => {
    const invitations = await GroupInvitation.find({
      group_id,
      status: "pending",
      expires_at: { $gt: new Date() },
    }).lean();

    return invitations;
  },

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

  // ========== GROUP DETAIL OPERATIONS ==========

  // Get complete group details with members, resources, discussion
  getCompleteGroupDetails: async (group_id, user_id) => {
    const group = await GroupData.findOne({
      group_id,
      status: "active",
    }).lean();

    if (!group) {
      throw new Error("Study group not found");
    }

    // Get members with user details
    const members = await GroupMember.find({
      group_id,
      status: "active",
    }).lean();

    // Check if current user is a member
    const currentUserMember = members.find((m) => m.user_id === user_id);
    if (!currentUserMember) {
      throw new Error("You are not a member of this group");
    }

    // Get pending invitations (only for admins)
    let pendingInvitations = [];
    if (currentUserMember.is_admin) {
      pendingInvitations = await GroupInvitation.find({
        group_id,
        status: "pending",
        expires_at: { $gt: new Date() },
      }).lean();
    }

    return {
      ...group,
      members: members,
      member_count: members.length,
      current_user_is_admin: currentUserMember.is_admin,
      pending_invitations: pendingInvitations,
    };
  },

  // Generate Google Meet link
  generateMeetingLink: async (group_id, user_id) => {
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

  // ========== RESOURCES OPERATIONS ==========

  // Add resource to group
  addGroupResource: async (group_id, user_id, resourceData) => {
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
      throw new Error("You can only remove your own resources or be an admin");
    }

    // Remove resource
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

  // ========== DISCUSSIONS OPERATIONS ==========

  // Get or create group discussion
  getGroupDiscussion: async (group_id, user_id) => {
    // Verify user is a member
    const member = await GroupMember.findOne({
      group_id,
      user_id,
      status: "active",
    });

    if (!member) {
      throw new Error("Only group members can view discussions");
    }

    let discussion = await GroupDiscussion.findOne({ group_id });

    if (!discussion) {
      // Create new discussion if it doesn't exist
      discussion = new GroupDiscussion({
        group_id,
        messages: [],
      });
      await discussion.save();

      // Update group with discussion ID
      await GroupData.findOneAndUpdate(
        { group_id },
        { $set: { discussion_id: discussion._id } }
      );
    }

    return discussion;
  },

  // Add message to group discussion
  addDiscussionMessage: async (group_id, user_id, message) => {
    // Verify user is a member
    const member = await GroupMember.findOne({
      group_id,
      user_id,
      status: "active",
    });

    if (!member) {
      throw new Error("Only group members can post messages");
    }

    // Get user details
    const { dbOperations } = require("./database");
    const user = await dbOperations.getUserById(user_id);

    // Get or create discussion
    let discussion = await GroupDiscussion.findOne({ group_id });
    if (!discussion) {
      discussion = await mongoOperations.getGroupDiscussion(group_id, user_id);
    }

    const newMessage = {
      user_id,
      user_name: user.email, // Cache user name
      user_email: user.email,
      message: message.trim(),
    };

    const updatedDiscussion = await GroupDiscussion.findOneAndUpdate(
      { group_id },
      {
        $push: { messages: newMessage },
        $set: { updated_at: new Date() },
      },
      { new: true }
    );

    return {
      success: true,
      message: newMessage,
      discussion: updatedDiscussion,
    };
  },

  // ========== USER NOTES OPERATIONS ==========

  // Get user's notes for a group
  getUserGroupNotes: async (user_id, group_id) => {
    // Verify user is a member
    const member = await GroupMember.findOne({
      group_id,
      user_id,
      status: "active",
    });

    if (!member) {
      throw new Error("Only group members can view notes");
    }

    let notes = await UserGroupNotes.findOne({ user_id, group_id });

    if (!notes) {
      // Create empty notes if they don't exist
      notes = new UserGroupNotes({
        user_id,
        group_id,
        notes: "",
      });
      await notes.save();
    }

    return notes;
  },

  // Update user's notes for a group
  updateUserGroupNotes: async (user_id, group_id, notesContent) => {
    // Verify user is a member
    const member = await GroupMember.findOne({
      group_id,
      user_id,
      status: "active",
    });

    if (!member) {
      throw new Error("Only group members can update notes");
    }

    const updatedNotes = await UserGroupNotes.findOneAndUpdate(
      { user_id, group_id },
      {
        $set: {
          notes: notesContent,
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
  UserProfile,
  GroupInvitation,
  GroupDiscussion,
  UserGroupNotes,
  mongoOperations,
};

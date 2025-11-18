// backend/services/dynamodb.js
require("dotenv").config();

const {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  UpdateItemCommand,
  DeleteItemCommand,
  QueryCommand,
  ScanCommand,
} = require("@aws-sdk/client-dynamodb");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});

// Table names
const TABLES = {
  GROUPS: process.env.DYNAMODB_GROUPS_TABLE || "StudyBuddy-Groups",
  MEMBERS: process.env.DYNAMODB_MEMBERS_TABLE || "StudyBuddy-GroupMembers",
  JOIN_REQUESTS: process.env.DYNAMODB_JOIN_REQUESTS_TABLE || "StudyBuddy-JoinRequests",
  INVITATIONS: process.env.DYNAMODB_INVITATIONS_TABLE || "StudyBuddy-Invitations",
  DISCUSSIONS: process.env.DYNAMODB_DISCUSSIONS_TABLE || "StudyBuddy-Discussions",
  NOTES: process.env.DYNAMODB_NOTES_TABLE || "StudyBuddy-Notes",
};

const dynamoService = {
  // ========== GROUP OPERATIONS ==========

  // Generate unique group ID
  generateGroupId: async () => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `G${timestamp}${random}`;
  },

  // Create Study Group
  createStudyGroup: async (groupData, creatorId) => {
    try {
      const groupId = await dynamoService.generateGroupId();
      const timestamp = new Date().toISOString();

      const group = {
        group_id: groupId,
        name: groupData.name,
        concept: groupData.concept,
        level: groupData.level,
        time_commitment: groupData.time_commitment,
        description: groupData.description || "",
        meeting_link: groupData.meeting_link || "",
        status: "pending_approval",
        created_by: creatorId,
        created_at: timestamp,
        updated_at: timestamp,
        resources: [],
        approval_status: {
          is_approved: false,
          approved_by: null,
          approved_at: null,
          rejection_reason: null,
        },
      };

      const params = {
        TableName: TABLES.GROUPS,
        Item: marshall(group),
      };

      await dynamoClient.send(new PutItemCommand(params));

      // Add creator as admin member
      await dynamoService.addGroupMember(groupId, creatorId, true, "active");

      return { success: true, group_id: groupId, group };
    } catch (error) {
      console.error("Create group error:", error);
      throw new Error("Failed to create study group");
    }
  },

  // Get all approved groups
  getAllStudyGroups: async (userId) => {
    try {
      const params = {
        TableName: TABLES.GROUPS,
        FilterExpression: "#status = :status",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: marshall({ ":status": "active" }),
      };

      const result = await dynamoClient.send(new ScanCommand(params));
      const groups = result.Items ? result.Items.map((item) => unmarshall(item)) : [];

      // Get member counts for each group
      const groupsWithDetails = await Promise.all(
        groups.map(async (group) => {
          const memberCount = await dynamoService.getGroupMemberCount(group.group_id);
          const userMember = await dynamoService.getGroupMember(group.group_id, userId);

          return {
            ...group,
            member_count: memberCount,
            current_user_is_member: !!userMember,
            current_user_is_admin: userMember?.is_admin || false,
          };
        })
      );

      return groupsWithDetails;
    } catch (error) {
      console.error("Get all groups error:", error);
      throw new Error("Failed to fetch study groups");
    }
  },

  // Get user's groups
  getUserGroups: async (userId) => {
    try {
      const params = {
        TableName: TABLES.MEMBERS,
        IndexName: "UserIdIndex",
        KeyConditionExpression: "user_id = :userId",
        ExpressionAttributeValues: marshall({ ":userId": userId }),
      };

      const result = await dynamoClient.send(new QueryCommand(params));
      const memberships = result.Items ? result.Items.map((item) => unmarshall(item)) : [];

      // Get full group details
      const groups = await Promise.all(
        memberships.map(async (membership) => {
          const group = await dynamoService.getGroupById(membership.group_id);
          return {
            ...group,
            user_role: membership.is_admin ? "admin" : "member",
            joined_at: membership.joined_at,
          };
        })
      );

      return groups.filter((g) => g !== null);
    } catch (error) {
      console.error("Get user groups error:", error);
      throw new Error("Failed to fetch user groups");
    }
  },

  // Get group by ID
  getGroupById: async (groupId) => {
    try {
      const params = {
        TableName: TABLES.GROUPS,
        Key: marshall({ group_id: groupId }),
      };

      const result = await dynamoClient.send(new GetItemCommand(params));
      if (!result.Item) return null;

      const group = unmarshall(result.Item);
      
      // Get members
      const members = await dynamoService.getGroupMembers(groupId);
      
      return {
        ...group,
        members,
        member_count: members.length,
      };
    } catch (error) {
      console.error("Get group by ID error:", error);
      return null;
    }
  },

  // Update group
  updateGroup: async (groupId, updates) => {
    try {
      const updateExpressions = [];
      const expressionAttributeNames = {};
      const expressionAttributeValues = {};

      Object.keys(updates).forEach((key, index) => {
        updateExpressions.push(`#field${index} = :value${index}`);
        expressionAttributeNames[`#field${index}`] = key;
        expressionAttributeValues[`:value${index}`] = updates[key];
      });

      updateExpressions.push(`#updatedAt = :updatedAt`);
      expressionAttributeNames["#updatedAt"] = "updated_at";
      expressionAttributeValues[":updatedAt"] = new Date().toISOString();

      const params = {
        TableName: TABLES.GROUPS,
        Key: marshall({ group_id: groupId }),
        UpdateExpression: `SET ${updateExpressions.join(", ")}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: marshall(expressionAttributeValues),
        ReturnValues: "ALL_NEW",
      };

      const result = await dynamoClient.send(new UpdateItemCommand(params));
      return unmarshall(result.Attributes);
    } catch (error) {
      console.error("Update group error:", error);
      throw new Error("Failed to update group");
    }
  },

  // Approve group
  approveGroup: async (groupId, superAdminId) => {
    try {
      const updates = {
        status: "active",
        "approval_status.is_approved": true,
        "approval_status.approved_by": superAdminId,
        "approval_status.approved_at": new Date().toISOString(),
      };

      return await dynamoService.updateGroup(groupId, updates);
    } catch (error) {
      console.error("Approve group error:", error);
      throw new Error("Failed to approve group");
    }
  },

  // Reject group
  rejectGroup: async (groupId, superAdminId, reason) => {
    try {
      const updates = {
        status: "rejected",
        "approval_status.is_approved": false,
        "approval_status.approved_by": superAdminId,
        "approval_status.approved_at": new Date().toISOString(),
        "approval_status.rejection_reason": reason,
      };

      return await dynamoService.updateGroup(groupId, updates);
    } catch (error) {
      console.error("Reject group error:", error);
      throw new Error("Failed to reject group");
    }
  },

  // Delete group
  deleteGroup: async (groupId) => {
    try {
      // Delete group
      await dynamoClient.send(
        new DeleteItemCommand({
          TableName: TABLES.GROUPS,
          Key: marshall({ group_id: groupId }),
        })
      );

      // Delete all members
      const members = await dynamoService.getGroupMembers(groupId);
      await Promise.all(
        members.map((member) =>
          dynamoService.removeGroupMember(groupId, member.user_id)
        )
      );

      return { success: true, message: "Group deleted successfully" };
    } catch (error) {
      console.error("Delete group error:", error);
      throw new Error("Failed to delete group");
    }
  },

  // Get pending groups count
  getPendingGroupApprovalsCount: async () => {
    try {
      const params = {
        TableName: TABLES.GROUPS,
        FilterExpression: "#status = :status",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: marshall({ ":status": "pending_approval" }),
        Select: "COUNT",
      };

      const result = await dynamoClient.send(new ScanCommand(params));
      return result.Count || 0;
    } catch (error) {
      console.error("Get pending count error:", error);
      return 0;
    }
  },

  // Get all groups for super admin
  getAllGroupsForSuperAdmin: async () => {
    try {
      const params = { TableName: TABLES.GROUPS };
      const result = await dynamoClient.send(new ScanCommand(params));
      const groups = result.Items ? result.Items.map((item) => unmarshall(item)) : [];

      // Get member counts
      const groupsWithDetails = await Promise.all(
        groups.map(async (group) => {
          const memberCount = await dynamoService.getGroupMemberCount(group.group_id);
          return { ...group, member_count: memberCount };
        })
      );

      return groupsWithDetails;
    } catch (error) {
      console.error("Get all groups for admin error:", error);
      throw new Error("Failed to fetch groups");
    }
  },

  // ========== MEMBER OPERATIONS ==========

  // Add group member
  addGroupMember: async (groupId, userId, isAdmin = false, status = "active") => {
    try {
      const member = {
        group_id: groupId,
        user_id: userId,
        is_admin: isAdmin,
        status: status,
        joined_at: new Date().toISOString(),
      };

      const params = {
        TableName: TABLES.MEMBERS,
        Item: marshall(member),
      };

      await dynamoClient.send(new PutItemCommand(params));
      return member;
    } catch (error) {
      console.error("Add member error:", error);
      throw new Error("Failed to add member");
    }
  },

  // Get group members
  getGroupMembers: async (groupId) => {
    try {
      const params = {
        TableName: TABLES.MEMBERS,
        KeyConditionExpression: "group_id = :groupId",
        ExpressionAttributeValues: marshall({ ":groupId": groupId }),
      };

      const result = await dynamoClient.send(new QueryCommand(params));
      return result.Items ? result.Items.map((item) => unmarshall(item)) : [];
    } catch (error) {
      console.error("Get members error:", error);
      return [];
    }
  },

  // Get group member
  getGroupMember: async (groupId, userId) => {
    try {
      const params = {
        TableName: TABLES.MEMBERS,
        Key: marshall({ group_id: groupId, user_id: userId }),
      };

      const result = await dynamoClient.send(new GetItemCommand(params));
      return result.Item ? unmarshall(result.Item) : null;
    } catch (error) {
      console.error("Get member error:", error);
      return null;
    }
  },

  // Get group member count
  getGroupMemberCount: async (groupId) => {
    try {
      const params = {
        TableName: TABLES.MEMBERS,
        KeyConditionExpression: "group_id = :groupId",
        ExpressionAttributeValues: marshall({ ":groupId": groupId }),
        Select: "COUNT",
      };

      const result = await dynamoClient.send(new QueryCommand(params));
      return result.Count || 0;
    } catch (error) {
      console.error("Get member count error:", error);
      return 0;
    }
  },

  // Remove group member
  removeGroupMember: async (groupId, userId) => {
    try {
      const params = {
        TableName: TABLES.MEMBERS,
        Key: marshall({ group_id: groupId, user_id: userId }),
      };

      await dynamoClient.send(new DeleteItemCommand(params));
      return { success: true, message: "Member removed successfully" };
    } catch (error) {
      console.error("Remove member error:", error);
      throw new Error("Failed to remove member");
    }
  },

  // ========== RESOURCE OPERATIONS ==========

  // Add resource to group
  addGroupResource: async (groupId, userId, resourceData) => {
    try {
      const group = await dynamoService.getGroupById(groupId);
      if (!group) throw new Error("Group not found");

      const resourceId = `R${Date.now()}`;
      const newResource = {
        resource_id: resourceId,
        type: resourceData.type,
        title: resourceData.title,
        url: resourceData.url,
        description: resourceData.description || "",
        uploaded_by: userId,
        uploaded_at: new Date().toISOString(),
      };

      const resources = group.resources || [];
      resources.push(newResource);

      await dynamoService.updateGroup(groupId, { resources });

      return { success: true, resource: newResource };
    } catch (error) {
      console.error("Add resource error:", error);
      throw new Error("Failed to add resource");
    }
  },

  // Remove resource from group
  removeGroupResource: async (groupId, userId, resourceId) => {
    try {
      const group = await dynamoService.getGroupById(groupId);
      if (!group) throw new Error("Group not found");

      const resources = (group.resources || []).filter(
        (r) => r.resource_id !== resourceId
      );

      await dynamoService.updateGroup(groupId, { resources });

      return { success: true, message: "Resource removed successfully" };
    } catch (error) {
      console.error("Remove resource error:", error);
      throw new Error("Failed to remove resource");
    }
  },

  // ========== DISCUSSION OPERATIONS ==========

  // Get group discussion
  getGroupDiscussion: async (groupId) => {
    try {
      const params = {
        TableName: TABLES.DISCUSSIONS,
        Key: marshall({ group_id: groupId }),
      };

      const result = await dynamoClient.send(new GetItemCommand(params));
      
      if (!result.Item) {
        // Create empty discussion
        const discussion = {
          group_id: groupId,
          messages: [],
          created_at: new Date().toISOString(),
        };
        
        await dynamoClient.send(
          new PutItemCommand({
            TableName: TABLES.DISCUSSIONS,
            Item: marshall(discussion),
          })
        );
        
        return discussion;
      }

      return unmarshall(result.Item);
    } catch (error) {
      console.error("Get discussion error:", error);
      throw new Error("Failed to get discussion");
    }
  },

  // Add message to discussion
  addDiscussionMessage: async (groupId, userId, messageText) => {
    try {
      const discussion = await dynamoService.getGroupDiscussion(groupId);
      
      const message = {
        message_id: `M${Date.now()}`,
        user_id: userId,
        message: messageText,
        timestamp: new Date().toISOString(),
      };

      const messages = discussion.messages || [];
      messages.push(message);

      const params = {
        TableName: TABLES.DISCUSSIONS,
        Key: marshall({ group_id: groupId }),
        UpdateExpression: "SET messages = :messages, updated_at = :updatedAt",
        ExpressionAttributeValues: marshall({
          ":messages": messages,
          ":updatedAt": new Date().toISOString(),
        }),
        ReturnValues: "ALL_NEW",
      };

      const result = await dynamoClient.send(new UpdateItemCommand(params));
      return unmarshall(result.Attributes);
    } catch (error) {
      console.error("Add message error:", error);
      throw new Error("Failed to add message");
    }
  },

  // ========== NOTES OPERATIONS ==========

  // Get user's notes for a group
  getUserGroupNotes: async (userId, groupId) => {
    try {
      const params = {
        TableName: TABLES.NOTES,
        Key: marshall({ user_id: userId, group_id: groupId }),
      };

      const result = await dynamoClient.send(new GetItemCommand(params));
      
      if (!result.Item) {
        return { user_id: userId, group_id: groupId, notes: "" };
      }

      return unmarshall(result.Item);
    } catch (error) {
      console.error("Get notes error:", error);
      return { user_id: userId, group_id: groupId, notes: "" };
    }
  },

  // Update user's notes for a group
  updateUserGroupNotes: async (userId, groupId, notes) => {
    try {
      const notesData = {
        user_id: userId,
        group_id: groupId,
        notes: notes,
        updated_at: new Date().toISOString(),
      };

      const params = {
        TableName: TABLES.NOTES,
        Item: marshall(notesData),
      };

      await dynamoClient.send(new PutItemCommand(params));
      return notesData;
    } catch (error) {
      console.error("Update notes error:", error);
      throw new Error("Failed to update notes");
    }
  },

  // ========== JOIN REQUEST OPERATIONS ==========

  // Submit join request
  submitJoinRequest: async (userId, groupId, message = "") => {
    try {
      const requestId = `JR${Date.now()}`;
      const joinRequest = {
        request_id: requestId,
        group_id: groupId,
        user_id: userId,
        message: message,
        status: "pending",
        created_at: new Date().toISOString(),
      };

      const params = {
        TableName: TABLES.JOIN_REQUESTS,
        Item: marshall(joinRequest),
      };

      await dynamoClient.send(new PutItemCommand(params));
      return { success: true, request: joinRequest };
    } catch (error) {
      console.error("Submit join request error:", error);
      throw new Error("Failed to submit join request");
    }
  },

  // Get group join requests
  getGroupJoinRequests: async (groupId) => {
    try {
      const params = {
        TableName: TABLES.JOIN_REQUESTS,
        IndexName: "GroupIdIndex",
        KeyConditionExpression: "group_id = :groupId",
        FilterExpression: "#status = :status",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: marshall({
          ":groupId": groupId,
          ":status": "pending",
        }),
      };

      const result = await dynamoClient.send(new QueryCommand(params));
      return result.Items ? result.Items.map((item) => unmarshall(item)) : [];
    } catch (error) {
      console.error("Get join requests error:", error);
      return [];
    }
  },

  // Approve join request
  approveJoinRequest: async (requestId, groupId, userId) => {
    try {
      // Update request status
      const params = {
        TableName: TABLES.JOIN_REQUESTS,
        Key: marshall({ request_id: requestId }),
        UpdateExpression: "SET #status = :status, updated_at = :updatedAt",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: marshall({
          ":status": "approved",
          ":updatedAt": new Date().toISOString(),
        }),
      };

      await dynamoClient.send(new UpdateItemCommand(params));

      // Add user as member
      await dynamoService.addGroupMember(groupId, userId, false, "active");

      return { success: true, message: "Join request approved" };
    } catch (error) {
      console.error("Approve join request error:", error);
      throw new Error("Failed to approve join request");
    }
  },

  // Reject join request
  rejectJoinRequest: async (requestId) => {
    try {
      const params = {
        TableName: TABLES.JOIN_REQUESTS,
        Key: marshall({ request_id: requestId }),
        UpdateExpression: "SET #status = :status, updated_at = :updatedAt",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: marshall({
          ":status": "rejected",
          ":updatedAt": new Date().toISOString(),
        }),
      };

      await dynamoClient.send(new UpdateItemCommand(params));
      return { success: true, message: "Join request rejected" };
    } catch (error) {
      console.error("Reject join request error:", error);
      throw new Error("Failed to reject join request");
    }
  },
};

module.exports = { dynamoService, TABLES };

require("dotenv").config();
// backend/services/cognito.js - UPDATED VERSION
const {
  CognitoIdentityProviderClient,
  SignUpCommand,
  InitiateAuthCommand,
  GetUserCommand,
  AdminGetUserCommand,
  AdminUpdateUserAttributesCommand,
  AdminDeleteUserCommand,
  ListUsersCommand,
} = require("@aws-sdk/client-cognito-identity-provider");

const crypto = require("crypto");

// Initialize Cognito client
const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const CLIENT_ID = process.env.COGNITO_CLIENT_ID;
const CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET;

// Super Admin emails - HARDCODED LIST
const SUPER_ADMIN_EMAILS = [
  "ccproj2025@gmail.com",
  "superadmin@studybuddy.com",
  // Add more super admin emails here
];

// Helper function to compute secret hash
const computeSecretHash = (username) => {
  if (!CLIENT_SECRET) return undefined;
  
  return crypto
    .createHmac("SHA256", CLIENT_SECRET)
    .update(username + CLIENT_ID)
    .digest("base64");
};


const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber || phoneNumber.trim() === '') {
    return null; // Return null for empty phone numbers
  }

  // Remove all non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');

  // If number already has country code (11+ digits), add + prefix
  if (cleaned.length >= 10) {
    // If it doesn't start with 1 (US country code) and is 10 digits, assume US
    if (!cleaned.startsWith('1') && cleaned.length === 10) {
      cleaned = '1' + cleaned;
    }
    return '+' + cleaned;
  }

  // If number is invalid, return null
  return null;
};
const cognitoService = {
  // Sign Up User
  signUp: async (email, password, firstName, lastName, dateOfBirth, phoneNumber) => {
    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      const params = {
        ClientId: CLIENT_ID,
        Username: email,
        Password: password,
        UserAttributes: [
          { Name: "email", Value: email },
          { Name: "given_name", Value: firstName },
          { Name: "family_name", Value: lastName },
          { Name: "birthdate", Value: dateOfBirth },
          ...(formattedPhone ? [{ Name: "phone_number", Value: formattedPhone }] : []),
        ],
        SecretHash: computeSecretHash(email),
      };

      const command = new SignUpCommand(params);
      const response = await cognitoClient.send(command);

      // Check if user is in super admin list
      const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(email.toLowerCase());

      return {
        success: true,
        user_id: response.UserSub,
        email: email,
        first_name: firstName,
        last_name: lastName,
        date_of_birth: dateOfBirth,
        phone_number: phoneNumber,
        is_super_admin: isSuperAdmin,
        message: "User created successfully. Please verify your email.",
      };
    } catch (error) {
      console.error("Cognito SignUp error:", error);
      
      if (error.name === "UsernameExistsException") {
        throw { message: "Email already exists", code: "EMAIL_EXISTS" };
      }
      
      throw { message: error.message || "Sign up failed", code: "SIGNUP_ERROR" };
    }
  },

  // Sign In User
  signIn: async (email, password) => {
    try {
      const params = {
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: CLIENT_ID,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
        },
      };

      // Only add SECRET_HASH if CLIENT_SECRET exists
      if (CLIENT_SECRET) {
        params.AuthParameters.SECRET_HASH = computeSecretHash(email);
      }

      const command = new InitiateAuthCommand(params);
      const response = await cognitoClient.send(command);

      if (!response.AuthenticationResult) {
        throw { message: "Authentication failed", code: "AUTH_ERROR" };
      }

      // Get user details
      const userDetails = await cognitoService.getUserByToken(
        response.AuthenticationResult.AccessToken
      );

      return {
        success: true,
        user_id: userDetails.user_id,
        email: userDetails.email,
        first_name: userDetails.first_name,
        last_name: userDetails.last_name,
        is_super_admin: userDetails.is_super_admin,
        tokens: {
          accessToken: response.AuthenticationResult.AccessToken,
          idToken: response.AuthenticationResult.IdToken,
          refreshToken: response.AuthenticationResult.RefreshToken,
        },
        message: "Authentication successful",
      };
    } catch (error) {
      console.error("Cognito SignIn error:", error);
      
      if (error.name === "NotAuthorizedException" || error.name === "UserNotFoundException") {
        throw { message: "Invalid email or password", code: "INVALID_CREDENTIALS" };
      }
      
      if (error.name === "UserNotConfirmedException") {
        throw { message: "Please verify your email before signing in", code: "USER_NOT_CONFIRMED" };
      }
      
      throw { message: error.message || "Sign in failed", code: "SIGNIN_ERROR" };
    }
  },

  // Get User by Access Token
  getUserByToken: async (accessToken) => {
    try {
      const params = { AccessToken: accessToken };
      const command = new GetUserCommand(params);
      const response = await cognitoClient.send(command);

      const attributes = {};
      response.UserAttributes.forEach((attr) => {
        attributes[attr.Name] = attr.Value;
      });

      // Check if user is super admin from hardcoded list
      const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(attributes.email.toLowerCase());

      return {
        user_id: response.Username,
        email: attributes.email,
        first_name: attributes.given_name || "",
        last_name: attributes.family_name || "",
        date_of_birth: attributes.birthdate || "",
        phone_number: attributes.phone_number || "",
        is_super_admin: isSuperAdmin,
      };
    } catch (error) {
      console.error("Get user error:", error);
      throw { message: "Failed to get user details", code: "GET_USER_ERROR" };
    }
  },

  // Get User by Username (Admin)
  getUserById: async (userId) => {
    try {
      const params = {
        UserPoolId: USER_POOL_ID,
        Username: userId,
      };

      const command = new AdminGetUserCommand(params);
      const response = await cognitoClient.send(command);

      const attributes = {};
      response.UserAttributes.forEach((attr) => {
        attributes[attr.Name] = attr.Value;
      });

      // Check if user is super admin from hardcoded list
      const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(attributes.email.toLowerCase());

      return {
        user_id: response.Username,
        email: attributes.email,
        first_name: attributes.given_name || "",
        last_name: attributes.family_name || "",
        date_of_birth: attributes.birthdate || "",
        phone_number: attributes.phone_number || "",
        is_super_admin: isSuperAdmin,
        created_at: response.UserCreateDate,
      };
    } catch (error) {
      console.error("Get user by ID error:", error);
      throw { message: "User not found", code: "USER_NOT_FOUND" };
    }
  },

  // Get User by Email
  getUserByEmail: async (email) => {
    try {
      return await cognitoService.getUserById(email);
    } catch (error) {
      throw { message: "User not found", code: "USER_NOT_FOUND" };
    }
  },

  // Get All Users
  getAllUsers: async () => {
    try {
      const params = { UserPoolId: USER_POOL_ID };
      const command = new ListUsersCommand(params);
      const response = await cognitoClient.send(command);

      return response.Users.map((user) => {
        const attributes = {};
        user.Attributes.forEach((attr) => {
          attributes[attr.Name] = attr.Value;
        });

        // Check if user is super admin from hardcoded list
        const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(attributes.email.toLowerCase());

        return {
          user_id: user.Username,
          email: attributes.email,
          first_name: attributes.given_name || "",
          last_name: attributes.family_name || "",
          date_of_birth: attributes.birthdate || "",
          phone_number: attributes.phone_number || "",
          is_super_admin: isSuperAdmin,
          created_at: user.UserCreateDate,
          status: user.UserStatus, // CONFIRMED, UNCONFIRMED, etc.
        };
      });
    } catch (error) {
      console.error("Get all users error:", error);
      throw { message: "Failed to get users", code: "GET_USERS_ERROR" };
    }
  },

  // Check if user is Super Admin
isSuperAdmin: async (userId) => {
  try {
    console.log("🔍 [isSuperAdmin] Checking userId:", userId);
    
    const user = await cognitoService.getUserById(userId);
    console.log("🔍 [isSuperAdmin] User found:", user.email);
    console.log("🔍 [isSuperAdmin] Super admin list:", SUPER_ADMIN_EMAILS);
    console.log("🔍 [isSuperAdmin] Email lowercase:", user.email.toLowerCase());
    console.log("🔍 [isSuperAdmin] Is in list?:", SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase()));
    
    const result = SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase());
    console.log(`🔍 [isSuperAdmin] Final result: ${result}`);
    
    return result;
  } catch (error) {
    console.error("❌ [isSuperAdmin] Error:", error);
    return false;
  }
},

  // Add email to super admin list (for demo purposes)
  addSuperAdmin: (email) => {
    const normalizedEmail = email.toLowerCase();
    if (!SUPER_ADMIN_EMAILS.includes(normalizedEmail)) {
      SUPER_ADMIN_EMAILS.push(normalizedEmail);
      console.log(`✅ Added ${email} to super admin list`);
      return true;
    }
    return false;
  },

  // Remove email from super admin list
  removeSuperAdmin: (email) => {
    const normalizedEmail = email.toLowerCase();
    const index = SUPER_ADMIN_EMAILS.indexOf(normalizedEmail);
    if (index > -1) {
      SUPER_ADMIN_EMAILS.splice(index, 1);
      console.log(`✅ Removed ${email} from super admin list`);
      return true;
    }
    return false;
  },

  // Get list of super admins
  getSuperAdminList: () => {
    return [...SUPER_ADMIN_EMAILS];
  },

  // Promote user to Super Admin (just adds to list)
  promoteToSuperAdmin: async (userId) => {
    try {
      const user = await cognitoService.getUserById(userId);
      cognitoService.addSuperAdmin(user.email);
      
      return {
        success: true,
        message: `${user.email} promoted to super admin successfully`,
      };
    } catch (error) {
      console.error("Promote user error:", error);
      throw { message: "Failed to promote user", code: "PROMOTE_ERROR" };
    }
  },

  // Delete User (Admin)
  deleteUser: async (userId) => {
    try {
      const params = {
        UserPoolId: USER_POOL_ID,
        Username: userId,
      };

      const command = new AdminDeleteUserCommand(params);
      await cognitoClient.send(command);

      return {
        success: true,
        message: "User deleted successfully",
      };
    } catch (error) {
      console.error("Delete user error:", error);
      throw { message: "Failed to delete user", code: "DELETE_ERROR" };
    }
  },
};

// Log super admin configuration on startup
console.log("🔐 Super Admin Configuration:");
console.log(`   Super Admins: ${SUPER_ADMIN_EMAILS.join(", ")}`);

module.exports = { cognitoService, cognitoClient, computeSecretHash };
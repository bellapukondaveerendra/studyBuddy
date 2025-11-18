// backend/services/cognito.js
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

// Helper function to compute secret hash
const computeSecretHash = (username) => {
  const secretKey = process.env.COGNITO_CLIENT_SECRET;
  if (!secretKey) return undefined;
  
  return crypto
    .createHmac("SHA256", secretKey)
    .update(username + CLIENT_ID)
    .digest("base64");
};

const cognitoService = {
  // Sign Up User
  signUp: async (email, password, firstName, lastName, dateOfBirth, phoneNumber) => {
    try {
      const params = {
        ClientId: CLIENT_ID,
        Username: email,
        Password: password,
        UserAttributes: [
          { Name: "email", Value: email },
          { Name: "given_name", Value: firstName },
          { Name: "family_name", Value: lastName },
          { Name: "birthdate", Value: dateOfBirth },
          ...(phoneNumber ? [{ Name: "phone_number", Value: phoneNumber }] : []),
          { Name: "custom:is_super_admin", Value: "false" },
        ],
        SecretHash: computeSecretHash(email),
      };

      const command = new SignUpCommand(params);
      const response = await cognitoClient.send(command);

      return {
        success: true,
        user_id: response.UserSub,
        email: email,
        first_name: firstName,
        last_name: lastName,
        date_of_birth: dateOfBirth,
        phone_number: phoneNumber,
        is_super_admin: false,
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
          SECRET_HASH: computeSecretHash(email),
        },
      };

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

      return {
        user_id: response.Username,
        email: attributes.email,
        first_name: attributes.given_name || "",
        last_name: attributes.family_name || "",
        date_of_birth: attributes.birthdate || "",
        phone_number: attributes.phone_number || "",
        is_super_admin: attributes["custom:is_super_admin"] === "true",
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

      return {
        user_id: response.Username,
        email: attributes.email,
        first_name: attributes.given_name || "",
        last_name: attributes.family_name || "",
        date_of_birth: attributes.birthdate || "",
        phone_number: attributes.phone_number || "",
        is_super_admin: attributes["custom:is_super_admin"] === "true",
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

        return {
          user_id: user.Username,
          email: attributes.email,
          first_name: attributes.given_name || "",
          last_name: attributes.family_name || "",
          date_of_birth: attributes.birthdate || "",
          phone_number: attributes.phone_number || "",
          is_super_admin: attributes["custom:is_super_admin"] === "true",
          created_at: user.UserCreateDate,
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
      const user = await cognitoService.getUserById(userId);
      return user.is_super_admin;
    } catch (error) {
      return false;
    }
  },

  // Promote user to Super Admin
  promoteToSuperAdmin: async (userId) => {
    try {
      const params = {
        UserPoolId: USER_POOL_ID,
        Username: userId,
        UserAttributes: [
          {
            Name: "custom:is_super_admin",
            Value: "true",
          },
        ],
      };

      const command = new AdminUpdateUserAttributesCommand(params);
      await cognitoClient.send(command);

      return {
        success: true,
        message: "User promoted to super admin successfully",
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

module.exports = { cognitoService };
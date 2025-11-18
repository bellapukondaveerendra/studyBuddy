// backend/scripts/createSuperAdmin.js
require('dotenv').config();

const {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminUpdateUserAttributesCommand,
} = require("@aws-sdk/client-cognito-identity-provider");

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;

// Super Admin Details - CHANGE THESE IF NEEDED
const SUPER_ADMIN = {
  email: "ccproj2025@gmail.com",
  password: "Veeru@123",
  firstName: "Super",
  lastName: "Admin",
  dateOfBirth: "1990-01-01",
};

async function createSuperAdmin() {
  console.log("=".repeat(60));
  console.log("   Create Super Admin User in Cognito");
  console.log("=".repeat(60) + "\n");

  console.log("📋 Super Admin Details:");
  console.log(`   Email: ${SUPER_ADMIN.email}`);
  console.log(`   Password: ${SUPER_ADMIN.password}`);
  console.log(`   Name: ${SUPER_ADMIN.firstName} ${SUPER_ADMIN.lastName}\n`);

  try {
    // Step 1: Create User
    console.log("📝 Step 1: Creating user in Cognito...");
    
    const createParams = {
      UserPoolId: USER_POOL_ID,
      Username: SUPER_ADMIN.email,
      UserAttributes: [
        { Name: "email", Value: SUPER_ADMIN.email },
        { Name: "email_verified", Value: "true" }, // Skip email verification
        { Name: "given_name", Value: SUPER_ADMIN.firstName },
        { Name: "family_name", Value: SUPER_ADMIN.lastName },
        { Name: "birthdate", Value: SUPER_ADMIN.dateOfBirth },
      ],
      MessageAction: "SUPPRESS", // Don't send welcome email
    };

    const createCommand = new AdminCreateUserCommand(createParams);
    const createResult = await cognitoClient.send(createCommand);
    
    console.log("✅ User created successfully!");
    console.log(`   User Sub: ${createResult.User.Username}`);
    console.log(`   Status: ${createResult.User.UserStatus}`);

    // Step 2: Set Permanent Password
    console.log("\n🔐 Step 2: Setting permanent password...");
    
    const passwordParams = {
      UserPoolId: USER_POOL_ID,
      Username: SUPER_ADMIN.email,
      Password: SUPER_ADMIN.password,
      Permanent: true, // Make it permanent (no password change required)
    };

    const passwordCommand = new AdminSetUserPasswordCommand(passwordParams);
    await cognitoClient.send(passwordCommand);
    
    console.log("✅ Password set successfully!");

    // Step 3: Mark user as confirmed
    console.log("\n✅ Step 3: User is already confirmed (email_verified = true)");

    console.log("\n" + "=".repeat(60));
    console.log("🎉 Super Admin Created Successfully!");
    console.log("=".repeat(60) + "\n");

    console.log("📋 Login Credentials:");
    console.log(`   Email: ${SUPER_ADMIN.email}`);
    console.log(`   Password: ${SUPER_ADMIN.password}`);
    
    console.log("\n💡 Next Steps:");
    console.log("   1. Go to your frontend login page");
    console.log("   2. Login with the credentials above");
    console.log("   3. You should have super admin access!");

    console.log("\n🔍 Verify in AWS Console:");
    console.log("   https://console.aws.amazon.com/cognito/");
    console.log("   → User Pools → Your Pool → Users");
    console.log(`   → Look for ${SUPER_ADMIN.email}\n`);

  } catch (error) {
    console.error("\n❌ Error creating super admin:", error);
    
    if (error.name === "UsernameExistsException") {
      console.log("\n⚠️  User already exists!");
      console.log("   This means the user is already created.");
      console.log("\n💡 Options:");
      console.log("   1. Try logging in with existing credentials");
      console.log("   2. Delete user in AWS Console and run this script again");
      console.log("   3. Reset password in AWS Console\n");
    } else {
      console.log("\n💡 Common Issues:");
      console.log("   - Check your AWS credentials in .env");
      console.log("   - Verify COGNITO_USER_POOL_ID is correct");
      console.log("   - Check IAM permissions (need cognito-idp:AdminCreateUser)\n");
    }
    
    process.exit(1);
  }
}

// Run the script
console.log("Starting...\n");

createSuperAdmin()
  .then(() => {
    console.log("✅ Script completed successfully!\n");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
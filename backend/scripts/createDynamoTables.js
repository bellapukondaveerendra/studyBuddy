// backend/scripts/createDynamoTables.js
require('dotenv').config();

const {
  DynamoDBClient,
  CreateTableCommand,
  ListTablesCommand,
  DescribeTableCommand,
} = require("@aws-sdk/client-dynamodb");

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});

// Table names from .env or defaults
const TABLES = {
  GROUPS: process.env.DYNAMODB_GROUPS_TABLE || "StudyBuddy-Groups",
  MEMBERS: process.env.DYNAMODB_MEMBERS_TABLE || "StudyBuddy-GroupMembers",
  JOIN_REQUESTS: process.env.DYNAMODB_JOIN_REQUESTS_TABLE || "StudyBuddy-JoinRequests",
  INVITATIONS: process.env.DYNAMODB_INVITATIONS_TABLE || "StudyBuddy-Invitations",
  DISCUSSIONS: process.env.DYNAMODB_DISCUSSIONS_TABLE || "StudyBuddy-Discussions",
  NOTES: process.env.DYNAMODB_NOTES_TABLE || "StudyBuddy-Notes",
};

// Table configurations
const tableConfigs = [
  {
    TableName: TABLES.GROUPS,
    KeySchema: [
      { AttributeName: "group_id", KeyType: "HASH" }, // Partition key
    ],
    AttributeDefinitions: [
      { AttributeName: "group_id", AttributeType: "S" },
      { AttributeName: "status", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "StatusIndex",
        KeySchema: [
          { AttributeName: "status", KeyType: "HASH" },
        ],
        Projection: {
          ProjectionType: "ALL",
        },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      },
    ],
    BillingMode: "PROVISIONED",
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5,
    },
  },
  {
    TableName: TABLES.MEMBERS,
    KeySchema: [
      { AttributeName: "group_id", KeyType: "HASH" }, // Partition key
      { AttributeName: "user_id", KeyType: "RANGE" }, // Sort key
    ],
    AttributeDefinitions: [
      { AttributeName: "group_id", AttributeType: "S" },
      { AttributeName: "user_id", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "UserIdIndex",
        KeySchema: [
          { AttributeName: "user_id", KeyType: "HASH" },
        ],
        Projection: {
          ProjectionType: "ALL",
        },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      },
    ],
    BillingMode: "PROVISIONED",
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5,
    },
  },
  {
    TableName: TABLES.JOIN_REQUESTS,
    KeySchema: [
      { AttributeName: "request_id", KeyType: "HASH" }, // Partition key
    ],
    AttributeDefinitions: [
      { AttributeName: "request_id", AttributeType: "S" },
      { AttributeName: "group_id", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "GroupIdIndex",
        KeySchema: [
          { AttributeName: "group_id", KeyType: "HASH" },
        ],
        Projection: {
          ProjectionType: "ALL",
        },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      },
    ],
    BillingMode: "PROVISIONED",
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5,
    },
  },
  {
    TableName: TABLES.INVITATIONS,
    KeySchema: [
      { AttributeName: "invitation_token", KeyType: "HASH" }, // Partition key
    ],
    AttributeDefinitions: [
      { AttributeName: "invitation_token", AttributeType: "S" },
      { AttributeName: "group_id", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "GroupIdIndex",
        KeySchema: [
          { AttributeName: "group_id", KeyType: "HASH" },
        ],
        Projection: {
          ProjectionType: "ALL",
        },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      },
    ],
    BillingMode: "PROVISIONED",
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5,
    },
  },
  {
    TableName: TABLES.DISCUSSIONS,
    KeySchema: [
      { AttributeName: "group_id", KeyType: "HASH" }, // Partition key
    ],
    AttributeDefinitions: [
      { AttributeName: "group_id", AttributeType: "S" },
    ],
    BillingMode: "PROVISIONED",
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5,
    },
  },
  {
    TableName: TABLES.NOTES,
    KeySchema: [
      { AttributeName: "user_id", KeyType: "HASH" }, // Partition key
      { AttributeName: "group_id", KeyType: "RANGE" }, // Sort key
    ],
    AttributeDefinitions: [
      { AttributeName: "user_id", AttributeType: "S" },
      { AttributeName: "group_id", AttributeType: "S" },
    ],
    BillingMode: "PROVISIONED",
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5,
    },
  },
];

// Helper function to check if table exists
async function tableExists(tableName) {
  try {
    const command = new DescribeTableCommand({ TableName: tableName });
    await dynamoClient.send(command);
    return true;
  } catch (error) {
    if (error.name === "ResourceNotFoundException") {
      return false;
    }
    throw error;
  }
}

// Create a single table
async function createTable(config) {
  try {
    console.log(`\n📝 Creating table: ${config.TableName}...`);
    
    // Check if table already exists
    const exists = await tableExists(config.TableName);
    if (exists) {
      console.log(`✅ Table ${config.TableName} already exists. Skipping...`);
      return;
    }

    const command = new CreateTableCommand(config);
    await dynamoClient.send(command);
    
    console.log(`✅ Table ${config.TableName} created successfully!`);
    console.log(`   Waiting for table to become active...`);
    
    // Wait for table to be active
    let isActive = false;
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds timeout
    
    while (!isActive && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      
      try {
        const describeCommand = new DescribeTableCommand({ TableName: config.TableName });
        const response = await dynamoClient.send(describeCommand);
        
        if (response.Table.TableStatus === "ACTIVE") {
          isActive = true;
          console.log(`✅ Table ${config.TableName} is now ACTIVE!`);
        }
      } catch (error) {
        // Table not ready yet, continue waiting
      }
      
      attempts++;
    }
    
    if (!isActive) {
      console.log(`⚠️  Table ${config.TableName} created but may not be active yet. Please check AWS Console.`);
    }
    
  } catch (error) {
    console.error(`❌ Error creating table ${config.TableName}:`, error.message);
    throw error;
  }
}

// Main function to create all tables
async function createAllTables() {
  console.log("🚀 Starting DynamoDB table creation...\n");
  console.log("📊 Configuration:");
  console.log(`   Region: ${process.env.AWS_REGION || "us-east-1"}`);
  console.log(`   Tables to create: ${tableConfigs.length}\n`);
  
  try {
    // List existing tables
    const listCommand = new ListTablesCommand({});
    const existingTables = await dynamoClient.send(listCommand);
    console.log(`📋 Existing tables: ${existingTables.TableNames.length}`);
    if (existingTables.TableNames.length > 0) {
      console.log(`   ${existingTables.TableNames.join(", ")}\n`);
    }
    
    // Create tables sequentially (to avoid rate limiting)
    for (const config of tableConfigs) {
      await createTable(config);
    }
    
    console.log("\n" + "=".repeat(60));
    console.log("🎉 All tables created successfully!");
    console.log("=".repeat(60) + "\n");
    
    console.log("📋 Created Tables:");
    console.log(`   ✅ ${TABLES.GROUPS} - Study Groups`);
    console.log(`   ✅ ${TABLES.MEMBERS} - Group Members`);
    console.log(`   ✅ ${TABLES.JOIN_REQUESTS} - Join Requests`);
    console.log(`   ✅ ${TABLES.INVITATIONS} - Group Invitations`);
    console.log(`   ✅ ${TABLES.DISCUSSIONS} - Group Discussions`);
    console.log(`   ✅ ${TABLES.NOTES} - User Notes`);
    
    console.log("\n💡 Next Steps:");
    console.log("   1. Update your .env file with table names (if not already done)");
    console.log("   2. Restart your backend server: npm run dev");
    console.log("   3. Try creating a study group!");
    
    console.log("\n💰 Cost Information:");
    console.log("   - All tables use PROVISIONED billing (5 RCU, 5 WCU)");
    console.log("   - This is within AWS Free Tier (25 RCU, 25 WCU total)");
    console.log("   - Cost: $0/month for the first 12 months");
    
    console.log("\n🔍 Verify in AWS Console:");
    console.log("   https://console.aws.amazon.com/dynamodb/home");
    
  } catch (error) {
    console.error("\n❌ Error during table creation:", error);
    process.exit(1);
  }
}

// Run the script
console.log("=".repeat(60));
console.log("   StudyBuddy - DynamoDB Table Creation Script");
console.log("=".repeat(60) + "\n");

createAllTables()
  .then(() => {
    console.log("\n✅ Script completed successfully!\n");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });
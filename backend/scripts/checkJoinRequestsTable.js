require('dotenv').config();
const { DynamoDBClient, DescribeTableCommand, ScanCommand } = require('@aws-sdk/client-dynamodb');
const { unmarshall } = require('@aws-sdk/util-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-1' });

async function checkTable() {
  try {
    // Check table structure
    const describeCommand = new DescribeTableCommand({
      TableName: 'StudyBuddy-JoinRequests'
    });
    
    const tableInfo = await client.send(describeCommand);
    
    console.log('📋 Table Structure:');
    console.log('Keys:', JSON.stringify(tableInfo.Table.KeySchema, null, 2));
    console.log('\n📊 Global Secondary Indexes:');
    console.log(JSON.stringify(tableInfo.Table.GlobalSecondaryIndexes, null, 2));
    
    // Scan all join requests to see what's in the table
    const scanCommand = new ScanCommand({
      TableName: 'StudyBuddy-JoinRequests'
    });
    
    const scanResult = await client.send(scanCommand);
    
    console.log('\n📝 All Join Requests in Table:');
    console.log('Count:', scanResult.Items?.length || 0);
    
    if (scanResult.Items && scanResult.Items.length > 0) {
      scanResult.Items.forEach(item => {
        const unmarshalled = unmarshall(item);
        console.log('\n  Request:', JSON.stringify(unmarshalled, null, 2));
      });
    } else {
      console.log('  No join requests found in table!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkTable();
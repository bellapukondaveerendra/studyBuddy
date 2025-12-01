// scripts/setup-s3-cors.js
require('dotenv').config();
const { S3Client, PutBucketCorsCommand } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'studybuddy-resources';

const corsConfiguration = {
  CORSRules: [
    {
      AllowedHeaders: ['*'],
      AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
      AllowedOrigins: [
        'http://localhost:3000',
        'http://localhost:5000',
        'http://localhost:5001',
        'http://44.222.102.46',
        'http://44.222.102.46:5000',
      ],
      ExposeHeaders: ['ETag', 'x-amz-meta-custom-header'],
      MaxAgeSeconds: 3000,
    },
  ],
};

async function setupCORS() {
  try {
    console.log(`Setting up CORS for bucket: ${BUCKET_NAME}`);
    
    const command = new PutBucketCorsCommand({
      Bucket: BUCKET_NAME,
      CORSConfiguration: corsConfiguration,
    });

    await s3Client.send(command);
    
    console.log('✅ CORS configuration applied successfully!');
    console.log('\nCORS Rules:');
    console.log(JSON.stringify(corsConfiguration, null, 2));
  } catch (error) {
    console.error('❌ Error setting up CORS:', error);
    process.exit(1);
  }
}

setupCORS();
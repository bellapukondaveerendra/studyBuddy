#!/bin/bash

# ========================================
# StudyBuddy EC2 Deployment Script
# ========================================

set -e  # Exit on any error

echo "🚀 Starting StudyBuddy Deployment to EC2..."
echo "============================================"

# Configuration
EC2_USER="ec2-user"  # Change if using Ubuntu: "ubuntu"
EC2_HOST="44.222.102.46"
EC2_KEY="/Users/veerustark/personal_projects/studyBuddy/group9-aws-keypair.pem"  # ⚠️ UPDATE THIS PATH
REMOTE_DIR="/home/ec2-user/studybuddy"
REPO_URL="https://github.com/bellapukondaveerendra/studyBuddy"  # ⚠️ UPDATE THIS

echo "📦 Step 1: Building React frontend locally..."
npm run build

echo "✅ Build complete!"
echo ""

echo "📤 Step 2: Connecting to EC2 and setting up..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" << 'ENDSSH'

echo "🔧 Installing system dependencies..."
# Update system
sudo yum update -y

# Install Node.js 18.x (LTS)
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Install Git
sudo yum install -y git

# Install PM2 globally
sudo npm install -g pm2

echo "✅ System dependencies installed!"

ENDSSH

echo ""
echo "📂 Step 3: Cloning/Updating repository on EC2..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" << ENDSSH

# Remove old directory if exists
if [ -d "$REMOTE_DIR" ]; then
    echo "🗑️  Removing old directory..."
    rm -rf $REMOTE_DIR
fi

# Clone fresh repository
echo "📥 Cloning repository..."
git clone $REPO_URL $REMOTE_DIR

cd $REMOTE_DIR

echo "✅ Repository cloned!"

ENDSSH

echo ""
echo "📤 Step 4: Uploading build files and .env..."

# Upload build folder
scp -i "$EC2_KEY" -r build "$EC2_USER@$EC2_HOST:$REMOTE_DIR/"

# Upload .env file
scp -i "$EC2_KEY" .env "$EC2_USER@$EC2_HOST:$REMOTE_DIR/"
scp -i "$EC2_KEY" backend/.env "$EC2_USER@$EC2_HOST:$REMOTE_DIR/backend/"

echo "✅ Files uploaded!"

echo ""
echo "📦 Step 5: Installing dependencies on EC2..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" << ENDSSH

cd $REMOTE_DIR

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install --production

cd ..

echo "✅ Dependencies installed!"

ENDSSH

echo ""
echo "🚀 Step 6: Starting application with PM2..."
ssh -i "$EC2_KEY" "$EC2_USER@$EC2_HOST" << ENDSSH

cd $REMOTE_DIR/backend

# Stop existing PM2 process if running
pm2 stop studybuddy || true
pm2 delete studybuddy || true

# Start application
pm2 start server.js --name studybuddy

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system reboot
pm2 startup | tail -n 1 | sudo bash

echo "✅ Application started with PM2!"

ENDSSH

echo ""
echo "============================================"
echo "✅ DEPLOYMENT COMPLETE!"
echo "============================================"
echo ""
echo "🌐 Your application is now running at:"
echo "   http://44.222.102.46:5000"
echo ""
echo "📊 Useful commands (run on EC2):"
echo "   pm2 status              - Check app status"
echo "   pm2 logs studybuddy     - View logs"
echo "   pm2 restart studybuddy  - Restart app"
echo "   pm2 stop studybuddy     - Stop app"
echo ""
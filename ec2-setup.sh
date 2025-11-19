#!/bin/bash

# ========================================
# One-Time EC2 Server Setup
# Run this ONCE on your EC2 instance
# ========================================

echo "🔧 Setting up EC2 instance..."

# Update system
sudo yum update -y

# Install Node.js 18.x
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Install Git
sudo yum install -y git

# Install PM2
sudo npm install -g pm2

# Configure firewall (if needed)
sudo firewall-cmd --permanent --add-port=5000/tcp || true
sudo firewall-cmd --reload || true

echo "✅ EC2 setup complete!"
echo "📝 Next: Run deploy-to-ec2.sh from your local machine"
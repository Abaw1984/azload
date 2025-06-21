#!/bin/bash

# AZLOAD Server Setup Script (No Sudo Version)
# For DigitalOcean Ubuntu 22.04 LTS

echo "🚀 Starting AZLOAD Server Setup (No Sudo Version)..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "❌ This script must be run as root. Please run: su - root"
  echo "Or login as root user directly"
  exit 1
fi

# Update system packages
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install essential packages
echo "🔧 Installing essential packages..."
apt install -y curl wget git build-essential software-properties-common

# Install Node.js using multiple methods to ensure success
echo "📦 Installing Node.js and npm..."

# Method 1: Install from Ubuntu repository first
apt install -y nodejs npm

# Method 2: Install latest Node.js using NodeSource
echo "📦 Installing latest Node.js from NodeSource..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Method 3: Manual installation if others fail
if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
    echo "📦 Fallback: Manual Node.js installation..."
    cd /tmp
    wget https://nodejs.org/dist/v18.19.0/node-v18.19.0-linux-x64.tar.xz
    tar -xf node-v18.19.0-linux-x64.tar.xz
    cp -r node-v18.19.0-linux-x64/* /usr/local/
    
    # Update PATH immediately
    export PATH="/usr/local/bin:$PATH"
    echo 'export PATH="/usr/local/bin:$PATH"' >> ~/.bashrc
    echo 'export PATH="/usr/local/bin:$PATH"' >> /etc/environment
fi

# Ensure PATH includes Node.js locations
export PATH="/usr/local/bin:/usr/bin:$PATH"
echo 'export PATH="/usr/local/bin:/usr/bin:$PATH"' >> ~/.bashrc
echo 'export PATH="/usr/local/bin:/usr/bin:$PATH"' >> /etc/environment

# Source the updated PATH
source ~/.bashrc 2>/dev/null || true

# Verify Node.js installation
echo "✅ Node.js version: $(node --version)"
echo "✅ NPM version: $(npm --version)"

# Install Python and pip
echo "🐍 Installing Python..."
apt install -y python3 python3-pip python3-venv

# Install Nginx
echo "🌐 Installing Nginx..."
apt install -y nginx

# Install PM2 globally
echo "⚡ Installing PM2..."
npm install -g pm2

# Create application directory
echo "📁 Creating application directory..."
mkdir -p /opt/azload
cd /opt/azload

# Clone repository (you'll need to replace with your repo URL)
echo "📥 Ready to clone repository..."
echo "Run: git clone YOUR_REPO_URL ."

echo "✅ Server setup complete!"
echo "Next steps:"
echo "1. Clone your repository: git clone YOUR_REPO_URL ."
echo "2. Install dependencies: npm install"
echo "3. Set up Python environment: python3 -m venv venv && source venv/bin/activate"
echo "4. Install Python requirements: pip install -r ml_pipeline/requirements.txt"

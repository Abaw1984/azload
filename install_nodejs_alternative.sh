#!/bin/bash

# Comprehensive Node.js Installation Methods

echo "🔧 Comprehensive Node.js installation with PATH fixes..."

# First, ensure we have curl and wget
apt update
apt install -y curl wget

# Method 1: Using Ubuntu repository
echo "📦 Method 1: Using Ubuntu repository..."
apt install -y nodejs npm

# Method 2: Using NodeSource repository (corrected)
echo "📦 Method 2: Using NodeSource repository..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Method 3: Using snap (if available)
echo "📦 Method 3: Trying snap installation..."
if command -v snap >/dev/null 2>&1; then
    snap install node --classic
    echo "✅ Node.js installed via snap"
else
    echo "⚠️ Snap not available"
fi

# Method 4: Download and install manually
echo "📦 Method 4: Manual installation..."
cd /tmp
wget https://nodejs.org/dist/v18.19.0/node-v18.19.0-linux-x64.tar.xz
tar -xf node-v18.19.0-linux-x64.tar.xz
cp -r node-v18.19.0-linux-x64/* /usr/local/

# Critical: Fix PATH for all methods
echo "🔧 Fixing PATH variables..."
export PATH="/usr/local/bin:/usr/bin:/snap/bin:$PATH"
echo 'export PATH="/usr/local/bin:/usr/bin:/snap/bin:$PATH"' >> ~/.bashrc
echo 'export PATH="/usr/local/bin:/usr/bin:/snap/bin:$PATH"' >> /etc/environment

# Create symlinks if needed
if [ -f "/usr/local/bin/node" ] && [ ! -f "/usr/bin/node" ]; then
    ln -sf /usr/local/bin/node /usr/bin/node
fi
if [ -f "/usr/local/bin/npm" ] && [ ! -f "/usr/bin/npm" ]; then
    ln -sf /usr/local/bin/npm /usr/bin/npm
fi

# Source the updated environment
source ~/.bashrc 2>/dev/null || true
source /etc/environment 2>/dev/null || true

# Verify installation
echo "✅ Checking Node.js installation..."
node --version || echo "❌ Node.js not found"
npm --version || echo "❌ NPM not found"

echo "🎯 Node.js installation attempts complete"

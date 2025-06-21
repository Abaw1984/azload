#!/bin/bash

# Quick NPM Fix Script
# Run this if npm is still not found

echo "🚀 Quick NPM Fix - Installing and configuring Node.js/npm..."

# Install npm directly from Ubuntu repository
echo "📦 Installing npm from Ubuntu repository..."
apt update
apt install -y npm nodejs

# Install Node.js from NodeSource
echo "📦 Installing Node.js from NodeSource..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Update PATH immediately
echo "🔧 Updating PATH..."
export PATH="/usr/local/bin:/usr/bin:/snap/bin:$PATH"
echo 'export PATH="/usr/local/bin:/usr/bin:/snap/bin:$PATH"' >> ~/.bashrc
echo 'export PATH="/usr/local/bin:/usr/bin:/snap/bin:$PATH"' >> /etc/environment

# Reload environment
source ~/.bashrc 2>/dev/null || true
hash -r

# Test installations
echo "✅ Testing installations..."
if command -v node >/dev/null 2>&1; then
    echo "✅ Node.js version: $(node --version)"
else
    echo "❌ Node.js still not found"
fi

if command -v npm >/dev/null 2>&1; then
    echo "✅ NPM version: $(npm --version)"
else
    echo "❌ NPM still not found"
    echo "🔧 Creating symlinks..."
    
    # Find and create symlinks
    find /usr -name "npm" -type f 2>/dev/null | head -1 | xargs -I {} ln -sf {} /usr/bin/npm
    find /usr -name "node" -type f 2>/dev/null | head -1 | xargs -I {} ln -sf {} /usr/bin/node
fi

echo "🎯 Quick fix complete! Try running 'npm --version' now."
echo "If it still doesn't work, run: hash -r && source ~/.bashrc"

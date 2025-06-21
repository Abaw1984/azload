#!/bin/bash

# Environment Fix Script for DigitalOcean Droplet

echo "🔍 Checking current environment..."

# Check current user
echo "Current user: $(whoami)"
echo "User ID: $(id -u)"
echo "Groups: $(groups)"

# Check if sudo exists
if command -v sudo >/dev/null 2>&1; then
    echo "✅ sudo command found"
else
    echo "❌ sudo command not found"
    echo "Installing sudo..."
    apt update && apt install -y sudo
fi

# Check PATH
echo "Current PATH: $PATH"

# Fix PATH comprehensively
echo "🔧 Fixing PATH for Node.js and npm..."
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/snap/bin"
echo 'export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/snap/bin"' >> ~/.bashrc
echo 'export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/snap/bin"' >> /etc/environment

# Check for Node.js installations in common locations
echo "🔍 Checking for Node.js installations..."
for location in "/usr/bin" "/usr/local/bin" "/snap/bin"; do
    if [ -f "$location/node" ]; then
        echo "✅ Found node at: $location/node"
    fi
    if [ -f "$location/npm" ]; then
        echo "✅ Found npm at: $location/npm"
    fi
done

# Create symlinks if Node.js exists but not in standard location
if command -v node >/dev/null 2>&1; then
    NODE_PATH=$(which node)
    echo "Node.js found at: $NODE_PATH"
    if [ "$NODE_PATH" != "/usr/bin/node" ]; then
        ln -sf "$NODE_PATH" /usr/bin/node
    fi
fi

if command -v npm >/dev/null 2>&1; then
    NPM_PATH=$(which npm)
    echo "npm found at: $NPM_PATH"
    if [ "$NPM_PATH" != "/usr/bin/npm" ]; then
        ln -sf "$NPM_PATH" /usr/bin/npm
    fi
fi

# Source the updated environment
source ~/.bashrc 2>/dev/null || true

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo "✅ Running as root - can proceed with installation"
else
    echo "⚠️ Not running as root"
    echo "To become root, run: su - root"
    echo "Or use: sudo -i"
fi

echo "🎯 Environment check complete"

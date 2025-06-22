#!/bin/bash

# Production Docker ML Pipeline Setup Script
# This script sets up the production-ready ML pipeline for AZLOAD

set -e

echo "🐳 Setting up Production ML Pipeline..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Installing Docker..."
    
    # Remove conflicting packages
    sudo apt remove containerd docker.io -y || true
    sudo apt autoremove -y
    
    # Install Docker from official repository
    sudo apt install ca-certificates curl gnupg lsb-release -y
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt update
    sudo apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin -y
    sudo usermod -aG docker $USER
    
    echo "✅ Docker installed successfully"
else
    echo "✅ Docker is already installed"
fi

# Check for Docker Compose
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose not found. Installing..."
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose installed successfully"
fi

# Create application directory
echo "📁 Setting up application directory..."
sudo mkdir -p /opt/azload-ml
sudo chown $USER:$USER /opt/azload-ml
cd /opt/azload-ml

# Copy deployment files
echo "📋 Setting up deployment files..."
cp -r ../deployment/* .

# Create required directories
echo "📁 Creating required directories..."
mkdir -p uploads models logs ssl ml_pipeline

# Set proper permissions
chmod 755 uploads models logs
chmod +x deploy.sh

# Generate environment file
echo "🔐 Generating environment configuration..."
if [ ! -f .env ]; then
    SECRET_KEY=$(openssl rand -hex 32 2>/dev/null || echo "fallback_secret_key_$(date +%s)")
    cat > .env << EOF
SECRET_KEY=${SECRET_KEY}
ENVIRONMENT=production
DATABASE_URL=postgresql://azload:password@localhost/azload
REDIS_URL=redis://localhost:6379
EOF
    echo "✅ Environment file created"
fi

# Build and test the ML API
echo "🏗️ Building ML API Docker image..."
docker build -f Dockerfile.ml -t azload-ml-api .

# Test the API
echo "🧪 Testing ML API..."
docker run --rm -d --name test-ml-api -p 8001:8000 azload-ml-api
sleep 10

if curl -f http://localhost:8001/health > /dev/null 2>&1; then
    echo "✅ ML API test successful"
    docker stop test-ml-api
else
    echo "❌ ML API test failed"
    docker stop test-ml-api || true
    exit 1
fi

# Setup firewall rules
echo "🔥 Configuring firewall..."
sudo ufw allow 8000/tcp || echo "UFW not available, skipping firewall setup"
sudo ufw allow 80/tcp || true
sudo ufw allow 443/tcp || true

echo "✅ Production ML Pipeline setup completed!"
echo ""
echo "🚀 To deploy the full stack:"
echo "  ./deploy.sh production"
echo ""
echo "📋 Available services:"
echo "  ML API: http://localhost:8000"
echo "  Health Check: http://localhost:8000/health"
echo "  API Docs: http://localhost:8000/docs"
echo ""
echo "🔧 Management commands:"
echo "  docker-compose logs -f     # View logs"
echo "  docker-compose down        # Stop services"
echo "  docker-compose restart     # Restart services"
echo ""
echo "🎉 Ready for production deployment!"

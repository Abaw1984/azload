#!/bin/bash

# Production Deployment Script for AZLOAD ML Pipeline
# Usage: ./deploy.sh [environment]

set -e

ENVIRONMENT=${1:-production}
DOCKER_IMAGE="azload-ml-api"
CONTAINER_NAME="azload-ml-production"

echo "🚀 Deploying AZLOAD ML Pipeline to ${ENVIRONMENT}..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose not found. Please install Docker Compose first."
    exit 1
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p uploads models logs ssl

# Set permissions
chmod 755 uploads models logs

# Generate secret key if not exists
if [ ! -f .env ]; then
    echo "🔐 Generating environment configuration..."
    SECRET_KEY=$(openssl rand -hex 32)
    cat > .env << EOF
SECRET_KEY=${SECRET_KEY}
ENVIRONMENT=${ENVIRONMENT}
DATABASE_URL=postgresql://user:password@localhost/azload
REDIS_URL=redis://localhost:6379
EOF
    echo "✅ Environment file created"
fi

# Build and deploy with Docker Compose
echo "🏗️ Building and starting services..."
if command -v docker-compose &> /dev/null; then
    docker-compose down --remove-orphans
    docker-compose build --no-cache
    docker-compose up -d
else
    docker compose down --remove-orphans
    docker compose build --no-cache
    docker compose up -d
fi

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Health check
echo "🏥 Performing health check..."
for i in {1..30}; do
    if curl -f http://localhost:8000/health > /dev/null 2>&1; then
        echo "✅ ML API is healthy"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Health check failed after 30 attempts"
        exit 1
    fi
    echo "Attempt $i/30: Waiting for ML API..."
    sleep 2
done

# Display deployment information
echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Service Information:"
echo "  ML API: http://localhost:8000"
echo "  Health Check: http://localhost:8000/health"
echo "  API Documentation: http://localhost:8000/docs"
echo ""
echo "🔧 Management Commands:"
echo "  View logs: docker-compose logs -f"
echo "  Stop services: docker-compose down"
echo "  Restart: docker-compose restart"
echo ""
echo "🔐 Default Credentials:"
echo "  Username: admin"
echo "  Password: adminpassword"
echo ""
echo "⚠️  Remember to:"
echo "  1. Change default credentials"
echo "  2. Configure SSL certificates"
echo "  3. Set up proper database"
echo "  4. Configure monitoring"
echo ""

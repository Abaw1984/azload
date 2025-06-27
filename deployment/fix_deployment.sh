#!/bin/bash
set -e

echo "🔧 Fixing ML API Deployment Issues..."

# Make scripts executable
chmod +x deploy.sh
chmod +x docker-entrypoint.sh

# Stop any existing processes on port 8000
echo "🛑 Stopping processes on port 8000..."
sudo pkill -f "python.*8000" || true
sudo fuser -k 8000/tcp || true

# Clean up Docker
echo "🧹 Cleaning up Docker..."
docker-compose down --remove-orphans || true
docker system prune -f || true

# Build fresh images
echo "🔨 Building fresh Docker images..."
docker-compose build --no-cache

# Start services
echo "🚀 Starting services..."
docker-compose up -d

# Monitor startup
echo "👀 Monitoring startup..."
for i in {1..30}; do
    echo "Checking startup progress... ($i/30)"
    docker-compose logs --tail=5 ml-api
    
    if curl -f http://localhost:8000/health > /dev/null 2>&1; then
        echo "✅ ML API is ready!"
        break
    fi
    
    sleep 10
done

# Final status check
echo "📊 Final Status Check:"
docker-compose ps
echo ""
echo "🧪 Testing endpoints:"
curl -s http://localhost:8000/health | jq . || echo "Health endpoint test failed"
echo ""
echo "🎉 Deployment fix completed!"

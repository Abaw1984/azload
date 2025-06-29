#!/bin/bash
set -e

echo "🚀 AZLOAD ML API - IMMEDIATE DEPLOYMENT FIX"
echo "============================================"

# STEP 1: Find and stop the correct service
echo "⏹️ STEP 1: Stopping ML services..."

# Check what services are actually running
echo "Checking for ML services..."
systemctl list-units --type=service | grep -i azload || echo "No azload services found"
systemctl list-units --type=service | grep -i ml || echo "No ml services found"

# Try the correct service name
systemctl stop azload-ml 2>/dev/null && echo "✅ Stopped azload-ml service" || echo "⚠️ azload-ml service not found"

# Kill any Python processes on port 8000
echo "Killing any processes on port 8000..."
pkill -f "python.*8000" 2>/dev/null && echo "✅ Killed Python processes" || echo "ℹ️ No Python processes on port 8000"
fuser -k 8000/tcp 2>/dev/null && echo "✅ Freed port 8000" || echo "ℹ️ Port 8000 already free"

# STEP 2: Copy the corrected file
echo "\n📁 STEP 2: Copying corrected api_server.py..."
if [ -f "/tmp/api_server.py" ]; then
    cp /tmp/api_server.py /opt/azload/ml_pipeline/api_server.py
    chmod +x /opt/azload/ml_pipeline/api_server.py
    chown root:root /opt/azload/ml_pipeline/api_server.py
    echo "✅ Corrected api_server.py copied successfully"
else
    echo "❌ ERROR: /tmp/api_server.py not found!"
    echo "Please upload the corrected file first:"
    echo "scp api_server.py root@your-server-ip:/tmp/"
    exit 1
fi

# STEP 3: Update dependencies
echo "\n📦 STEP 3: Updating Python dependencies..."
cd /opt/azload/ml_pipeline

# Check if virtual environment exists
if [ -d "../venv" ]; then
    source ../venv/bin/activate
    echo "✅ Activated virtual environment"
else
    echo "⚠️ Virtual environment not found, using system Python"
fi

# Update pip and install requirements
pip install --upgrade pip
pip install -r requirements.txt
echo "✅ Dependencies updated"

# STEP 4: Test the API manually first
echo "\n🧪 STEP 4: Testing API manually..."
echo "Starting API server for 10 seconds to test..."
timeout 10s python api_server.py &
API_PID=$!
sleep 5

# Test if it's working
if curl -s http://localhost:8000/health > /dev/null; then
    echo "✅ API test successful"
else
    echo "❌ API test failed"
fi

# Kill the test process
kill $API_PID 2>/dev/null || true
wait $API_PID 2>/dev/null || true
sleep 2

# STEP 5: Create/update the systemd service
echo "\n⚙️ STEP 5: Setting up systemd service..."
cat > /etc/systemd/system/azload-ml.service << 'EOF'
[Unit]
Description=AZLOAD ML API Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/azload/ml_pipeline
Environment=PATH=/opt/azload/venv/bin
ExecStart=/opt/azload/venv/bin/python api_server.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

echo "✅ Service file created"

# STEP 6: Start the service
echo "\n▶️ STEP 6: Starting the service..."
systemctl daemon-reload
systemctl enable azload-ml
systemctl start azload-ml

echo "✅ Service started"

# STEP 7: Verify everything is working
echo "\n🔍 STEP 7: Verification..."
sleep 5

echo "Service status:"
systemctl status azload-ml --no-pager -l

echo "\nPort check:"
ss -tlnp | grep :8000 && echo "✅ Port 8000 is bound" || echo "❌ Port 8000 not bound"

echo "\nAPI health check:"
if curl -s http://localhost:8000/health; then
    echo "\n✅ Health check passed"
else
    echo "\n❌ Health check failed"
fi

echo "\nPublic access test:"
if curl -s http://$(curl -s ifconfig.me)/health > /dev/null; then
    echo "✅ Public access working"
else
    echo "❌ Public access failed - check nginx"
fi

echo "\n🎉 DEPLOYMENT COMPLETED!"
echo "\nIf you see any errors above, run:"
echo "journalctl -u azload-ml -f"
echo "\nTo view real-time logs."

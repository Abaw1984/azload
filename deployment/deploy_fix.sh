#!/bin/bash

# Step 4: Complete ML API Deployment Process
echo "Step 4: Complete ML API Deployment Process"

# 1. Copy corrected file to deployment location
echo "1. Copy corrected file to deployment location:"
cp api_server.py /opt/azload/ml_pipeline/
echo "✓ File copied successfully"

# 2. Navigate to deployment directory
echo "2. Navigate to deployment directory:"
cd /opt/azload/ml_pipeline

# 3. Update Python dependencies
echo "3. Update Python dependencies:"
pip install -r requirements.txt
echo "✓ Dependencies updated"

# 4. Restart the ML API service
echo "4. Restart the ML API service:"
pkill -f 'python.*api_server.py' || true
echo "✓ Previous service stopped"

nohup python api_server.py > api_server.log 2>&1 &
echo "✓ ML API service restarted"

# 5. Wait for service to start
sleep 3

# 6. Verify service is running
echo "5. Verify service is running:"
ps aux | grep api_server.py | grep -v grep

# 7. Test the fixed endpoint
echo "6. Test the fixed endpoint:"
curl -s http://localhost:8000/model-info | head -20
echo ""

echo "🎉 Deployment completed successfully!"
echo "Service is now running with the corrected api_server.py file"

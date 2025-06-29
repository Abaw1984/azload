# Complete Step 4: Update Dependencies and Restart Service
*Resume from where you left off*

## 🔌 **STEP 1: Reconnect to Your Server**
```bash
# Connect to your Digital Ocean server
ssh root@178.128.135.194
```

## 📦 **STEP 2: Extract and Apply the Fix**
```bash
# Navigate to temp directory
cd /tmp

# Check if the file is there
ls -la azload_ml_fix.zip

# Extract the fix
unzip -o azload_ml_fix.zip

# Copy the fixed file to the correct location
cp api_server.py /opt/azload/ml_pipeline/

# Set proper permissions
chmod +x /opt/azload/ml_pipeline/api_server.py
chown root:root /opt/azload/ml_pipeline/api_server.py

echo "✅ Fixed API server file copied"
```

## 🔧 **STEP 3: Update Dependencies**
```bash
# Navigate to ML pipeline directory
cd /opt/azload/ml_pipeline

# Activate virtual environment
source ../venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install/update requirements
pip install -r requirements.txt

# Verify critical packages
pip list | grep -E "fastapi|uvicorn|pydantic|scikit-learn"

echo "✅ Dependencies updated"
```

## 🔄 **STEP 4: Restart the ML API Service**
```bash
# Stop the current service
systemctl stop azload-ml

# Kill any remaining processes on port 8000
pkill -f "python.*8000" || echo "No processes to kill"

# Wait a moment
sleep 3

# Start the service
systemctl start azload-ml

# Check status
systemctl status azload-ml

echo "✅ Service restarted"
```

## 🧪 **STEP 5: Test the Fixed Endpoints**
```bash
# Wait for service to fully start
sleep 10

# Test health endpoint
echo "Testing health endpoint..."
curl -s http://localhost:8000/health | python3 -m json.tool

# Test model-info endpoint (this was the problematic one)
echo "\nTesting model-info endpoint..."
curl -s http://localhost:8000/model-info | python3 -m json.tool

# Test public access
echo "\nTesting public access..."
curl -s http://178.128.135.194/health | python3 -m json.tool
```

## 🔍 **STEP 6: Verify Everything is Working**
```bash
# Check service status
echo "=== SERVICE STATUS ==="
systemctl is-active azload-ml && echo "✅ ML API: Running" || echo "❌ ML API: Stopped"
systemctl is-active nginx && echo "✅ Nginx: Running" || echo "❌ Nginx: Stopped"

# Check port binding
echo "\n=== PORT STATUS ==="
ss -tlnp | grep :8000 > /dev/null && echo "✅ Port 8000: Bound" || echo "❌ Port 8000: Not bound"
ss -tlnp | grep :80 > /dev/null && echo "✅ Port 80: Bound" || echo "❌ Port 80: Not bound"

# Check recent logs
echo "\n=== RECENT LOGS ==="
journalctl -u azload-ml -n 10 --no-pager
```

## 🚨 **TROUBLESHOOTING (If Something Goes Wrong)**

### If the service won't start:
```bash
# Check detailed error logs
journalctl -u azload-ml -n 50 --no-pager

# Try manual start to see errors
cd /opt/azload/ml_pipeline
source ../venv/bin/activate
python api_server.py
# Press Ctrl+C to stop after checking errors
```

### If you get "ModuleNotFoundError":
```bash
# Reinstall requirements
cd /opt/azload/ml_pipeline
source ../venv/bin/activate
pip install --force-reinstall -r requirements.txt
```

### If port 8000 is busy:
```bash
# Find what's using the port
ss -tlnp | grep :8000

# Kill processes using port 8000
pkill -f "python.*8000"
fuser -k 8000/tcp

# Restart service
systemctl restart azload-ml
```

## ✅ **SUCCESS INDICATORS**
You should see:
- ✅ Service status: `active (running)`
- ✅ Health endpoint returns: `{"status": "healthy", "models_loaded": true}`
- ✅ Model-info endpoint returns valid JSON (no validation errors)
- ✅ Public access works: `curl http://178.128.135.194/health`

## 🎯 **QUICK COMMAND SEQUENCE**
If you want to run everything at once:
```bash
ssh root@178.128.135.194
cd /tmp && unzip -o azload_ml_fix.zip && cp api_server.py /opt/azload/ml_pipeline/
cd /opt/azload/ml_pipeline && source ../venv/bin/activate && pip install -r requirements.txt
systemctl stop azload-ml && sleep 3 && systemctl start azload-ml
sleep 10 && curl http://localhost:8000/health && curl http://localhost:8000/model-info
```

---

**🎉 Once all tests pass, your ML API fix is complete!**

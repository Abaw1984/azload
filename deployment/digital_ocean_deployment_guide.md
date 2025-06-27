# AZLOAD Digital Ocean Deployment Guide
*Complete Step-by-Step ML Upload & Update Commands*

## 🚀 **QUICK DEPLOYMENT COMMANDS**

### **Step 1: Connect to Your Digital Ocean Server**
```bash
# Replace with your actual server IP
ssh root@178.128.135.194
```

### **Step 2: Navigate to Project Directory**
```bash
cd /opt/azload
```

### **Step 3: Stop Current Services**
```bash
# Stop ML API service
systemctl stop azload-ml

# Stop nginx (optional, for maintenance)
systemctl stop nginx

# Kill any remaining Python processes
pkill -f "python.*8000"
```

### **Step 4: Backup Current Installation**
```bash
# Create backup directory with timestamp
BACKUP_DIR="/opt/azload_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR

# Backup current ML pipeline
cp -r /opt/azload/ml_pipeline $BACKUP_DIR/
cp -r /opt/azload/venv $BACKUP_DIR/

# Backup trained models
cp -r /opt/azload/ml_pipeline/trained_models $BACKUP_DIR/ 2>/dev/null || echo "No trained models to backup"

echo "✅ Backup created at: $BACKUP_DIR"
```

### **Step 5: Upload New Code (Choose Method A or B)**

#### **Method A: Direct File Upload (Recommended)**
```bash
# On your LOCAL machine, compress and upload the deployment folder
# Run this from your project root directory:
tar -czf azload_deployment.tar.gz deployment/
scp azload_deployment.tar.gz root@178.128.135.194:/tmp/

# Back on the server:
cd /tmp
tar -xzf azload_deployment.tar.gz
cp -r deployment/* /opt/azload/
```

#### **Method B: Git Clone (Alternative)**
```bash
# If your code is in a git repository
cd /opt
git clone https://github.com/yourusername/azload.git azload_new
cp -r azload_new/deployment/* /opt/azload/
rm -rf azload_new
```

### **Step 6: Update ML Pipeline Files**
```bash
# Copy new ML pipeline files
cp /opt/azload/deployment/api_server.py /opt/azload/ml_pipeline/
cp /opt/azload/deployment/train_model.py /opt/azload/ml_pipeline/
cp /opt/azload/deployment/data_preparation.py /opt/azload/ml_pipeline/
cp /opt/azload/deployment/model_utils.py /opt/azload/ml_pipeline/
cp /opt/azload/deployment/requirements.txt /opt/azload/ml_pipeline/

# Set proper permissions
chmod +x /opt/azload/ml_pipeline/*.py
chown -R root:root /opt/azload
```

### **Step 7: Update Python Dependencies**
```bash
# Navigate to ML pipeline directory
cd /opt/azload/ml_pipeline

# Activate virtual environment
source ../venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install/update requirements
pip install -r requirements.txt

# Install additional ML dependencies if needed
pip install --upgrade scikit-learn==1.3.0 xgboost==2.0.3 lightgbm==4.3.0
```

### **Step 8: Train/Update ML Models**
```bash
# Still in /opt/azload/ml_pipeline with venv activated

# Train new models (this may take 5-10 minutes)
python train_model.py

# Verify models were created
ls -la trained_models/

# Expected output: Several .pkl files and training_metadata.json
```

### **Step 9: Test ML API Manually**
```bash
# Test the API server manually first
cd /opt/azload/ml_pipeline
source ../venv/bin/activate

# Start API server in foreground (for testing)
python api_server.py

# You should see:
# "Models loaded successfully"
# "Uvicorn running on http://0.0.0.0:8000"

# Press Ctrl+C to stop after confirming it works
```

### **Step 10: Update System Service**
```bash
# Update the systemd service file
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

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and enable service
systemctl daemon-reload
systemctl enable azload-ml
```

### **Step 11: Start Services**
```bash
# Start ML API service
systemctl start azload-ml

# Check status
systemctl status azload-ml

# Start nginx
systemctl start nginx

# Check nginx status
systemctl status nginx
```

### **Step 12: Verify Deployment**
```bash
# Check if services are running
systemctl status azload-ml
systemctl status nginx

# Check port binding
ss -tlnp | grep :8000
ss -tlnp | grep :80

# Test API endpoints
curl http://localhost:8000/health
curl http://localhost:8000/model-info
curl http://localhost:8000/ml-pipeline/status

# Test public access
curl http://178.128.135.194/health
```

### **Step 13: Monitor Logs**
```bash
# Monitor ML API logs in real-time
journalctl -u azload-ml -f

# Check recent logs
journalctl -u azload-ml -n 50 --no-pager

# Check nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

---

## 🔧 **TROUBLESHOOTING COMMANDS**

### **If ML API Won't Start:**
```bash
# Check detailed error logs
journalctl -u azload-ml -n 100 --no-pager

# Try manual start to see errors
cd /opt/azload/ml_pipeline
source ../venv/bin/activate
python api_server.py

# Check Python dependencies
pip list | grep -E "fastapi|uvicorn|scikit-learn|xgboost|lightgbm"
```

### **If Models Won't Load:**
```bash
# Check if models exist
ls -la /opt/azload/ml_pipeline/trained_models/

# Retrain models
cd /opt/azload/ml_pipeline
source ../venv/bin/activate
python train_model.py

# Check training output
cat trained_models/training_metadata.json
```

### **If Port 8000 is Busy:**
```bash
# Find what's using port 8000
ss -tlnp | grep :8000
lsof -i :8000

# Kill processes using port 8000
pkill -f "python.*8000"
fuser -k 8000/tcp

# Restart service
systemctl restart azload-ml
```

### **If Getting 502 Errors:**
```bash
# Check nginx configuration
nginx -t

# Check if ML API is responding locally
curl http://localhost:8000/health

# Restart both services
systemctl restart azload-ml
systemctl restart nginx
```

---

## 🚀 **ONE-COMMAND DEPLOYMENT SCRIPT**

### **Create Auto-Deploy Script:**
```bash
# Create deployment script
cat > /opt/azload/auto_deploy.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 AZLOAD Auto-Deployment Starting..."

# Stop services
echo "⏹️ Stopping services..."
systemctl stop azload-ml || true
pkill -f "python.*8000" || true

# Backup
echo "💾 Creating backup..."
BACKUP_DIR="/opt/azload_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR
cp -r /opt/azload/ml_pipeline $BACKUP_DIR/ || true

# Update dependencies
echo "📦 Updating dependencies..."
cd /opt/azload/ml_pipeline
source ../venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Train models
echo "🧠 Training ML models..."
python train_model.py

# Test API
echo "🧪 Testing API..."
timeout 10s python api_server.py &
sleep 5
kill %1 2>/dev/null || true

# Start services
echo "▶️ Starting services..."
systemctl daemon-reload
systemctl start azload-ml
systemctl start nginx

# Verify
echo "✅ Verifying deployment..."
sleep 5
curl -f http://localhost:8000/health > /dev/null && echo "✅ ML API: OK" || echo "❌ ML API: FAILED"
curl -f http://localhost:8000/model-info > /dev/null && echo "✅ Models: OK" || echo "❌ Models: FAILED"

echo "🎉 Deployment completed!"
EOF

# Make executable
chmod +x /opt/azload/auto_deploy.sh
```

### **Run Auto-Deploy:**
```bash
# Execute the auto-deployment
/opt/azload/auto_deploy.sh
```

---

## 📊 **VERIFICATION COMMANDS**

### **Complete System Check:**
```bash
# Run comprehensive verification
cat > /tmp/verify_azload.sh << 'EOF'
#!/bin/bash
echo "🔍 AZLOAD System Verification"
echo "============================="

# Service Status
echo "📋 Service Status:"
systemctl is-active azload-ml && echo "✅ ML API: Running" || echo "❌ ML API: Stopped"
systemctl is-active nginx && echo "✅ Nginx: Running" || echo "❌ Nginx: Stopped"

# Port Check
echo "\n🔌 Port Status:"
ss -tlnp | grep :8000 > /dev/null && echo "✅ Port 8000: Bound" || echo "❌ Port 8000: Not bound"
ss -tlnp | grep :80 > /dev/null && echo "✅ Port 80: Bound" || echo "❌ Port 80: Not bound"

# API Health
echo "\n🏥 API Health:"
curl -s -f http://localhost:8000/health > /dev/null && echo "✅ Health endpoint: OK" || echo "❌ Health endpoint: Failed"
curl -s -f http://localhost:8000/model-info > /dev/null && echo "✅ Model info: OK" || echo "❌ Model info: Failed"

# Models Check
echo "\n🧠 ML Models:"
[ -d "/opt/azload/ml_pipeline/trained_models" ] && echo "✅ Models directory: Exists" || echo "❌ Models directory: Missing"
[ -f "/opt/azload/ml_pipeline/trained_models/training_metadata.json" ] && echo "✅ Training metadata: Exists" || echo "❌ Training metadata: Missing"

# Public Access
echo "\n🌐 Public Access:"
curl -s -f http://178.128.135.194/health > /dev/null && echo "✅ Public health: OK" || echo "❌ Public health: Failed"

echo "\n✅ Verification completed!"
EOF

chmod +x /tmp/verify_azload.sh
/tmp/verify_azload.sh
```

---

## 🎯 **QUICK REFERENCE**

### **Essential Commands:**
```bash
# Connect to server
ssh root@178.128.135.194

# Check service status
systemctl status azload-ml

# Restart ML service
systemctl restart azload-ml

# View logs
journalctl -u azload-ml -f

# Test API
curl http://localhost:8000/health

# Check what's on port 8000
ss -tlnp | grep :8000

# Kill processes on port 8000
pkill -f "python.*8000"

# Manual API start (for debugging)
cd /opt/azload/ml_pipeline && source ../venv/bin/activate && python api_server.py
```

### **File Locations:**
- **ML Pipeline**: `/opt/azload/ml_pipeline/`
- **Virtual Environment**: `/opt/azload/venv/`
- **Trained Models**: `/opt/azload/ml_pipeline/trained_models/`
- **Service File**: `/etc/systemd/system/azload-ml.service`
- **Nginx Config**: `/etc/nginx/sites-available/azload-ml`
- **Logs**: `journalctl -u azload-ml`

### **Important URLs:**
- **Health Check**: `http://178.128.135.194/health`
- **Model Info**: `http://178.128.135.194/model-info`
- **ML Pipeline Status**: `http://178.128.135.194/ml-pipeline/status`
- **API Documentation**: `http://178.128.135.194/docs`

---

**🎉 Your AZLOAD ML system should now be fully deployed and operational on Digital Ocean!**

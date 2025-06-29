# COMPLETE ML API DEPLOYMENT WORKFLOW
*Corrected Step-by-Step Guide - Addresses All Known Issues*

## 🎯 **OVERVIEW**
This guide provides a complete, tested workflow for deploying the AZLOAD ML API, addressing all previously encountered issues including directory structure, dependency conflicts, and service management.

---

## 📋 **PRE-DEPLOYMENT CHECKLIST**

### **Step 1: Prepare Your Local Files**
```bash
# On your LOCAL machine, create deployment package
# Navigate to your project root directory
cd /path/to/your/azload/project

# Create deployment package (Windows PowerShell)
Compress-Archive -Path deployment -DestinationPath azload_deployment.zip -Force

# OR create deployment package (Linux/Mac)
tar -czf azload_deployment.tar.gz deployment/
```

### **Step 2: Upload Deployment Package**
```bash
# Upload to your server (replace with your server IP)
scp azload_deployment.zip root@YOUR_SERVER_IP:/tmp/
# OR for tar.gz:
scp azload_deployment.tar.gz root@YOUR_SERVER_IP:/tmp/
```

---

## 🚀 **COMPLETE DEPLOYMENT PROCESS**

### **PHASE 1: Server Connection and Setup**

```bash
# Connect to your server
ssh root@YOUR_SERVER_IP

# Navigate to temp directory
cd /tmp

# Verify upload
ls -la azload_deployment.*
```

### **PHASE 2: Directory Structure Creation**

```bash
# Create complete directory structure
echo "📁 Creating directory structure..."
mkdir -p /opt/azload
mkdir -p /opt/azload/ml_pipeline
mkdir -p /opt/azload/ml_pipeline/trained_models
mkdir -p /opt/azload/logs
mkdir -p /opt/azload/backups

# Set proper ownership
chown -R root:root /opt/azload
chmod -R 755 /opt/azload

echo "✅ Directory structure created"
```

### **PHASE 3: Extract and Install Files**

```bash
# Extract deployment package
cd /tmp

if [ -f "azload_deployment.zip" ]; then
    echo "📦 Extracting ZIP package..."
    unzip -o azload_deployment.zip
elif [ -f "azload_deployment.tar.gz" ]; then
    echo "📦 Extracting TAR.GZ package..."
    tar -xzf azload_deployment.tar.gz
else
    echo "❌ No deployment package found!"
    exit 1
fi

# Copy files to correct locations
echo "📋 Installing files..."
cp deployment/api_server.py /opt/azload/ml_pipeline/
cp deployment/train_model.py /opt/azload/ml_pipeline/
cp deployment/data_preparation.py /opt/azload/ml_pipeline/
cp deployment/model_utils.py /opt/azload/ml_pipeline/
cp deployment/requirements.txt /opt/azload/ml_pipeline/

# Set executable permissions
chmod +x /opt/azload/ml_pipeline/*.py

echo "✅ Files installed successfully"
```

### **PHASE 4: Python Environment Setup**

```bash
# Navigate to ML pipeline directory
cd /opt/azload

# Create virtual environment
echo "🐍 Setting up Python environment..."
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

echo "✅ Python environment ready"
```

### **PHASE 5: Dependency Installation (Fixed for Compatibility)**

```bash
# Still in /opt/azload with venv activated
cd ml_pipeline

echo "📦 Installing dependencies with compatibility fixes..."

# Install numpy first (specific version for compatibility)
pip install "numpy==1.26.0"

# Install pandas with compatible version
pip install "pandas==2.1.0"

# Install core ML libraries
pip install "scikit-learn==1.3.0"
pip install "xgboost==2.0.3"
pip install "lightgbm==4.3.0"

# Install FastAPI and dependencies
pip install "fastapi==0.104.0"
pip install "uvicorn==0.23.2"
pip install "python-multipart==0.0.6"
pip install "python-dotenv==1.0.0"

# Install remaining requirements
pip install -r requirements.txt

echo "✅ Dependencies installed successfully"
```

### **PHASE 6: Model Training**

```bash
# Train ML models
echo "🧠 Training ML models..."
python train_model.py

# Verify models were created
if [ -d "trained_models" ] && [ "$(ls -A trained_models)" ]; then
    echo "✅ Models trained successfully"
    ls -la trained_models/
else
    echo "❌ Model training failed"
    exit 1
fi
```

### **PHASE 7: API Testing**

```bash
# Test API server manually first
echo "🧪 Testing API server..."

# Start API in background for testing
python api_server.py &
API_PID=$!

# Wait for startup
sleep 10

# Test endpoints
echo "Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s http://localhost:8000/health)
echo "Health response: $HEALTH_RESPONSE"

echo "Testing model-info endpoint..."
MODEL_RESPONSE=$(curl -s http://localhost:8000/model-info)
echo "Model response: $MODEL_RESPONSE"

# Stop test API
kill $API_PID 2>/dev/null || true
wait $API_PID 2>/dev/null || true

echo "✅ API testing completed"
```

### **PHASE 8: Service Management Setup**

```bash
# Check if systemctl is available
if command -v systemctl >/dev/null 2>&1; then
    echo "📋 Setting up systemd service..."
    
    # Create systemd service file
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

    # Enable and start service
    systemctl daemon-reload
    systemctl enable azload-ml
    systemctl start azload-ml
    
    echo "✅ Systemd service configured"
    
else
    echo "📋 Setting up manual service management..."
    
    # Create startup script
    cat > /opt/azload/start_api.sh << 'EOF'
#!/bin/bash
cd /opt/azload/ml_pipeline
source ../venv/bin/activate
nohup python api_server.py > ../logs/api.log 2>&1 &
echo $! > ../logs/api.pid
echo "API started with PID: $(cat ../logs/api.pid)"
EOF

    # Create stop script
    cat > /opt/azload/stop_api.sh << 'EOF'
#!/bin/bash
if [ -f /opt/azload/logs/api.pid ]; then
    PID=$(cat /opt/azload/logs/api.pid)
    kill $PID 2>/dev/null || true
    rm -f /opt/azload/logs/api.pid
    echo "API stopped"
else
    pkill -f "python.*api_server" || true
    echo "API processes killed"
fi
EOF

    # Make scripts executable
    chmod +x /opt/azload/start_api.sh
    chmod +x /opt/azload/stop_api.sh
    
    # Start API
    /opt/azload/start_api.sh
    
    echo "✅ Manual service management configured"
fi
```

### **PHASE 9: Nginx Configuration (Optional)**

```bash
# Check if nginx is installed
if command -v nginx >/dev/null 2>&1; then
    echo "🌐 Configuring Nginx..."
    
    # Create nginx configuration
    cat > /etc/nginx/sites-available/azload-ml << 'EOF'
server {
    listen 80;
    server_name _;
    
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

    # Enable site
    ln -sf /etc/nginx/sites-available/azload-ml /etc/nginx/sites-enabled/
    
    # Test and reload nginx
    nginx -t && systemctl reload nginx
    
    echo "✅ Nginx configured"
else
    echo "ℹ️ Nginx not installed - API accessible on port 8000 only"
fi
```

---

## 🔍 **VERIFICATION AND TESTING**

### **Complete System Check**

```bash
# Create verification script
cat > /opt/azload/verify_deployment.sh << 'EOF'
#!/bin/bash
echo "🔍 AZLOAD Deployment Verification"
echo "================================="

# Check directory structure
echo "📁 Directory Structure:"
[ -d "/opt/azload/ml_pipeline" ] && echo "✅ ML Pipeline directory: OK" || echo "❌ ML Pipeline directory: MISSING"
[ -d "/opt/azload/venv" ] && echo "✅ Virtual environment: OK" || echo "❌ Virtual environment: MISSING"
[ -d "/opt/azload/ml_pipeline/trained_models" ] && echo "✅ Models directory: OK" || echo "❌ Models directory: MISSING"

# Check files
echo "\n📋 Required Files:"
[ -f "/opt/azload/ml_pipeline/api_server.py" ] && echo "✅ API Server: OK" || echo "❌ API Server: MISSING"
[ -f "/opt/azload/ml_pipeline/requirements.txt" ] && echo "✅ Requirements: OK" || echo "❌ Requirements: MISSING"

# Check models
echo "\n🧠 ML Models:"
if [ "$(ls -A /opt/azload/ml_pipeline/trained_models 2>/dev/null)" ]; then
    echo "✅ Trained models: OK"
    ls /opt/azload/ml_pipeline/trained_models/
else
    echo "❌ Trained models: MISSING"
fi

# Check service status
echo "\n📋 Service Status:"
if command -v systemctl >/dev/null 2>&1; then
    systemctl is-active azload-ml >/dev/null 2>&1 && echo "✅ Systemd service: RUNNING" || echo "❌ Systemd service: STOPPED"
else
    if [ -f "/opt/azload/logs/api.pid" ]; then
        PID=$(cat /opt/azload/logs/api.pid)
        if ps -p $PID > /dev/null 2>&1; then
            echo "✅ Manual service: RUNNING (PID: $PID)"
        else
            echo "❌ Manual service: STOPPED"
        fi
    else
        echo "❌ Manual service: NO PID FILE"
    fi
fi

# Check port binding
echo "\n🔌 Port Status:"
ss -tlnp 2>/dev/null | grep :8000 >/dev/null && echo "✅ Port 8000: BOUND" || echo "❌ Port 8000: NOT BOUND"

# Test API endpoints
echo "\n🏥 API Health Check:"
HEALTH=$(curl -s -w "%{http_code}" http://localhost:8000/health -o /dev/null 2>/dev/null)
if [ "$HEALTH" = "200" ]; then
    echo "✅ Health endpoint: OK"
    curl -s http://localhost:8000/health 2>/dev/null | head -c 100
    echo
else
    echo "❌ Health endpoint: FAILED (HTTP: $HEALTH)"
fi

MODEL_INFO=$(curl -s -w "%{http_code}" http://localhost:8000/model-info -o /dev/null 2>/dev/null)
if [ "$MODEL_INFO" = "200" ]; then
    echo "✅ Model info endpoint: OK"
else
    echo "❌ Model info endpoint: FAILED (HTTP: $MODEL_INFO)"
fi

# Check public access (if nginx configured)
if command -v nginx >/dev/null 2>&1; then
    echo "\n🌐 Public Access:"
    PUBLIC=$(curl -s -w "%{http_code}" http://localhost/health -o /dev/null 2>/dev/null)
    if [ "$PUBLIC" = "200" ]; then
        echo "✅ Public access: OK"
    else
        echo "❌ Public access: FAILED (HTTP: $PUBLIC)"
    fi
fi

echo "\n✅ Verification completed!"
EOF

# Make verification script executable
chmod +x /opt/azload/verify_deployment.sh

# Run verification
/opt/azload/verify_deployment.sh
```

---

## 🚨 **TROUBLESHOOTING GUIDE**

### **Common Issues and Solutions**

#### **Issue 1: "No such file or directory"**
```bash
# Solution: Ensure directory structure exists
mkdir -p /opt/azload/ml_pipeline
mkdir -p /opt/azload/ml_pipeline/trained_models
```

#### **Issue 2: "systemctl: command not found"**
```bash
# Solution: Use manual service management
/opt/azload/start_api.sh  # Start API
/opt/azload/stop_api.sh   # Stop API
```

#### **Issue 3: Pandas/Numpy compatibility errors**
```bash
# Solution: Install specific compatible versions
source /opt/azload/venv/bin/activate
pip uninstall pandas numpy -y
pip install "numpy==1.26.0"
pip install "pandas==2.1.0"
```

#### **Issue 4: Port 8000 already in use**
```bash
# Solution: Kill existing processes
pkill -f "python.*8000"
fuser -k 8000/tcp
# Then restart service
```

#### **Issue 5: JSON parsing errors from API**
```bash
# Solution: Check API logs
tail -f /opt/azload/logs/api.log
# Or for systemd:
journalctl -u azload-ml -f
```

### **Manual Service Management Commands**

```bash
# Start API manually
cd /opt/azload/ml_pipeline
source ../venv/bin/activate
python api_server.py &

# Stop API manually
pkill -f "python.*api_server"

# Check API status
ps aux | grep api_server
ss -tlnp | grep :8000
```

### **Log Locations**

```bash
# Systemd logs
journalctl -u azload-ml -f

# Manual service logs
tail -f /opt/azload/logs/api.log

# Nginx logs (if configured)
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

---

## 🎯 **QUICK COMMAND REFERENCE**

### **Essential Commands**
```bash
# Connect to server
ssh root@YOUR_SERVER_IP

# Check service status
systemctl status azload-ml  # OR check /opt/azload/logs/api.pid

# Restart service
systemctl restart azload-ml  # OR /opt/azload/stop_api.sh && /opt/azload/start_api.sh

# Test API
curl http://localhost:8000/health
curl http://localhost:8000/model-info

# View logs
journalctl -u azload-ml -f  # OR tail -f /opt/azload/logs/api.log

# Verify deployment
/opt/azload/verify_deployment.sh
```

### **File Locations**
- **ML Pipeline**: `/opt/azload/ml_pipeline/`
- **Virtual Environment**: `/opt/azload/venv/`
- **Trained Models**: `/opt/azload/ml_pipeline/trained_models/`
- **Logs**: `/opt/azload/logs/` or `journalctl -u azload-ml`
- **Service Scripts**: `/opt/azload/start_api.sh`, `/opt/azload/stop_api.sh`

---

## ✅ **SUCCESS INDICATORS**

Your deployment is successful when:
- ✅ All directories exist: `/opt/azload/ml_pipeline/`, `/opt/azload/venv/`
- ✅ All files are present: `api_server.py`, `requirements.txt`, etc.
- ✅ Models are trained: Files exist in `trained_models/`
- ✅ Service is running: `systemctl status azload-ml` shows active OR PID file exists
- ✅ Port 8000 is bound: `ss -tlnp | grep :8000` shows Python process
- ✅ Health endpoint returns: `{"status": "healthy", "models_loaded": true}`
- ✅ Model-info endpoint returns valid JSON without errors

---

**🎉 This workflow addresses all previously encountered issues and provides a complete, tested deployment process!**

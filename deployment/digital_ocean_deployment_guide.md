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

### **Step 5: Upload New Code (Choose Method A, B, or C)**

#### **Method A: Windows PowerShell (Recommended for Windows)**
```powershell
# On your LOCAL Windows machine, run this PowerShell script
# Navigate to your project root directory first
cd C:\path\to\your\azload\project

# Create deployment package using PowerShell
$deploymentFiles = @(
    "deployment\\api_server.py",
    "deployment\\train_model.py",
    "deployment\\data_preparation.py",
    "deployment\\model_utils.py",
    "deployment\\requirements.txt",
    "deployment\\docker-compose.yml",
    "deployment\\nginx.conf",
    "ml_pipeline\\*.py"
)

# Check if files exist and create ZIP
$zipPath = "azload_deployment.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath }

Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::Open($zipPath, 'Create')

foreach ($pattern in $deploymentFiles) {
    $files = Get-ChildItem -Path $pattern -ErrorAction SilentlyContinue
    foreach ($file in $files) {
        if ($file.PSIsContainer -eq $false) {
            $relativePath = $file.FullName.Substring((Get-Location).Path.Length + 1)
            [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $file.FullName, $relativePath)
            Write-Host "Added: $relativePath"
        }
    }
}
$zip.Dispose()
Write-Host "✅ Created: $zipPath"

# Upload using SCP (requires OpenSSH or PuTTY's pscp)
# Option 1: Using Windows OpenSSH (if installed)
scp azload_deployment.zip root@178.128.135.194:/tmp/

# Option 2: Using PuTTY's pscp (if you have PuTTY installed)
# pscp azload_deployment.zip root@178.128.135.194:/tmp/
```

#### **Method B: Windows GUI Upload (WinSCP Alternative)**
```powershell
# If you prefer a GUI approach:
# 1. Download WinSCP from https://winscp.net/
# 2. Create the deployment package first:

# PowerShell script to create deployment package
$sourceDir = "deployment"
$zipFile = "azload_deployment.zip"

if (Test-Path $zipFile) { Remove-Item $zipFile }
Compress-Archive -Path $sourceDir -DestinationPath $zipFile -Force
Write-Host "✅ Created deployment package: $zipFile"
Write-Host "📁 Upload this file to your server using WinSCP to /tmp/ directory"

# 3. Use WinSCP to connect to root@178.128.135.194
# 4. Upload azload_deployment.zip to /tmp/ directory
```

#### **Method C: Linux/Mac tar command**
```bash
# On Linux/Mac machines, use traditional tar
# Run this from your project root directory:
tar -czf azload_deployment.tar.gz deployment/ ml_pipeline/
scp azload_deployment.tar.gz root@178.128.135.194:/tmp/
```

#### **Server-side extraction (after upload)**
```bash
# SSH to your server
ssh root@178.128.135.194

# Navigate to temp directory
cd /tmp

# Extract the uploaded file
# For ZIP files (from Windows):
if [ -f "azload_deployment.zip" ]; then
    unzip -o azload_deployment.zip
    cp -r deployment/* /opt/azload/ 2>/dev/null || echo "Deployment folder copied"
    cp -r ml_pipeline/* /opt/azload/ml_pipeline/ 2>/dev/null || echo "ML pipeline updated"
fi

# For TAR.GZ files (from Linux/Mac):
if [ -f "azload_deployment.tar.gz" ]; then
    tar -xzf azload_deployment.tar.gz
    cp -r deployment/* /opt/azload/
    cp -r ml_pipeline/* /opt/azload/ml_pipeline/
fi

echo "✅ Files extracted and copied to /opt/azload/"
```

#### **Method D: Git Clone (Alternative)**
```bash
# If your code is in a git repository
cd /opt
git clone https://github.com/yourusername/azload.git azload_new
cp -r azload_new/deployment/* /opt/azload/
cp -r azload_new/ml_pipeline/* /opt/azload/ml_pipeline/
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

---

## 💻 **WINDOWS DEPLOYMENT HELPER SCRIPT**

### **Create Windows PowerShell Deployment Script:**
```powershell
# Save this as 'deploy_to_digital_ocean.ps1' in your project root

param(
    [string]$ServerIP = "178.128.135.194",
    [string]$Username = "root"
)

Write-Host "🚀 AZLOAD Windows Deployment Script" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green

# Step 1: Create deployment package
Write-Host "📦 Creating deployment package..." -ForegroundColor Yellow

$deploymentFiles = @(
    "deployment",
    "ml_pipeline"
)

$zipPath = "azload_deployment.zip"
if (Test-Path $zipPath) { 
    Remove-Item $zipPath 
    Write-Host "🗑️ Removed existing deployment package" -ForegroundColor Gray
}

try {
    # Check if deployment folder exists
    if (-not (Test-Path "deployment")) {
        Write-Host "❌ Error: 'deployment' folder not found in current directory" -ForegroundColor Red
        Write-Host "Please run this script from your project root directory" -ForegroundColor Red
        exit 1
    }

    # Create ZIP archive
    Compress-Archive -Path $deploymentFiles -DestinationPath $zipPath -Force
    Write-Host "✅ Created deployment package: $zipPath" -ForegroundColor Green
    
    # Show package size
    $size = (Get-Item $zipPath).Length / 1MB
    Write-Host "📊 Package size: $([math]::Round($size, 2)) MB" -ForegroundColor Gray
    
} catch {
    Write-Host "❌ Error creating deployment package: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Upload to server
Write-Host "\n📤 Uploading to Digital Ocean server..." -ForegroundColor Yellow

try {
    # Check if scp is available
    $scpPath = Get-Command scp -ErrorAction SilentlyContinue
    if (-not $scpPath) {
        Write-Host "❌ Error: 'scp' command not found" -ForegroundColor Red
        Write-Host "Please install OpenSSH client or use WinSCP for manual upload" -ForegroundColor Yellow
        Write-Host "Upload $zipPath to $Username@$ServerIP:/tmp/" -ForegroundColor Yellow
        exit 1
    }
    
    # Upload file
    scp $zipPath "$Username@$ServerIP":/tmp/
    Write-Host "✅ Upload completed successfully" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Error uploading file: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "You can manually upload $zipPath to your server" -ForegroundColor Yellow
    exit 1
}

# Step 3: Show next steps
Write-Host "\n🎯 Next Steps:" -ForegroundColor Cyan
Write-Host "1. SSH to your server: ssh $Username@$ServerIP" -ForegroundColor White
Write-Host "2. Run the server deployment commands (see guide below)" -ForegroundColor White
Write-Host "\n📋 Server Commands:" -ForegroundColor Cyan

$serverCommands = @"
cd /tmp
unzip -o azload_deployment.zip
cp -r deployment/* /opt/azload/
cp -r ml_pipeline/* /opt/azload/ml_pipeline/
cd /opt/azload/ml_pipeline
source ../venv/bin/activate
pip install -r requirements.txt
python train_model.py
systemctl restart azload-ml
systemctl status azload-ml
"@

Write-Host $serverCommands -ForegroundColor Gray
Write-Host "\n🎉 Deployment package ready!" -ForegroundColor Green
```

### **Run the Windows Deployment Script:**
```powershell
# Save the script above as 'deploy_to_digital_ocean.ps1'
# Then run it with:
powershell -ExecutionPolicy Bypass -File deploy_to_digital_ocean.ps1

# Or if you want to specify a different server:
powershell -ExecutionPolicy Bypass -File deploy_to_digital_ocean.ps1 -ServerIP "your.server.ip" -Username "root"
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

### **Windows-Specific Commands:**
```powershell
# Create deployment package (PowerShell)
Compress-Archive -Path deployment -DestinationPath azload_deployment.zip -Force

# Upload using SCP (if OpenSSH installed)
scp azload_deployment.zip root@178.128.135.194:/tmp/

# Alternative: Use WinSCP GUI tool
# Download from: https://winscp.net/

# Check if OpenSSH is installed
Get-Command ssh -ErrorAction SilentlyContinue
Get-Command scp -ErrorAction SilentlyContinue

# Install OpenSSH on Windows 10/11 (run as Administrator)
Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0
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

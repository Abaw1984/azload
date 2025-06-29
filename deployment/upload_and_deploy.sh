#!/bin/bash

# AZLOAD ML API COMPLETE DEPLOYMENT SCRIPT
# This script provides CLEAR instructions and handles all deployment steps

set -e  # Exit on any error

# Ensure we're running with proper privileges
if [[ $EUID -ne 0 ]]; then
   echo "❌ This script must be run as root (use sudo)"
   exit 1
fi

# Set PATH to include common system directories
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH"

echo "🚀 AZLOAD ML API DEPLOYMENT SCRIPT"
echo "⏰ Started at: $(date)"
echo ""
echo "📋 IMPORTANT: Before running this script, you MUST:"
echo "   1. Upload your corrected api_server.py to /tmp/ on the server"
echo "   2. Command: scp api_server.py root@YOUR_SERVER_IP:/tmp/"
echo "   3. Then run this script"
echo ""
read -p "Have you uploaded api_server.py to /tmp/? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Please upload api_server.py first:"
    echo "   scp api_server.py root@YOUR_SERVER_IP:/tmp/"
    echo "   Then run this script again."
    exit 1
fi

# Verify the file exists
if [ ! -f "/tmp/api_server.py" ]; then
    echo "❌ ERROR: /tmp/api_server.py not found!"
    echo "Please upload your file:"
    echo "   scp api_server.py root@YOUR_SERVER_IP:/tmp/"
    exit 1
fi

echo "✅ Found api_server.py in /tmp/"
echo ""

# Function to kill processes with timeout
kill_processes_with_timeout() {
    echo "🔍 Stopping existing processes..."
    
    # Kill Python processes
    timeout 10 pkill -f "python.*api_server" || echo "No API server processes found"
    timeout 10 pkill -f "python.*8000" || echo "No processes on port 8000 found"
    
    # Stop services (check if systemctl exists)
    if command -v systemctl >/dev/null 2>&1; then
        timeout 10 systemctl stop azload-ml 2>/dev/null || echo "azload-ml service not active"
        timeout 10 systemctl stop azload-ml-api 2>/dev/null || echo "azload-ml-api service not active"
    else
        echo "⚠️  systemctl not found, skipping service stop"
    fi
    
    # Force kill port 8000 (check if fuser exists)
    if command -v fuser >/dev/null 2>&1; then
        timeout 10 fuser -k 8000/tcp 2>/dev/null || echo "Port 8000 is free"
    else
        echo "⚠️  fuser not found, trying alternative port cleanup"
        # Alternative: find and kill processes using port 8000
        if command -v lsof >/dev/null 2>&1; then
            PID=$(lsof -ti:8000 2>/dev/null || true)
            if [ ! -z "$PID" ]; then
                kill -9 $PID 2>/dev/null || true
                echo "✅ Killed process on port 8000: $PID"
            fi
        fi
    fi
    
    sleep 3
    echo "✅ Process cleanup completed"
}

# Function to install dependencies with robust error handling
install_dependencies_robust() {
    echo "📦 Installing Python dependencies..."
    
    # Create directories if they don't exist
    if [ ! -d "/opt/azload" ]; then
        echo "📁 Creating /opt/azload directory..."
        mkdir -p /opt/azload
        chown azload:azload /opt/azload 2>/dev/null || echo "⚠️  azload user not found, using root"
    fi
    
    if [ ! -d "/opt/azload/ml_pipeline" ]; then
        echo "📁 Creating /opt/azload/ml_pipeline directory..."
        mkdir -p /opt/azload/ml_pipeline
        chown azload:azload /opt/azload/ml_pipeline 2>/dev/null || echo "⚠️  azload user not found, using root"
    fi
    
    cd /opt/azload/ml_pipeline
    
    # Create and activate virtual environment
    if [ ! -d "/opt/azload/venv" ]; then
        echo "🔧 Creating virtual environment..."
        python3 -m venv /opt/azload/venv
        chown -R azload:azload /opt/azload/venv 2>/dev/null || echo "⚠️  azload user not found, using root"
    fi
    
    echo "🔧 Activating virtual environment..."
    source /opt/azload/venv/bin/activate
    
    # Create requirements.txt if it doesn't exist
    if [ ! -f "requirements.txt" ]; then
        echo "📝 Creating requirements.txt..."
        cat > requirements.txt << 'EOF'
fastapi==0.104.0
uvicorn==0.23.2
python-multipart==0.0.6
python-dotenv==1.0.0
numpy>=1.21.0,<1.26.0
pandas>=1.5.0,<2.1.0
scikit-learn==1.3.0
joblib==1.3.2
EOF
    fi
    
    # Upgrade pip with timeout
    echo "📦 Upgrading pip..."
    timeout 300 python3 -m pip install --upgrade pip || {
        echo "⚠️  Pip upgrade timed out, continuing..."
    }
    
    # Install requirements with multiple fallback strategies
    echo "📦 Installing requirements (this may take 5-10 minutes)..."
    
    # Strategy 1: Try compatible numpy/pandas versions first
    echo "📦 Installing compatible numpy and pandas versions..."
    if timeout 600 python3 -m pip install "numpy>=1.21.0,<1.26.0" "pandas>=1.5.0,<2.1.0" --timeout 300; then
        echo "✅ Compatible numpy/pandas installed"
        
        # Now install remaining requirements
        echo "📦 Installing remaining requirements..."
        if timeout 600 python3 -m pip install -r requirements.txt --timeout 300; then
            echo "✅ All dependencies installed successfully"
            return 0
        fi
    fi
    
    echo "⚠️  Compatible versions failed, trying with --no-build-isolation..."
    
    # Strategy 2: No build isolation (helps with pandas build issues)
    if timeout 600 python3 -m pip install -r requirements.txt --no-build-isolation --timeout 300; then
        echo "✅ Dependencies installed with no-build-isolation"
        return 0
    fi
    
    echo "⚠️  No-build-isolation failed, trying with --no-cache-dir..."
    
    # Strategy 3: No cache install
    if timeout 600 python3 -m pip install -r requirements.txt --no-cache-dir --timeout 300; then
        echo "✅ Dependencies installed with no-cache"
        return 0
    fi
    
    echo "⚠️  Standard methods failed, installing core packages individually..."
    
    # Strategy 4: Install core packages individually with compatible versions
    declare -A PACKAGE_VERSIONS=(
        ["fastapi"]="0.104.0"
        ["uvicorn"]="0.23.2"
        ["python-multipart"]="0.0.6"
        ["python-dotenv"]="1.0.0"
        ["numpy"]="1.24.3"
        ["pandas"]="1.5.3"
        ["scikit-learn"]="1.3.0"
        ["joblib"]="1.3.2"
    )
    
    for package in "${!PACKAGE_VERSIONS[@]}"; do
        version="${PACKAGE_VERSIONS[$package]}"
        echo "📦 Installing $package==$version..."
        timeout 300 python3 -m pip install "$package==$version" --timeout 180 || {
            echo "⚠️  Failed to install $package==$version, trying latest..."
            timeout 300 python3 -m pip install "$package" --timeout 180 || {
                echo "⚠️  Failed to install $package, continuing..."
            }
        }
    done
    
    # Strategy 5: Install any remaining packages from requirements.txt
    echo "📦 Installing any remaining packages..."
    while IFS= read -r line; do
        if [[ $line =~ ^[a-zA-Z] ]]; then
            package_name=$(echo "$line" | cut -d'=' -f1 | cut -d'>' -f1 | cut -d'<' -f1)
            if ! python3 -c "import $package_name" 2>/dev/null; then
                echo "📦 Installing missing package: $line"
                timeout 300 python3 -m pip install "$line" --timeout 180 || {
                    echo "⚠️  Failed to install $line, continuing..."
                }
            fi
        fi
    done < requirements.txt
    
    echo "✅ Core dependencies installation completed"
}

# Step 1: Process cleanup
echo "📋 Step 1: Cleaning up existing processes..."
kill_processes_with_timeout

# Step 2: Backup existing file
echo "📋 Step 2: Creating backup..."
if [ -f "/opt/azload/ml_pipeline/api_server.py" ]; then
    BACKUP_NAME="api_server.py.backup.$(date +%Y%m%d_%H%M%S)"
    sudo cp /opt/azload/ml_pipeline/api_server.py "/opt/azload/ml_pipeline/$BACKUP_NAME"
    echo "✅ Backup created: $BACKUP_NAME"
else
    echo "⚠️  No existing api_server.py found to backup"
fi

# Step 3: Copy new file
echo "📋 Step 3: Installing new api_server.py..."
cp /tmp/api_server.py /opt/azload/ml_pipeline/api_server.py
chown azload:azload /opt/azload/ml_pipeline/api_server.py 2>/dev/null || echo "⚠️  azload user not found, using root ownership"
chmod 644 /opt/azload/ml_pipeline/api_server.py
echo "✅ New api_server.py installed"

# Step 4: Test file syntax
echo "📋 Step 4: Testing Python syntax..."
if python3 -m py_compile /opt/azload/ml_pipeline/api_server.py; then
    echo "✅ Python syntax is valid"
else
    echo "❌ Python syntax error in api_server.py!"
    echo "Please check your file and try again."
    exit 1
fi

# Step 5: Install dependencies
echo "📋 Step 5: Installing dependencies..."
install_dependencies_robust

# Step 6: Test API startup
echo "📋 Step 6: Testing API startup..."
cd /opt/azload/ml_pipeline

# Ensure port 8000 is completely free before testing
echo "🔍 Final port cleanup before API test..."
if command -v lsof >/dev/null 2>&1; then
    PIDS=$(lsof -ti:8000 2>/dev/null || true)
    if [ ! -z "$PIDS" ]; then
        echo "🔧 Killing processes on port 8000: $PIDS"
        echo "$PIDS" | xargs -r kill -9 2>/dev/null || true
        sleep 2
    fi
fi

# Double-check with netstat if available
if command -v netstat >/dev/null 2>&1; then
    if netstat -tlnp 2>/dev/null | grep -q ":8000 "; then
        echo "⚠️  Port 8000 still in use, attempting force cleanup..."
        # Try fuser again
        if command -v fuser >/dev/null 2>&1; then
            fuser -k 8000/tcp 2>/dev/null || true
            sleep 2
        fi
    fi
fi

echo "✅ Port 8000 cleanup completed"

# Start API in background for testing
echo "🔄 Starting API for testing..."
# Activate virtual environment first
source /opt/azload/venv/bin/activate
nohup python3 api_server.py > /tmp/api_test.log 2>&1 &
API_PID=$!
echo "🔄 API started with PID: $API_PID"

# Wait for startup with progress indicator
echo "⏳ Waiting for API to start..."
for i in {1..15}; do
    if curl -s --connect-timeout 5 http://localhost:8000/health > /dev/null 2>&1; then
        echo "✅ API is responding!"
        break
    fi
    echo "   Waiting... ($i/15)"
    sleep 2
done

# Test API endpoints
echo "🧪 Testing API endpoints..."
if curl -s --connect-timeout 10 http://localhost:8000/health > /dev/null; then
    echo "✅ Health endpoint working"
    
    # Test model-info endpoint
    echo "🧪 Testing model-info endpoint..."
    RESPONSE=$(curl -s --connect-timeout 10 http://localhost:8000/model-info 2>/dev/null || echo "{}")
    if echo "$RESPONSE" | grep -q "status\|model\|version" 2>/dev/null; then
        echo "✅ Model-info endpoint working"
    else
        echo "⚠️  Model-info endpoint not fully ready (this is normal)"
    fi
else
    echo "❌ API is not responding!"
    echo "📋 Checking logs:"
    if [ -f "/tmp/api_test.log" ]; then
        echo "📋 Last 20 lines of API test log:"
        tail -20 /tmp/api_test.log
    else
        echo "No log file found"
    fi
    
    echo "📋 Checking port status:"
    if command -v netstat >/dev/null 2>&1; then
        netstat -tlnp | grep 8000 || echo "No process found on port 8000"
    fi
    
    echo "📋 Checking running Python processes:"
    ps aux | grep python | grep -v grep || echo "No Python processes found"
    
    kill $API_PID 2>/dev/null || true
    exit 1
fi

# Stop test instance
echo "🛑 Stopping test instance..."
kill $API_PID 2>/dev/null || true
sleep 3

# Step 7: Start production service
echo "📋 Step 7: Starting production service..."

# Try to determine correct service name
SERVICE_NAME=""
if command -v systemctl >/dev/null 2>&1; then
    if systemctl list-unit-files 2>/dev/null | grep -q "azload-ml.service"; then
        SERVICE_NAME="azload-ml"
    elif systemctl list-unit-files 2>/dev/null | grep -q "azload-ml-api.service"; then
        SERVICE_NAME="azload-ml-api"
    fi
    
    if [ -n "$SERVICE_NAME" ]; then
        echo "🔄 Starting $SERVICE_NAME service..."
        if systemctl start $SERVICE_NAME; then
            echo "✅ Service started successfully"
            systemctl enable $SERVICE_NAME
            echo "✅ Service enabled for auto-start"
        else
            echo "⚠️  Service failed to start, running manually..."
            SERVICE_NAME="manual"
        fi
    else
        echo "⚠️  No systemd service found, running manually..."
        SERVICE_NAME="manual"
    fi
else
    echo "⚠️  systemctl not found, running manually..."
    SERVICE_NAME="manual"
fi

if [ "$SERVICE_NAME" = "manual" ]; then
    echo "🔄 Starting API manually..."
    cd /opt/azload/ml_pipeline
    
    # Final port cleanup before production start
    echo "🔍 Final port cleanup before production start..."
    if command -v lsof >/dev/null 2>&1; then
        PIDS=$(lsof -ti:8000 2>/dev/null || true)
        if [ ! -z "$PIDS" ]; then
            echo "🔧 Killing processes on port 8000: $PIDS"
            echo "$PIDS" | xargs -r kill -9 2>/dev/null || true
            sleep 2
        fi
    fi
    
    # Create log directory if it doesn't exist
    mkdir -p /var/log
    
    # Activate virtual environment and start API
    source /opt/azload/venv/bin/activate
    nohup python3 api_server.py > /var/log/azload-ml.log 2>&1 &
    echo "✅ API started manually"
fi

# Step 8: Final verification
echo "📋 Step 8: Final verification..."
sleep 5

# Check service status
if [ "$SERVICE_NAME" != "manual" ] && command -v systemctl >/dev/null 2>&1; then
    echo "🔍 Service status:"
    systemctl status $SERVICE_NAME --no-pager -l || true
fi

# Final API test
echo "🧪 Final API test..."
for i in {1..10}; do
    if curl -s --connect-timeout 5 http://localhost:8000/health > /dev/null 2>&1; then
        echo "✅ API is running successfully!"
        break
    fi
    echo "   Testing... ($i/10)"
    sleep 3
done

if curl -s --connect-timeout 10 http://localhost:8000/health > /dev/null; then
    echo ""
    echo "🎉 DEPLOYMENT SUCCESSFUL!"
    echo "⏰ Completed at: $(date)"
    echo ""
    echo "📊 API Endpoints:"
    echo "   Health: http://localhost:8000/health"
    echo "   Model Info: http://localhost:8000/model-info"
    echo "   Docs: http://localhost:8000/docs"
    echo ""
    echo "📋 Monitoring Commands:"
    if [ "$SERVICE_NAME" != "manual" ] && command -v systemctl >/dev/null 2>&1; then
        echo "   Status: systemctl status $SERVICE_NAME"
        echo "   Logs: journalctl -u $SERVICE_NAME -f"
        echo "   Restart: systemctl restart $SERVICE_NAME"
    else
        echo "   Logs: tail -f /var/log/azload-ml.log"
        echo "   Process: ps aux | grep api_server"
    fi
    echo "   Test: curl http://localhost:8000/health"
else
    echo "❌ DEPLOYMENT FAILED - API not responding"
    echo "📋 Troubleshooting:"
    if [ "$SERVICE_NAME" != "manual" ] && command -v systemctl >/dev/null 2>&1; then
        echo "   Check logs: journalctl -u $SERVICE_NAME -n 50"
    else
        echo "   Check logs: tail -50 /var/log/azload-ml.log"
    fi
    echo "   Check process: ps aux | grep python"
    echo "   Check port: netstat -tlnp | grep 8000"
    exit 1
fi
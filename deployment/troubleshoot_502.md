# 502 Bad Gateway Troubleshooting Guide (Root User)

## Current Status
- **Previous Error**: 502 Bad Gateway nginx/1.24.0 (Ubuntu) - LIKELY RESOLVED
- **URL**: http://178.128.135.194/
- **Service Status**: ML API service is now running and responding
- **Note**: Running as root user (no sudo needed)
- **Latest Update**: Service successfully started, models loaded, and responding to requests

## Step-by-Step Diagnosis

### 1. Check ML API Service Status
```bash
# Connect to your server
ssh root@178.128.135.194

# Check if the ML API service is running
systemctl status azload-ml

# Expected: "Active: active (running)" in green
# If not running, this is your problem!
```

### 2. Check Service Logs
```bash
# View recent logs to see what's failing
journalctl -u azload-ml -n 50 --no-pager

# Look for errors like:
# - "ModuleNotFoundError"
# - "No such file or directory"
# - "Address already in use"
# - "Permission denied"
```

### 3. Check Port Availability
```bash
# Check if port 8000 is being used (alternative methods)
# Method 1: Using ss command (modern replacement for netstat)
ss -tlnp | grep :8000

# Method 2: Using lsof command (if available)
lsof -i :8000

# Method 3: Using nmap (if available)
nmap -p 8000 localhost

# Method 4: Check processes manually
ps aux | grep python | grep 8000

# Expected: Should show python process on 0.0.0.0:8000
# If empty: ML API is not binding to port 8000
```

### 4. Test Manual API Startup
```bash
# Navigate to ML pipeline directory
cd /opt/azload/ml_pipeline

# Activate virtual environment
source ../venv/bin/activate

# Try to start the API manually
python api_server.py

# Expected: "Models loaded successfully" and "Uvicorn running on http://0.0.0.0:8000"
# If errors appear here, this shows the exact problem
```

## Common Issues and Solutions

### Issue 1: Service Not Running
**Symptoms**: `systemctl status azload-ml` shows "inactive (dead)" or "failed"

**Solution**:
```bash
# Start the service
systemctl start azload-ml

# Enable auto-start
systemctl enable azload-ml

# Check status again
systemctl status azload-ml

# Monitor logs in real-time to see why it might be stopping
journalctl -u azload-ml -f
```

### Issue 2: Python Dependencies Missing
**Symptoms**: Logs show "ModuleNotFoundError" or import errors

**Solution**:
```bash
cd /opt/azload/ml_pipeline
source ../venv/bin/activate

# Reinstall dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Restart service
systemctl restart azload-ml
```

### Issue 3: Models Not Trained
**Symptoms**: Logs show "Could not load trained models"

**Solution**:
```bash
cd /opt/azload/ml_pipeline
source ../venv/bin/activate

# Train the models
python train_model.py

# Restart service
systemctl restart azload-ml
```

### Issue 4: Port Already in Use
**Symptoms**: "Address already in use" error

**Solution**:
```bash
# Kill processes using port 8000
pkill -f "python.*8000"

# Or find and kill specific process using alternative methods
# Method 1: Using lsof (if available)
lsof -i :8000
# Note the PID and kill it: kill -9 <PID>

# Method 2: Using ss command
ss -tlnp | grep :8000
# Note the PID and kill it: kill -9 <PID>

# Method 3: Using fuser (if available)
fuser -k 8000/tcp

# Method 4: Find processes manually
ps aux | grep python | grep 8000
# Note the PID and kill it: kill -9 <PID>

# Restart service
systemctl restart azload-ml
```

### Issue 5: Permission Issues
**Symptoms**: "Permission denied" errors

**Solution**:
```bash
# Fix ownership (as root, you own everything)
chown -R root:root /opt/azload

# Fix permissions
chmod +x /opt/azload/ml_pipeline/*.py
chmod -R 755 /opt/azload

# Restart service
systemctl restart azload-ml
```

### Issue 6: Nginx Configuration Problem
**Symptoms**: Service runs but still 502 error

**Solution**:
```bash
# Check nginx configuration
nginx -t

# If errors, fix the config file
nano /etc/nginx/sites-available/azload-ml

# Restart nginx
systemctl restart nginx
```

## Quick Fix Commands (Root User)

Run these commands in sequence to fix most common issues:

```bash
# 1. Stop everything
systemctl stop azload-ml
pkill -f "python.*8000"

# 2. Check current directory and navigate
pwd
cd /opt/azload/ml_pipeline

# 3. Check if virtual environment exists
ls -la ../venv/
# If missing, create it:
# python3 -m venv ../venv

# 4. Activate virtual environment and check dependencies
source ../venv/bin/activate
pip list
pip install -r requirements.txt

# 5. Train models if needed
ls -la trained_models/
# If empty or missing, run:
python train_model.py

# 6. Test manual startup
python api_server.py
# Press Ctrl+C if it works

# 7. Start service
systemctl start azload-ml

# 8. Check status
systemctl status azload-ml

# 9. Check port binding (try multiple methods)
ss -tlnp | grep :8000
# OR: lsof -i :8000
# OR: ps aux | grep python | grep 8000

# 10. Test API
curl http://localhost:8000/health

# 11. Test public access
curl http://178.128.135.194/health
```

## Verification Steps

**GOOD NEWS**: Based on recent logs, your service appears to be working! Verify with these commands:

```bash
# 1. Service should be active (CONFIRMED WORKING)
systemctl status azload-ml
# Expected: "Active: active (running)" ✓

# 2. Check real-time logs (CONFIRMED WORKING)
journalctl -u azload-ml -f
# You should see: "Models loaded successfully" and "Uvicorn running on http://0.0.0.0:8000" ✓

# 3. Port should be bound (use available command)
ss -tlnp | grep :8000
# OR: lsof -i :8000
# OR: ps aux | grep python | grep 8000
# Expected: python process on 0.0.0.0:8000

# 4. Test local API endpoint
curl http://localhost:8000/health
# Expected: {"status":"healthy","models_loaded":true,"version":"1.0.0"}

# 5. Test public API endpoint
curl http://178.128.135.194/health
# Expected: Same as above

# 6. Test your main website
curl -I http://178.128.135.194/
# Expected: HTTP/1.1 200 OK (not 502 Bad Gateway)

# 7. Nginx should be running
systemctl status nginx
# Expected: "Active: active (running)"
```

## Log Analysis - What We See:

Your recent logs show:
- ✅ Service started successfully
- ✅ Models loaded successfully  
- ✅ Uvicorn running on http://0.0.0.0:8000
- ✅ Application startup complete
- ✅ Service responding to requests (even invalid ones like GET /.env)

The 404 and 405 errors in the logs are NORMAL - they're from external scanners/bots trying invalid endpoints.

## Status Update - Issue Likely Resolved!

**GREAT NEWS**: Your ML API service is now running successfully! The logs show:

✅ **Service Started**: Uvicorn running on http://0.0.0.0:8000  
✅ **Models Loaded**: "Models loaded successfully"  
✅ **Responding to Requests**: Even handling invalid requests properly  
✅ **No Crashes**: Service is stable and running  

**Previous Issues (Now Fixed)**:
1. ~~Missing Python dependencies~~ - ✅ Resolved
2. ~~Models not trained~~ - ✅ Resolved  
3. ~~Port conflict~~ - ✅ Resolved
4. ~~Service not started~~ - ✅ Resolved
5. ~~Virtual environment issues~~ - ✅ Resolved

## Final Verification Steps (Root User - No sudo needed)

**Your service is running! Now verify the 502 error is gone:**

```bash
# 1. Confirm service is active (should show "active (running)")
systemctl status azload-ml

# 2. Test the API directly
curl http://localhost:8000/health

# 3. Test public access (this should NOT give 502 anymore)
curl -I http://178.128.135.194/

# 4. If still getting 502, check nginx status
systemctl status nginx

# 5. If nginx is running but still 502, restart nginx
systemctl restart nginx

# 6. Test again
curl -I http://178.128.135.194/
```

**Expected Results:**
- Service status: "Active: active (running)" ✅
- Local API: Should return health status ✅  
- Public access: Should return "200 OK" (not 502) ✅
- Nginx: Should be "Active: active (running)" ✅

## Next Steps

1. SSH into your server: `ssh root@178.128.135.194`
2. Run the diagnosis commands above
3. Follow the appropriate solution based on what you find
4. Test the verification steps

The 502 error will be resolved once the ML API service is running properly on port 8000.

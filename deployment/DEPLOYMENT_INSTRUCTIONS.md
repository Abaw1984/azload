# AZLOAD ML API DEPLOYMENT INSTRUCTIONS

## STEP-BY-STEP DEPLOYMENT GUIDE

### BEFORE YOU START

**YOU MUST UPLOAD THE CORRECTED API_SERVER.PY FILE FIRST!**

### Step 1: Upload the Corrected File

```bash
# From your local machine, upload the corrected api_server.py
scp api_server.py root@YOUR_SERVER_IP:/tmp/
```

**Replace `YOUR_SERVER_IP` with your actual server IP address**

### Step 2: Connect to Your Server

```bash
ssh root@YOUR_SERVER_IP
```

### Step 3: Run the Deployment Script

```bash
cd /path/to/your/deployment/folder
chmod +x upload_and_deploy.sh
./upload_and_deploy.sh
```

### What the Script Does:

1. **Checks for the uploaded file** - Verifies `/tmp/api_server.py` exists
2. **Stops existing services** - Cleanly shuts down running API processes
3. **Creates backup** - Saves your current api_server.py
4. **Installs new file** - Copies and sets permissions
5. **Tests syntax** - Validates Python code
6. **Installs dependencies** - Handles stuck installations with multiple strategies
7. **Tests API** - Starts API temporarily to verify it works
8. **Starts production** - Launches the service properly
9. **Final verification** - Confirms everything is working

### If Installation Gets Stuck:

The script has built-in handling for stuck installations:
- Uses timeouts to prevent hanging
- Falls back to no-cache installation
- Installs core packages individually if needed
- Provides clear progress updates

### After Successful Deployment:

**Test your API:**
```bash
curl http://localhost:8000/health
curl http://localhost:8000/model-info
```

**Monitor your API:**
```bash
# If using systemd service:
sudo systemctl status azload-ml
sudo journalctl -u azload-ml -f

# If running manually:
tail -f /var/log/azload-ml.log
ps aux | grep api_server
```

### Troubleshooting:

**If deployment fails:**
1. Check the error messages in the script output
2. Look at the logs:
   ```bash
   sudo journalctl -u azload-ml -n 50
   # OR
   tail -50 /var/log/azload-ml.log
   ```
3. Verify the file was uploaded correctly:
   ```bash
   ls -la /tmp/api_server.py
   ```

**Common Issues:**
- **File not found**: Make sure you uploaded `api_server.py` to `/tmp/`
- **Permission denied**: The script handles permissions automatically
- **Port in use**: The script kills existing processes
- **Dependencies stuck**: The script uses multiple installation strategies

### Manual Restart (if needed):

```bash
# Stop everything
sudo systemctl stop azload-ml
pkill -f "python.*api_server"

# Start again
sudo systemctl start azload-ml
# OR manually:
cd /opt/azload/ml_pipeline
sudo -u azload python3 api_server.py &
```

---

## REMEMBER: Always upload your api_server.py file to /tmp/ BEFORE running the deployment script!
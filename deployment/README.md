# AZLOAD ML Pipeline Deployment Guide

## 🚀 Complete Step-by-Step Setup (No Local Files Required)

Since all your files are in the Tempo codebase, I'll handle the entire deployment process for you. Here's what will happen:

### Step 1: Access Your DigitalOcean Droplet

**You'll need to SSH into your droplet. Here's how:**

1. **Open Terminal/Command Prompt:**
   - **Windows**: Press `Win + R`, type `cmd`, press Enter
   - **Mac**: Press `Cmd + Space`, type "Terminal", press Enter
   - **Linux**: Press `Ctrl + Alt + T`

2. **Connect to your droplet:**
   ```bash
   ssh root@178.128.135.194
   ```
   
   **Password Required**: Yes, you'll need to enter the root password for your DigitalOcean droplet. This was set when you created the droplet or sent to your email.

### Step 2: Automated Setup (I'll provide all commands)

Once you're connected via SSH, I'll give you the exact commands to run. The process will:

1. **Create all necessary files directly on the server**
2. **Set up Python environment and dependencies**
3. **Generate synthetic training data**
4. **Train the ML models**
5. **Start the API service**
6. **Configure Nginx reverse proxy**
7. **Set up firewall and security**

### Step 3: What You'll See

```bash
🚀 Setting up AZLOAD ML Pipeline Server...
📦 Installing ML dependencies...
📊 Generating training data...
🎯 Training ML models...
🌐 Configuring Nginx...
🔒 Configuring firewall...
✅ Server setup complete!
```

### Step 4: Verification

After setup, your ML API will be available at:
- **Health Check**: http://178.128.135.194/health
- **Model Info**: http://178.128.135.194/model-info
- **Building Classification**: http://178.128.135.194/classify-building
- **Member Classification**: http://178.128.135.194/classify-members

## 📋 What You Need

1. **DigitalOcean Droplet Access**: Root password for 178.128.135.194
2. **Terminal/Command Prompt**: To run SSH commands
3. **5-10 minutes**: For the automated setup process

## 🔧 Technical Details

- **Droplet**: Ubuntu 22.04 LTS
- **ML Stack**: Python 3.10, scikit-learn, XGBoost, LightGBM
- **API**: FastAPI with Uvicorn
- **Web Server**: Nginx reverse proxy
- **Models**: Ensemble classifiers (RF + XGB + LGB)
- **Compliance**: AISC 360 & ASCE 7-16 standards

## 🚨 Important Notes

- **No local files needed**: Everything is created directly on the server
- **Password required**: You'll need your DigitalOcean root password
- **Automatic startup**: Service will start automatically and restart on reboot
- **Production ready**: Includes proper error handling and monitoring

## Service Management

```bash
# Check service status
sudo systemctl status azload-ml

# View logs
sudo journalctl -u azload-ml -f

# Restart service
sudo systemctl restart azload-ml

# Stop service
sudo systemctl stop azload-ml
```

## API Endpoints

Once running, your ML API will be available at:

- Health check: `http://178.128.135.194/health`
- Building classification: `http://178.128.135.194/classify-building`
- Member classification: `http://178.128.135.194/classify-members`
- Model validation: `http://178.128.135.194/validate-model`

## Monitoring

```bash
# Check system resources
htop

# Check disk usage
df -h

# Check memory usage
free -h

# Check API response
curl http://localhost:8000/health
```

## Troubleshooting

### Service won't start
```bash
# Check logs for errors
sudo journalctl -u azload-ml -n 50

# Check if port is in use
sudo netstat -tlnp | grep :8000
```

### Out of memory
```bash
# Check memory usage
free -h

# Consider upgrading to 8GB droplet if needed
```

### API not accessible
```bash
# Check nginx status
sudo systemctl status nginx

# Check firewall
sudo ufw status

# Test local connection
curl http://localhost:8000/health
```

## Security Notes

- The setup includes basic firewall configuration
- Consider adding SSL/TLS certificate for production
- Regularly update the system: `sudo apt update && sudo apt upgrade`
- Monitor logs for unusual activity

## Cost Optimization

- Start with 4GB droplet ($24/month)
- Monitor resource usage with `htop` and `df -h`
- Upgrade to 8GB ($48/month) only if needed
- Consider enabling backups ($4.80/month) for production

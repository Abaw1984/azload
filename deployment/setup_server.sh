#!/bin/bash

# AZLOAD ML Pipeline Server Setup Script
# Run this on your Digital Ocean Ubuntu 22.04 droplet

set -e

echo "🚀 Setting up AZLOAD ML Pipeline Server..."

# Update system
sudo apt update && sudo apt upgrade -y

# Install Python 3.10 and pip
sudo apt install -y python3.10 python3.10-venv python3-pip git nginx ufw

# Create application directory
sudo mkdir -p /opt/azload
sudo chown $USER:$USER /opt/azload
cd /opt/azload

# Clone or upload your ML pipeline code
echo "📁 Setting up ML pipeline directory..."
mkdir -p ml_pipeline

# Create Python virtual environment
python3.10 -m venv venv
source venv/bin/activate

# Install ML dependencies
echo "📦 Installing ML dependencies..."
pip install --upgrade pip
pip install scikit-learn==1.3.2 xgboost==2.0.3 numpy==1.24.3 pandas==2.0.3
pip install fastapi==0.104.1 uvicorn==0.24.0 pydantic==2.5.0
pip install scipy==1.11.4 matplotlib==3.7.2 seaborn==0.12.2
pip install joblib==1.3.2 requests==2.31.0

# Create systemd service
echo "⚙️ Creating systemd service..."
sudo tee /etc/systemd/system/azload-ml.service > /dev/null <<EOF
[Unit]
Description=AZLOAD ML Pipeline API
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/opt/azload/ml_pipeline
Environment=PATH=/opt/azload/venv/bin
ExecStart=/opt/azload/venv/bin/python api_server.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Configure Nginx reverse proxy
echo "🌐 Configuring Nginx..."
sudo tee /etc/nginx/sites-available/azload-ml > /dev/null <<EOF
server {
    listen 80;
    server_name _;
    
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # CORS headers
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
        add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization";
        
        if (\$request_method = 'OPTIONS') {
            return 204;
        }
    }
}
EOF

# Enable Nginx site
sudo ln -sf /etc/nginx/sites-available/azload-ml /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# Configure firewall
echo "🔒 Configuring firewall..."
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

echo "✅ Server setup complete!"
echo "📋 Next steps:"
echo "1. Upload your ML pipeline files to /opt/azload/ml_pipeline/"
echo "2. Generate training data and train models"
echo "3. Start the service with: sudo systemctl start azload-ml"
echo "4. Enable auto-start with: sudo systemctl enable azload-ml"
echo "5. Check status with: sudo systemctl status azload-ml"

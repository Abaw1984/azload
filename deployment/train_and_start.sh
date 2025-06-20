#!/bin/bash

# Script to train models and start the ML API server
# Run this on the Digital Ocean droplet after uploading files

set -e

echo "🤖 Training ML models and starting API server..."

cd /opt/azload/ml_pipeline
source ../venv/bin/activate

# Generate synthetic training data
echo "📊 Generating training data..."
python data_preparation.py

# Train the ML models
echo "🎯 Training ML models..."
python train_model.py

# Test the API server
echo "🧪 Testing API server..."
python -c "import api_server; print('API server imports successfully')"

# Start the systemd service
echo "🚀 Starting ML API service..."
sudo systemctl daemon-reload
sudo systemctl enable azload-ml
sudo systemctl start azload-ml

# Check service status
sudo systemctl status azload-ml

echo "✅ ML Pipeline is now running!"
echo "🌐 API available at: http://$(curl -s ifconfig.me)/health"
echo "📊 Check logs with: sudo journalctl -u azload-ml -f"

# Production ML Pipeline Commands Reference

## Quick Production Setup

```bash
# Run the production setup script
bash deployment/docker-setup.sh

# Deploy the full stack
cd /opt/azload-ml
./deploy.sh production
```

## Production Deployment

### Full Stack Deployment
```bash
# Deploy with Docker Compose
cd deployment
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

### Manual Docker Commands
```bash
# Build production image
docker build -f Dockerfile.ml -t azload-ml-api .

# Run with production settings
docker run -d \
  --name azload-ml-production \
  -p 8000:8000 \
  -v $(pwd)/uploads:/app/uploads \
  -v $(pwd)/models:/app/models \
  -e SECRET_KEY=your_strong_secret_here \
  azload-ml-api
```

## API Usage Examples

### Authentication
```bash
# Get access token
curl -X POST "http://localhost:8000/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=adminpassword"

# Response: {"access_token": "...", "token_type": "bearer"}
```

### File Upload and Training
```bash
# Upload STAAD file
curl -X POST "http://localhost:8000/upload" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@model.std"

# Start training
curl -X POST "http://localhost:8000/train?job_id=JOB_ID&epochs=50" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check training status
curl "http://localhost:8000/status/JOB_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get results
curl "http://localhost:8000/results/JOB_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Health Monitoring
```bash
# Health check (no auth required)
curl http://localhost:8000/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000000",
  "version": "1.0.0",
  "models_loaded": true
}
```

## Frontend Integration

### JavaScript API Client
```javascript
// Authentication
const API_URL = "http://YOUR_SERVER:8000";

async function login() {
  const response = await fetch(`${API_URL}/token`, {
    method: "POST",
    headers: {"Content-Type": "application/x-www-form-urlencoded"},
    body: new URLSearchParams({
      username: "admin",
      password: "adminpassword"
    })
  });
  const data = await response.json();
  localStorage.setItem("access_token", data.access_token);
  return data.access_token;
}

// File upload
async function uploadFile(file) {
  const token = localStorage.getItem("access_token");
  const formData = new FormData();
  formData.append("file", file);
  
  const response = await fetch(`${API_URL}/upload`, {
    method: "POST",
    headers: {"Authorization": `Bearer ${token}`},
    body: formData
  });
  return response.json();
}

// Start training
async function startTraining(jobId, epochs=50) {
  const token = localStorage.getItem("access_token");
  const response = await fetch(`${API_URL}/train?job_id=${jobId}&epochs=${epochs}`, {
    method: "POST",
    headers: {"Authorization": `Bearer ${token}`}
  });
  return response.json();
}

// Monitor training progress
async function monitorTraining(jobId, callback) {
  const token = localStorage.getItem("access_token");
  
  const interval = setInterval(async () => {
    const response = await fetch(`${API_URL}/status/${jobId}`, {
      headers: {"Authorization": `Bearer ${token}`}
    });
    const status = await response.json();
    callback(status);
    
    if (status.status === "completed" || status.status === "failed") {
      clearInterval(interval);
    }
  }, 2000);
}
```

## Production Management

### Service Management
```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Restart services
docker-compose restart

# Update services
docker-compose pull
docker-compose up -d --force-recreate
```

### Monitoring and Logs
```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f ml-api

# Check resource usage
docker stats

# Check disk usage
docker system df
```

### Backup and Maintenance
```bash
# Backup models and uploads
tar -czf backup-$(date +%Y%m%d).tar.gz uploads/ models/

# Clean up old containers and images
docker system prune -f

# Update system packages
sudo apt update && sudo apt upgrade -y
```

## Security Configuration

### SSL/TLS Setup
```bash
# Generate self-signed certificate (for testing)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/key.pem -out ssl/cert.pem

# For production, use Let's Encrypt
sudo apt install certbot
sudo certbot certonly --standalone -d yourdomain.com
```

### Environment Security
```bash
# Change default credentials
# Edit .env file and update SECRET_KEY

# Set proper file permissions
chmod 600 .env
chmod 700 ssl/

# Configure firewall
sudo ufw enable
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
```

## Troubleshooting

### Common Issues
```bash
# Port already in use
sudo lsof -i :8000
sudo kill -9 PID

# Docker permission denied
sudo usermod -aG docker $USER
newgrp docker

# Out of disk space
docker system prune -a
docker volume prune
```

### Performance Optimization
```bash
# Increase file upload limits
# Edit nginx.conf: client_max_body_size 500M;

# Monitor memory usage
free -h
docker stats --no-stream

# Optimize Docker resources
# Edit docker-compose.yml to add resource limits
```

## Integration with Tempo.new UI

### Environment Variables
```bash
# In your Tempo.new project, set:
VITE_ML_API_URL=http://your-server:8000
VITE_ML_API_ENABLED=true
```

### API Integration Points
```typescript
// Update src/lib/ai-classifier.ts
const ML_API_BASE_URL = import.meta.env.VITE_ML_API_URL || "http://localhost:8000";

// The existing AIBuildingClassifier will automatically use your API
```

## Production Checklist

- [ ] SSL certificates configured
- [ ] Default credentials changed
- [ ] Firewall rules configured
- [ ] Backup strategy implemented
- [ ] Monitoring setup
- [ ] Log rotation configured
- [ ] Resource limits set
- [ ] Health checks working
- [ ] API documentation accessible
- [ ] Integration with frontend tested

## Support and Maintenance

### Regular Tasks
```bash
# Weekly: Update system and containers
sudo apt update && sudo apt upgrade -y
docker-compose pull && docker-compose up -d

# Monthly: Clean up unused resources
docker system prune -a

# Quarterly: Review logs and performance
docker-compose logs --since 24h | grep ERROR
```

This production-ready ML pipeline provides secure, scalable, and maintainable infrastructure for your AZLOAD structural analysis platform.

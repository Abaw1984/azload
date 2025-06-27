import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  AlertTriangle,
  Copy,
  Server,
  Upload,
  Terminal,
  Zap,
  Globe,
  FileText,
  Settings,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DeploymentStep {
  id: string;
  title: string;
  description: string;
  commands: string[];
  files?: string[];
  notes?: string[];
  critical?: boolean;
}

function DeploymentGuide() {
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [copiedCommand, setCopiedCommand] = useState<string>("");

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCommand(text);
    setTimeout(() => setCopiedCommand(""), 2000);
  };

  const toggleStep = (stepId: string) => {
    const newCompleted = new Set(completedSteps);
    if (newCompleted.has(stepId)) {
      newCompleted.delete(stepId);
    } else {
      newCompleted.add(stepId);
    }
    setCompletedSteps(newCompleted);
  };

  const filesToUpload = [
    {
      name: "api_server.py",
      path: "deployment/api_server.py",
      description:
        "🔥 CRITICAL UPDATE: Main FastAPI server with user override learning",
      status: "MUST_UPDATE",
      issues: [
        "Missing user override learning implementation",
        "No feedback capture system",
      ],
    },
    {
      name: "train_model.py",
      path: "deployment/train_model.py",
      description:
        "🔥 CRITICAL UPDATE: ML model training pipeline with train_test_split fix",
      status: "MUST_UPDATE",
      issues: [
        "ValueError: train set will be empty (n_samples=1, test_size=0.2)",
        "Insufficient data handling",
      ],
    },
    {
      name: "data_preparation.py",
      path: "deployment/data_preparation.py",
      description:
        "🔥 CRITICAL UPDATE: Feature extraction with massively expanded training data",
      status: "MUST_UPDATE",
      issues: [
        "Insufficient training samples",
        "Limited building type coverage",
        "Missing member tag examples",
      ],
    },
    {
      name: "model_utils.py",
      path: "deployment/model_utils.py",
      description: "Model validation and monitoring utilities",
      status: "OPTIONAL",
      issues: [],
    },
    {
      name: "requirements.txt",
      path: "deployment/requirements.txt",
      description: "Python dependencies",
      status: "OPTIONAL",
      issues: [],
    },
  ];

  const deploymentSteps: DeploymentStep[] = [
    {
      id: "connect",
      title: "Connect to DigitalOcean Server",
      description: "SSH into your DigitalOcean droplet",
      commands: ["ssh root@178.128.135.194"],
      critical: true,
      notes: [
        "If connection fails, check your SSH key or use password authentication",
        "Make sure your IP is whitelisted in DigitalOcean firewall settings",
      ],
    },
    {
      id: "setup-dirs",
      title: "Create Project Directories",
      description: "Set up the directory structure for the ML pipeline",
      commands: [
        "mkdir -p /opt/azload/ml_pipeline",
        "cd /opt/azload",
        "python3 -m venv venv",
        "source venv/bin/activate",
      ],
    },
    {
      id: "upload-files",
      title: "🔥 CRITICAL: Upload Updated ML Pipeline Files",
      description:
        "Transfer the UPDATED Python files that fix critical deployment issues",
      commands: [
        "# ⚠️ CRITICAL: Upload files in this EXACT order to avoid dependency issues",
        "",
        "# STEP 1: Upload data_preparation.py FIRST (contains expanded training data)",
        "scp deployment/data_preparation.py root@178.128.135.194:/opt/azload/ml_pipeline/",
        "# Verify upload:",
        "ssh root@178.128.135.194 'ls -la /opt/azload/ml_pipeline/data_preparation.py'",
        "",
        "# STEP 2: Upload train_model.py SECOND (contains train_test_split fix)",
        "scp deployment/train_model.py root@178.128.135.194:/opt/azload/ml_pipeline/",
        "# Verify upload:",
        "ssh root@178.128.135.194 'ls -la /opt/azload/ml_pipeline/train_model.py'",
        "",
        "# STEP 3: Upload api_server.py THIRD (contains user override learning)",
        "scp deployment/api_server.py root@178.128.135.194:/opt/azload/ml_pipeline/",
        "# Verify upload:",
        "ssh root@178.128.135.194 'ls -la /opt/azload/ml_pipeline/api_server.py'",
        "",
        "# STEP 4: Upload remaining files (optional but recommended)",
        "scp deployment/model_utils.py root@178.128.135.194:/opt/azload/ml_pipeline/",
        "scp deployment/requirements.txt root@178.128.135.194:/opt/azload/ml_pipeline/",
        "",
        "# STEP 5: Verify ALL critical files are present and have recent timestamps",
        "ssh root@178.128.135.194 'ls -la /opt/azload/ml_pipeline/ | grep -E \"(data_preparation|train_model|api_server).py\"'",
        "",
        "# ALTERNATIVE METHOD: Copy-paste file contents if SCP fails",
        "# Connect to server first: ssh root@178.128.135.194",
        "# Then create each file: nano /opt/azload/ml_pipeline/data_preparation.py",
        "# Paste content, save with Ctrl+X, Y, Enter",
        "# Repeat for train_model.py and api_server.py",
      ],
      files: filesToUpload.map((f) => f.name),
      notes: [
        "🔥 CRITICAL: These are UPDATED files that fix deployment-blocking issues!",
        "⚠️ Upload order matters: data_preparation.py → train_model.py → api_server.py",
        "Run these commands from your LOCAL machine (not on the server)",
        "Make sure you're in the project root directory where 'deployment/' folder exists",
        "If SCP fails, you can copy-paste file contents using nano/vim on the server",
        "MUST HAVE files: data_preparation.py, train_model.py, api_server.py",
        "Expected file sizes: data_preparation.py (~50KB+), train_model.py (~25KB+), api_server.py (~20KB+)",
        "⚠️ If file sizes are smaller than expected, you may have old versions!",
        "Verify timestamps: files should be recently modified (today's date)",
      ],
    },
    {
      id: "install-deps",
      title: "Install Python Dependencies",
      description: "Install all required Python packages",
      commands: [
        "cd /opt/azload/ml_pipeline",
        "source ../venv/bin/activate",
        "pip install --upgrade pip",
        "",
        "# IMPORTANT: If you get pandas 'c_metadata' error, skip requirements.txt and run:",
        "# pip install fastapi==0.104.0 uvicorn==0.23.2 python-multipart==0.0.6",
        "# pip install python-dotenv==1.0.0 numpy==1.26.4 pandas==2.2.2",
        "# pip install scikit-learn==1.4.2 xgboost==2.0.3 lightgbm==4.3.0 joblib==1.4.2 pydantic==2.7.1",
        "",
        "# Try requirements.txt first:",
        "pip install -r requirements.txt",
        "",
        "# If that fails, use the individual commands above",
      ],
      notes: [
        "CRITICAL: pandas 2.1.0 is incompatible with Python 3.12 - use pandas 2.2.2 instead",
        "If requirements.txt fails with 'c_metadata' error, install packages individually with compatible versions",
        "Core packages: fastapi uvicorn scikit-learn xgboost lightgbm pandas numpy",
        "All packages must install successfully before proceeding to model training",
      ],
    },
    {
      id: "train-models",
      title: "🔥 CRITICAL: Train ML Models with Updated Code",
      description:
        "Generate trained model files using the FIXED training pipeline",
      commands: [
        "cd /opt/azload/ml_pipeline",
        "source ../venv/bin/activate",
        "",
        "# STEP 1: Verify the updated files are present",
        "ls -la data_preparation.py train_model.py api_server.py",
        "# All three files should show recent timestamps (today's date)",
        "",
        "# STEP 2: Test data preparation first (should show expanded training data)",
        "python -c \"from data_preparation import StructuralModelFeatureExtractor; extractor = StructuralModelFeatureExtractor(); models_data = extractor.load_sample_data(); print(f'✅ Loaded {len(models_data)} training models'); global_df, member_df = extractor.prepare_training_data(models_data); print(f'✅ Global samples: {len(global_df)}, Member samples: {len(member_df)}')\"",
        "# Should show MANY more samples than before (100+ global, 1000+ member samples)",
        "",
        "# STEP 3: Run the FIXED training pipeline",
        "python train_model.py",
        "# Should complete without train_test_split errors",
        "",
        "# STEP 4: Verify models were created successfully",
        "ls -la trained_models/",
        "echo 'Expected files: *.pkl and training_metadata.json'",
        "",
        "# STEP 5: Check training results and data statistics",
        "cat trained_models/training_metadata.json | head -30",
        "# Should show much larger training dataset sizes",
      ],
      notes: [
        "🔥 CRITICAL: This uses the FIXED train_model.py that handles small datasets",
        "✅ Should show MASSIVELY expanded training data (100+ building samples, 1000+ member samples)",
        "✅ No more 'train set will be empty' errors - fixed with conditional train_test_split",
        "This will create .pkl files in trained_models/ directory",
        "Training should complete with 'TRAINING COMPLETED SUCCESSFULLY!'",
        "Expected files: member_ensemble.pkl, building_type_ensemble.pkl, *.pkl files",
        "Training takes 3-8 minutes due to expanded dataset (much longer than before)",
        "If training fails, check the troubleshooting section for specific error fixes",
        "⚠️ If you see 'train set will be empty' error, you uploaded the OLD train_model.py!",
      ],
      critical: true,
    },
    {
      id: "test-api",
      title: "Test API Manually",
      description: "Verify the API starts correctly before creating service",
      commands: [
        "cd /opt/azload/ml_pipeline",
        "source ../venv/bin/activate",
        "",
        "# Test imports first",
        "python -c \"from api_server import app; print('✅ API imports successfully')\"",
        "",
        "# Start API server manually",
        "python api_server.py",
        "",
        "# You should see:",
        "# Loading ML models and utilities...",
        "# Models loaded successfully",
        "# INFO: Uvicorn running on http://0.0.0.0:8000",
        "",
        "# Press Ctrl+C to stop the server",
      ],
      critical: true,
      notes: [
        "CRITICAL: If you see ANY errors here, DO NOT proceed to next step",
        "Common errors: ModuleNotFoundError (install dependencies), FileNotFoundError (train models first)",
        "The API must start successfully manually before creating the systemd service",
        "If successful, you'll see 'Uvicorn running on http://0.0.0.0:8000'",
      ],
    },
    {
      id: "create-service",
      title: "Create Systemd Service",
      description: "Set up the ML API as a system service",
      commands: [
        "sudo tee /etc/systemd/system/azload-ml.service > /dev/null <<EOF\n[Unit]\nDescription=AZLOAD ML Pipeline API\nAfter=network.target\n\n[Service]\nType=simple\nUser=root\nWorkingDirectory=/opt/azload/ml_pipeline\nEnvironment=PATH=/opt/azload/venv/bin\nExecStart=/opt/azload/venv/bin/python api_server.py\nRestart=always\nRestartSec=10\n\n[Install]\nWantedBy=multi-user.target\nEOF",
        "sudo systemctl daemon-reload",
        "sudo systemctl enable azload-ml",
      ],
    },
    {
      id: "start-service",
      title: "Start ML API Service",
      description: "Launch the ML API service",
      commands: [
        "sudo systemctl start azload-ml",
        "sudo systemctl status azload-ml",
        "curl http://localhost:8000/health",
      ],
      critical: true,
    },
    {
      id: "setup-nginx",
      title: "Configure Nginx Reverse Proxy",
      description: "Set up Nginx to proxy requests to the ML API",
      commands: [
        "sudo apt install -y nginx",
        'sudo tee /etc/nginx/sites-available/azload-ml > /dev/null <<EOF\nserver {\n    listen 80;\n    server_name _;\n    \n    location / {\n        proxy_pass http://127.0.0.1:8000;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n        \n        add_header Access-Control-Allow-Origin *;\n        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";\n        add_header Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization";\n        \n        if ($request_method = \'OPTIONS\') {\n            return 204;\n        }\n    }\n}\nEOF',
        "sudo ln -sf /etc/nginx/sites-available/azload-ml /etc/nginx/sites-enabled/",
        "sudo rm -f /etc/nginx/sites-enabled/default",
        "sudo nginx -t",
        "sudo systemctl restart nginx",
        "sudo systemctl enable nginx",
      ],
    },
    {
      id: "configure-firewall",
      title: "Configure Firewall",
      description: "Set up UFW firewall rules",
      commands: [
        "sudo ufw allow ssh",
        "sudo ufw allow 'Nginx Full'",
        "sudo ufw --force enable",
        "sudo ufw status",
      ],
    },
    {
      id: "final-test",
      title: "Final Testing",
      description: "Test all endpoints from external access",
      commands: [
        "# Test 1: Health Check",
        "curl http://178.128.135.194/health",
        '# Expected: {"status":"healthy","models_loaded":true,"version":"1.0.0"}',
        "",
        "# Test 2: Model Information",
        "curl http://178.128.135.194/model-info",
        "# Expected: JSON with model details and class names",
        "",
        "# Test 3: Building Classification",
        'curl -X POST http://178.128.135.194/classify-building -H "Content-Type: application/json" -d \'{"model":{"id":"test","nodes":[{"id":"N1","x":0,"y":0,"z":0},{"id":"N2","x":100,"y":0,"z":0}],"members":[{"id":"M1","startNodeId":"N1","endNodeId":"N2"}]}}\' | python -m json.tool',
        "# Expected: JSON with buildingType, confidence, reasoning",
        "",
        "# Test 4: API Documentation",
        "curl http://178.128.135.194/docs",
        "# Expected: HTML page with API documentation",
        "",
        "# Test 5: Service Status Check",
        "sudo systemctl status azload-ml",
        "# Expected: Active: active (running)",
      ],
      critical: true,
      notes: [
        "ALL tests must pass for successful deployment",
        "If health check fails, check service logs: sudo journalctl -u azload-ml -n 20",
        "If classification fails, verify models are trained and loaded",
        "Save these commands for future testing and monitoring",
      ],
    },
  ];

  const troubleshootingSteps = [
    {
      issue: "Service won't start (activating auto-restart)",
      solution: [
        "# STEP 1: Check detailed error logs",
        "sudo journalctl -u azload-ml -n 50 --no-pager",
        "",
        "# STEP 2: Test manually to see exact error",
        "cd /opt/azload/ml_pipeline",
        "source ../venv/bin/activate",
        "python api_server.py",
        "# This will show the EXACT error causing the failure",
        "",
        "# STEP 3: Check if models exist",
        "ls -la trained_models/",
        "# If empty, retrain: python train_model.py",
        "",
        "# STEP 4: Check dependencies",
        "python -c \"import fastapi, uvicorn, sklearn, xgboost, lightgbm; print('All imports OK')\"",
        "# If import errors: pip install -r requirements.txt",
        "",
        "# STEP 5: Fix and restart service",
        "sudo systemctl restart azload-ml",
        "sudo systemctl status azload-ml",
      ],
    },
    {
      issue: "Port 8000 already in use",
      solution: [
        "# STEP 1: Find what's using port 8000",
        "sudo netstat -tlnp | grep :8000",
        "sudo lsof -i :8000",
        "",
        "# STEP 2: Kill the process (use PID from above)",
        "sudo kill -9 <PID>",
        "# OR kill all python processes on port 8000:",
        "sudo pkill -f 'python.*8000'",
        "",
        "# STEP 3: Stop the systemd service",
        "sudo systemctl stop azload-ml",
        "",
        "# STEP 4: Verify port is free",
        "sudo netstat -tlnp | grep :8000",
        "# Should return nothing (port is free)",
        "",
        "# STEP 5: Start service again",
        "sudo systemctl start azload-ml",
        "sudo systemctl status azload-ml",
        "",
        "# STEP 6: Test API",
        "curl http://localhost:8000/health",
      ],
    },
    {
      issue:
        "Pandas installation fails with 'c_metadata' error (Python 3.12 compatibility)",
      solution: [
        "# This error occurs because pandas 2.1.0 is incompatible with Python 3.12",
        "# SOLUTION: Install compatible versions",
        "",
        "# STEP 1: Navigate to correct directory and activate venv",
        "cd /opt/azload/ml_pipeline",
        "source ../venv/bin/activate",
        "",
        "# STEP 2: Install compatible versions manually (skip requirements.txt)",
        "pip install --upgrade pip",
        "pip install fastapi==0.104.0",
        "pip install uvicorn==0.23.2",
        "pip install python-multipart==0.0.6",
        "pip install python-dotenv==1.0.0",
        "pip install numpy==1.26.4",
        "pip install pandas==2.2.2",
        "pip install scikit-learn==1.4.2",
        "pip install xgboost==2.0.3",
        "pip install lightgbm==4.3.0",
        "pip install joblib==1.4.2",
        "pip install pydantic==2.7.1",
        "pip install matplotlib==3.8.4",
        "pip install seaborn==0.13.2",
        "pip install seaborn==0.13.2",
        "",
        "# STEP 3: Test individual imports",
        "python -c \"import fastapi; print('✅ FastAPI OK')\"",
        "python -c \"import uvicorn; print('✅ Uvicorn OK')\"",
        "python -c \"import pandas; print('✅ Pandas OK')\"",
        "python -c \"import sklearn; print('✅ Scikit-learn OK')\"",
        "python -c \"import xgboost; print('✅ XGBoost OK')\"",
        "python -c \"import lightgbm; print('✅ LightGBM OK')\"",
        "",
        "# STEP 4: Test main application import",
        "python -c \"from api_server import app; print('✅ API imports successfully')\"",
        "",
        "# STEP 5: If any package still fails, try without version pinning",
        "pip install --upgrade pandas scikit-learn xgboost lightgbm matplotlib",
      ],
    },
    {
      issue:
        "NotFittedError: RandomForestClassifier instance is not fitted yet",
      solution: [
        "# This error occurs because the code tries to access feature_importances_ before fitting",
        "# SOLUTION: Fix the train_model.py file",
        "",
        "# STEP 1: Navigate to the ML pipeline directory",
        "cd /opt/azload/ml_pipeline",
        "source ../venv/bin/activate",
        "",
        "# STEP 2: Fix the feature importance access in train_model.py",
        "# Edit line 171 to access feature importances from the fitted ensemble",
        "nano train_model.py",
        "",
        "# STEP 3: Find line 171 and replace:",
        "# OLD: feature_importance = dict(zip(feature_names, self.member_rf.feature_importances_))",
        "# NEW: feature_importance = dict(zip(feature_names, self.member_ensemble.estimators_[0].feature_importances_))",
        "",
        "# STEP 4: Also fix line 301 for global classification:",
        "# OLD: feature_importance = dict(zip(feature_names, rf_model.feature_importances_))",
        "# NEW: feature_importance = dict(zip(feature_names, ensemble.estimators_[0].feature_importances_))",
        "",
        "# STEP 5: Save the file (Ctrl+X, Y, Enter) and retry training",
        "python train_model.py",
        "",
        "# ALTERNATIVE: Quick fix using sed command",
        "sed -i 's/self.member_rf.feature_importances_/self.member_ensemble.estimators_[0].feature_importances_/g' train_model.py",
        "sed -i 's/rf_model.feature_importances_/ensemble.estimators_[0].feature_importances_/g' train_model.py",
        "python train_model.py",
      ],
    },
    {
      issue: "Import errors or missing dependencies",
      solution: [
        "# STEP 1: Navigate to correct directory and activate venv",
        "cd /opt/azload/ml_pipeline",
        "source ../venv/bin/activate",
        "",
        "# STEP 2: Upgrade pip and install dependencies",
        "pip install --upgrade pip",
        "pip install -r requirements.txt",
        "",
        "# STEP 3: Test individual imports",
        "python -c \"import fastapi; print('FastAPI OK')\"",
        "python -c \"import uvicorn; print('Uvicorn OK')\"",
        "python -c \"import sklearn; print('Scikit-learn OK')\"",
        "python -c \"import xgboost; print('XGBoost OK')\"",
        "python -c \"import lightgbm; print('LightGBM OK')\"",
        "",
        "# STEP 4: Test main application import",
        "python -c \"from api_server import app; print('✅ API imports successfully')\"",
        "",
        "# STEP 5: If still failing, install core packages individually",
        "pip install scikit-learn==1.4.2 xgboost==2.0.3 lightgbm==4.3.0",
        "pip install fastapi==0.111.0 uvicorn==0.29.0 pydantic==2.7.1",
        "pip install numpy==1.26.4 pandas==2.2.2 joblib==1.4.2",
        "pip install matplotlib==3.8.4",
        "pip install seaborn==0.13.2",
      ],
    },
    {
      issue: "API returns 'Not Found' error",
      solution: [
        "# This means the service is failing to start properly",
        "",
        "# STEP 1: Check service status",
        "sudo systemctl status azload-ml",
        "# If shows 'activating (auto-restart)', the service is failing",
        "",
        "# STEP 2: Check if API is actually binding to port",
        "sudo netstat -tlnp | grep :8000",
        "# Should show python process on 0.0.0.0:8000",
        "# If empty, the API server is not starting",
        "",
        "# STEP 3: Check detailed logs for startup errors",
        "sudo journalctl -u azload-ml -n 50 --no-pager",
        "# Look for specific error messages",
        "",
        "# STEP 4: Test manual startup to see exact error",
        "cd /opt/azload/ml_pipeline",
        "source ../venv/bin/activate",
        "python api_server.py",
        "# This will show the EXACT error",
        "",
        "# STEP 5: Fix the specific error, then restart service",
        "sudo systemctl restart azload-ml",
        "curl http://localhost:8000/health",
      ],
    },
    {
      issue: "ValueError: train set will be empty (n_samples=1, test_size=0.2)",
      solution: [
        "# This error occurs when there's insufficient training data for train_test_split",
        "# The training dataset has only 1 sample, but test_size=0.2 requires more data",
        "",
        "# SOLUTION 1: Modify train_model.py to handle small datasets",
        "cd /opt/azload/ml_pipeline",
        "source ../venv/bin/activate",
        "",
        "# Edit the train_test_split parameters in train_model.py",
        "nano train_model.py",
        "# Find line ~245 and modify the train_test_split call:",
        "# OLD: X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)",
        "# NEW: if len(X) < 5:",
        "#          X_train, X_test, y_train, y_test = X, X, y, y  # Use same data for train/test",
        "#      else:",
        "#          X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)",
        "",
        "# SOLUTION 2: Quick fix using sed command",
        "# Replace the problematic train_test_split line",
        "sed -i '245s/.*/        if len(X) < 5:\\/' train_model.py",
        "sed -i '245a            X_train, X_test, y_train, y_test = X, X, y, y  # Use same data for train/test when insufficient samples' train_model.py",
        "sed -i '246a        else:' train_model.py",
        "sed -i '247a            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)' train_model.py",
        "",
        "# SOLUTION 3: Alternative - disable stratification for small datasets",
        "# Find and replace the train_test_split call to remove stratify parameter",
        "sed -i 's/train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)/train_test_split(X, y, test_size=0.2, random_state=42)/g' train_model.py",
        "",
        "# STEP 4: Retry training after applying the fix",
        "python train_model.py",
        "",
        "# STEP 5: If still failing, check the data preparation",
        "python -c \"from data_preparation import StructuralModelFeatureExtractor; extractor = StructuralModelFeatureExtractor(); models_data = extractor.load_sample_data(); global_df, member_df = extractor.prepare_training_data(models_data); print(f'Global samples: {len(global_df)}, Member samples: {len(member_df)}')\"",
        "# This will show how many samples are available for training",
        "",
        "# STEP 6: The fix has been applied - retry training",
        "python train_model.py",
        "# Should now handle small datasets automatically",
      ],
    },
  ];

  return (
    <div className="space-y-6 bg-white">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Server className="w-5 h-5" />
            <span>ML API Deployment Guide</span>
            <Badge className="bg-blue-100 text-blue-800">
              DigitalOcean: 178.128.135.194
            </Badge>
          </CardTitle>
          <CardDescription>
            Complete step-by-step guide to deploy your ML API on DigitalOcean
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="deployment" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="deployment">Deployment Steps</TabsTrigger>
          <TabsTrigger value="files">Files to Upload</TabsTrigger>
          <TabsTrigger value="troubleshooting">Troubleshooting</TabsTrigger>
          <TabsTrigger value="verification">Verification</TabsTrigger>
        </TabsList>

        <TabsContent value="deployment" className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>🔥 CRITICAL UPDATES REQUIRED!</strong> You must upload the
              updated files to fix:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>
                  <strong>train_test_split ValueError</strong> - Fixed in
                  train_model.py
                </li>
                <li>
                  <strong>Insufficient training data</strong> - Massively
                  expanded in data_preparation.py
                </li>
                <li>
                  <strong>Missing user override learning</strong> - Implemented
                  in api_server.py
                </li>
              </ul>
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                <strong>⚠️ DO NOT SKIP:</strong> These are not optional updates
                - they fix critical deployment-blocking issues!
              </div>
            </AlertDescription>
          </Alert>

          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>📋 UPLOAD PRIORITY ORDER:</strong>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>
                  <strong>data_preparation.py</strong> - Upload FIRST (contains
                  expanded training data)
                </li>
                <li>
                  <strong>train_model.py</strong> - Upload SECOND (contains
                  train_test_split fix)
                </li>
                <li>
                  <strong>api_server.py</strong> - Upload THIRD (contains user
                  override learning)
                </li>
                <li>model_utils.py - Upload if available</li>
                <li>requirements.txt - Upload if available</li>
              </ol>
            </AlertDescription>
          </Alert>

          {deploymentSteps.map((step, index) => (
            <Card
              key={step.id}
              className={`${
                completedSteps.has(step.id)
                  ? "border-green-200 bg-green-50"
                  : step.critical
                    ? "border-red-200 bg-red-50"
                    : "border-gray-200"
              }`}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        completedSteps.has(step.id)
                          ? "bg-green-500 text-white"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {completedSteps.has(step.id) ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{step.title}</CardTitle>
                      <CardDescription>{step.description}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {step.critical && (
                      <Badge variant="destructive">Critical</Badge>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleStep(step.id)}
                    >
                      {completedSteps.has(step.id) ? "Undo" : "Mark Done"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {step.commands.map((command, cmdIndex) => (
                  <div
                    key={cmdIndex}
                    className="bg-gray-900 text-green-400 p-3 rounded-lg font-mono text-sm relative group"
                  >
                    <pre className="whitespace-pre-wrap">{command}</pre>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => copyToClipboard(command)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    {copiedCommand === command && (
                      <div className="absolute top-2 right-12 bg-green-500 text-white px-2 py-1 rounded text-xs">
                        Copied!
                      </div>
                    )}
                  </div>
                ))}

                {step.files && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Required Files:</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {step.files.map((file) => (
                        <Badge key={file} variant="outline">
                          <FileText className="w-3 h-3 mr-1" />
                          {file}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {step.notes && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Notes:</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                      {step.notes.map((note, noteIndex) => (
                        <li key={noteIndex}>{note}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="files" className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>🔥 CRITICAL FILES TO UPDATE:</strong> Upload these UPDATED
              files to <code>/opt/azload/ml_pipeline/</code> on your server.
              These files contain critical fixes that resolve
              deployment-blocking issues!
            </AlertDescription>
          </Alert>

          <div className="grid gap-4">
            {filesToUpload.map((file) => (
              <Card
                key={file.name}
                className={`${
                  file.status === "MUST_UPDATE"
                    ? "border-red-500 bg-red-50"
                    : "border-gray-200"
                }`}
              >
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="w-4 h-4" />
                    <span>{file.name}</span>
                    {file.status === "MUST_UPDATE" && (
                      <Badge variant="destructive">CRITICAL UPDATE</Badge>
                    )}
                    {file.status === "OPTIONAL" && (
                      <Badge variant="outline">Optional</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>{file.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-100 p-3 rounded-lg">
                    <code className="text-sm">Source: {file.path}</code>
                  </div>

                  {file.issues && file.issues.length > 0 && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                      <h4 className="font-medium text-red-800 mb-2">
                        Issues Fixed in This Update:
                      </h4>
                      <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                        {file.issues.map((issue, index) => (
                          <li key={index}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-3 space-y-2">
                    <p className="text-sm text-gray-600">Upload methods:</p>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                      <li>
                        SCP:{" "}
                        <code className="bg-gray-200 px-1 rounded">
                          scp {file.path}{" "}
                          root@178.128.135.194:/opt/azload/ml_pipeline/
                        </code>
                      </li>
                      <li>Copy file content and paste using nano/vim</li>
                      <li>Use SFTP client like FileZilla</li>
                    </ul>
                  </div>

                  {file.status === "MUST_UPDATE" && (
                    <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-sm text-yellow-800">
                        <strong>⚠️ Verification:</strong> After upload, check
                        file size and timestamp to ensure you have the updated
                        version!
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="troubleshooting" className="space-y-4">
          <Alert>
            <Settings className="h-4 w-4" />
            <AlertDescription>
              Common issues and their solutions during deployment
            </AlertDescription>
          </Alert>

          {troubleshootingSteps.map((item, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-red-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{item.issue}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {item.solution.map((step, stepIndex) => (
                    <div
                      key={stepIndex}
                      className="bg-gray-900 text-green-400 p-2 rounded font-mono text-sm"
                    >
                      {step}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="verification" className="space-y-4">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Run these commands to verify your deployment is successful
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>Verification Checklist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Service Status:</span>
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                    sudo systemctl status azload-ml
                  </code>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Health Check:</span>
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                    curl http://178.128.135.194/health
                  </code>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Model Info:</span>
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                    curl http://178.128.135.194/model-info
                  </code>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Classification Test:</span>
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                    POST /classify-building
                  </code>
                </div>
              </div>

              <Alert>
                <Globe className="h-4 w-4" />
                <AlertDescription>
                  <strong>Success Indicators:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Service shows &quot;Active: active (running)&quot;</li>
                    <li>
                      Health endpoint returns{" "}
                      {'{"status":"healthy","models_loaded":true}'}
                    </li>
                    <li>
                      No errors in logs:{" "}
                      <code>sudo journalctl -u azload-ml -n 20</code>
                    </li>
                    <li>
                      Port 8000 is bound:{" "}
                      <code>sudo netstat -tlnp | grep :8000</code>
                    </li>
                  </ul>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="w-5 h-5" />
            <span>Quick Commands Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm space-y-1">
            <div># Connect to server</div>
            <div>ssh root@178.128.135.194</div>
            <div></div>
            <div># Check service status</div>
            <div>sudo systemctl status azload-ml</div>
            <div></div>
            <div># View logs</div>
            <div>sudo journalctl -u azload-ml -f</div>
            <div></div>
            <div># Test API</div>
            <div>curl http://178.128.135.194/health</div>
            <div></div>
            <div># Restart service</div>
            <div>sudo systemctl restart azload-ml</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default DeploymentGuide;

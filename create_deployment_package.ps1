# AZLOAD Deployment Package Creator
# This script checks for file existence and creates the deployment archive

Write-Host "🚀 AZLOAD Deployment Package Creator" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green

# Define the files and directories to include
$FilesToInclude = @(
    "deployment/api_server.py",
    "deployment/train_model.py", 
    "deployment/data_preparation.py",
    "deployment/model_utils.py",
    "deployment/requirements.txt",
    "ml_pipeline/",
    "src/lib/ml-training-pipeline.ts",
    "src/components/safe-training-dashboard.tsx",
    "src/components/model-versioning-dashboard.tsx"
)

# Check current directory
Write-Host "📁 Current Directory: $(Get-Location)" -ForegroundColor Cyan
Write-Host ""

# Check which files exist
$ExistingFiles = @()
$MissingFiles = @()

Write-Host "🔍 Checking file existence..." -ForegroundColor Yellow
foreach ($file in $FilesToInclude) {
    if (Test-Path $file) {
        Write-Host "✅ Found: $file" -ForegroundColor Green
        $ExistingFiles += $file
    } else {
        Write-Host "❌ Missing: $file" -ForegroundColor Red
        $MissingFiles += $file
    }
}

Write-Host ""

# Show summary
Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "   Found: $($ExistingFiles.Count) files/directories" -ForegroundColor Green
Write-Host "   Missing: $($MissingFiles.Count) files/directories" -ForegroundColor Red
Write-Host ""

if ($MissingFiles.Count -gt 0) {
    Write-Host "⚠️  Missing files detected:" -ForegroundColor Yellow
    foreach ($missing in $MissingFiles) {
        Write-Host "   - $missing" -ForegroundColor Red
    }
    Write-Host ""
    
    # Check if deployment directory exists at all
    if (-not (Test-Path "deployment")) {
        Write-Host "❌ The 'deployment' directory does not exist!" -ForegroundColor Red
        Write-Host "   Please ensure you're in the correct project directory." -ForegroundColor Yellow
        Write-Host ""
        exit 1
    }
    
    # List what's actually in the deployment directory
    Write-Host "📂 Contents of deployment directory:" -ForegroundColor Cyan
    Get-ChildItem "deployment" | ForEach-Object {
        Write-Host "   - $($_.Name)" -ForegroundColor White
    }
    Write-Host ""
}

if ($ExistingFiles.Count -eq 0) {
    Write-Host "❌ No files found to archive!" -ForegroundColor Red
    Write-Host "   Please check your file paths and try again." -ForegroundColor Yellow
    exit 1
}

# Create archive with existing files only
Write-Host "📦 Creating deployment package with existing files..." -ForegroundColor Yellow

# Remove old archive if it exists
if (Test-Path "azload_ml_update.tar.gz") {
    Remove-Item "azload_ml_update.tar.gz" -Force
    Write-Host "🗑️  Removed old archive" -ForegroundColor Gray
}

# Create the tar command with only existing files
$TarCommand = "tar -czf azload_ml_update.tar.gz"
foreach ($file in $ExistingFiles) {
    $TarCommand += " `"$file`""
}

Write-Host "🔧 Executing: $TarCommand" -ForegroundColor Gray
Write-Host ""

try {
    # Execute the tar command
    Invoke-Expression $TarCommand
    
    if (Test-Path "azload_ml_update.tar.gz") {
        $ArchiveSize = (Get-Item "azload_ml_update.tar.gz").Length
        $ArchiveSizeMB = [math]::Round($ArchiveSize / 1MB, 2)
        
        Write-Host "✅ SUCCESS! Deployment package created successfully!" -ForegroundColor Green
        Write-Host "📦 Archive: azload_ml_update.tar.gz" -ForegroundColor Cyan
        Write-Host "📏 Size: $ArchiveSizeMB MB" -ForegroundColor Cyan
        Write-Host ""
        
        Write-Host "🚀 Next Steps:" -ForegroundColor Yellow
        Write-Host "1. Upload to your server:" -ForegroundColor White
        Write-Host "   scp azload_ml_update.tar.gz root@178.128.135.194:/tmp/" -ForegroundColor Gray
        Write-Host ""
        Write-Host "2. On the server, extract and deploy:" -ForegroundColor White
        Write-Host "   cd /tmp" -ForegroundColor Gray
        Write-Host "   tar -xzf azload_ml_update.tar.gz" -ForegroundColor Gray
        Write-Host "   # Then follow the deployment guide steps" -ForegroundColor Gray
        Write-Host ""
        
    } else {
        Write-Host "❌ Archive creation failed - file not found after tar command" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Error creating archive: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔧 Troubleshooting suggestions:" -ForegroundColor Yellow
    Write-Host "1. Ensure you're in the project root directory (C:\Users\hp\Desktop\azload)" -ForegroundColor White
    Write-Host "2. Check that tar.exe is available in your PATH" -ForegroundColor White
    Write-Host "3. Try running PowerShell as Administrator" -ForegroundColor White
    Write-Host "4. Verify file permissions" -ForegroundColor White
}

Write-Host ""
Write-Host "🏁 Script completed." -ForegroundColor Green

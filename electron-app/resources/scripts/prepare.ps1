<#
  Firefly prepare.ps1 script
  powershell version of my prepare.sh script (translated by ChatGPT)
  Called by NSIS installer during setup
  powershell.exe -ExecutionPolicy Bypass -File "resources\\scripts\\prepare.ps1" 
#>
param(
    [string]$RESOURCE_DIR = (Get-Location)
)

# Exit on any error
$ErrorActionPreference = "Stop"

Write-Host "=== Starting Firefly prepare.ps1 script"

# Set bundle directory in user home
$BUNDLE_DIR = Join-Path $HOME ".firefly"

# Create the directory
New-Item -ItemType Directory -Path $BUNDLE_DIR -Force | Out-Null

Set-Location $BUNDLE_DIR

# Create bundle directory
$PYTHON_DIR = "python"
$NTBKS_DIR = "ntbks"
$PYTHON_VERSION = "3.12.10"

Set-Location $BUNDLE_DIR

# cleanup
if (Test-Path $PYTHON_DIR) { Remove-Item -Recurse -Force $PYTHON_DIR }
if (Test-Path $NTBKS_DIR) { Remove-Item -Recurse -Force $NTBKS_DIR }
New-Item -ItemType Directory -Force -Path $PYTHON_DIR | Out-Null
New-Item -ItemType Directory -Force -Path $NTBKS_DIR | Out-Null

Write-Host "=== Working in directory: $INSTALL_DIR"
Write-Host "=== Creating bundle root directory: $BUNDLE_DIR"
Write-Host "=== Creating bundled Python subdirectory: $PYTHON_DIR"
Write-Host "=== Python version: $PYTHON_VERSION"

New-Item -ItemType Directory -Force -Path $NTBKS_DIR | Out-Null

# Download Miniforge installer for Windows
$PLATFORM = "Windows"
$MINIFORGE_INSTALLER = "Miniforge3-Windows-x86_64.exe"
$PYTHON_BIN = Join-Path $PYTHON_DIR "python.exe"
$CONDA_BIN = Join-Path $PYTHON_DIR "Scripts\conda.exe"

$MINIFORGE_INSTALLER_URL = "https://github.com/conda-forge/miniforge/releases/latest/download/$MINIFORGE_INSTALLER"

Write-Host "=== Detected platform: $PLATFORM"
Write-Host "=== Installer: $MINIFORGE_INSTALLER"

Write-Host "=== Downloading Miniforge..."
Invoke-WebRequest -Uri $MINIFORGE_INSTALLER_URL -OutFile $MINIFORGE_INSTALLER

# Install Miniforge silently
$WIN_TARGET_DIR = (Resolve-Path $PYTHON_DIR).Path
Write-Host "=== Installing Miniforge to $WIN_TARGET_DIR ..."

$InstallerProcess = Start-Process -FilePath ".\$MINIFORGE_INSTALLER" -ArgumentList "/S /InstallationType=JustMe /RegisterPython=0 /AddToPath=0 /D=$WIN_TARGET_DIR" -PassThru
Write-Host "Installation started (PID: $($InstallerProcess.Id)), monitoring progress..."

while (-not $InstallerProcess.HasExited) {
    Write-Host -NoNewline "."
    Start-Sleep -Seconds 2
}

if ($InstallerProcess.ExitCode -eq 0) {
    Write-Host "`n=== Installation process completed successfully"
} else {
    Write-Host "`n=== Installation failed with exit code: $($InstallerProcess.ExitCode)"
    Exit 1
}

# Clean up installer
Remove-Item -Force $MINIFORGE_INSTALLER

# Verify Python exists
if (-not (Test-Path $PYTHON_BIN)) {
    Write-Host "=== Python executable not found: $PYTHON_BIN"
    Get-ChildItem $PYTHON_DIR
    Exit 1
}

# Test Python
Write-Host "=== Testing Python..."
& $PYTHON_BIN --version

# Check version >= 3.10
$PY_VER = & $PYTHON_BIN -c "import sys; print('.'.join(map(str, sys.version_info[:3])))"
function Version-Ge($v1, $v2) {
    $a = $v1.Split(".")
    $b = $v2.Split(".")
    for ($i=0; $i -lt $a.Count; $i++) {
        if ([int]$a[$i] -gt [int]$b[$i]) { return $true }
        if ([int]$a[$i] -lt [int]$b[$i]) { return $false }
    }
    return $true
}

if (-not (Version-Ge $PY_VER $PYTHON_VERSION)) {
    Write-Host "=== Error: Python version $PY_VER found, but >= $PYTHON_VERSION required."
    Exit 1
}

Write-Host "=== Using Python: $PYTHON_BIN"

# Upgrade pip and install packages
Write-Host "=== Upgrading pip..."
& $PYTHON_BIN -m pip install --upgrade pip --no-warn-script-location --no-cache-dir --prefer-binary

Write-Host "=== Installing Firefly and dependencies ..."
& $PYTHON_BIN -m pip install --force-reinstall firefly jupyter jupyterlab --no-warn-script-location --no-cache-dir --prefer-binary
& $PYTHON_BIN -m jupyter lab build --dev-build=False --minimize=True

# Write Jupyter config
$JUPYTER_CONFIG = @"
c.MappingKernelManager.default_kernel_name = 'firefly-electron'
c.KernelSpecManager.allowed_kernelspecs = {'firefly-electron'}
"@
Set-Content -Path "$PYTHON_DIR/jupyter_server_config.py" -Value $JUPYTER_CONFIG

Write-Host "=== Python env with dependencies created at $INSTALL_DIR/$BUNDLE_DIR/$PYTHON_DIR"

# Copy Firefly data and notebooks
$FIRE_DIR = & $PYTHON_BIN -c "import firefly; print(firefly.__path__[0])"
$FIRE_DATA_DIR = Join-Path $FIRE_DIR "static\data"
$GETTER = Join-Path $RESOURCE_DIR "scripts\downloadFromGitHub.py"
& $PYTHON_BIN $GETTER $FIRE_DATA_DIR ageller Firefly "src/firefly/static/data" main
& $PYTHON_BIN $GETTER $NTBKS_DIR ageller Firefly "src/firefly/ntbks/" main

Write-Host "=== Preparation complete!"

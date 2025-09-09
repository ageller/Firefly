#!/bin/bash

# exit if an error occurs
set -e

# create the bundled python virtual env, install firefly (via this repo) and jupyter
BUNDLE_DIR="bundle"
PYTHON_DIR=$BUNDLE_DIR"/python"
NTBKS_DIR=$BUNDLE_DIR"/ntbks"
PYTHON_VERSION="3.12.10"
PYTHON_ZIP="python-$PYTHON_VERSION-embed-amd64.zip"

echo "=== Starting Firefly prepare.sh script"
echo "=== Python version: $PYTHON_VERSION"
echo "=== Bundle directory: $BUNDLE_DIR"
echo "=== Bundled Python directory: $PYTHON_DIR"

# ---- start fresh ----
rm -rf "$BUNDLE_DIR"
mkdir "$BUNDLE_DIR"
#mkdir "$PYTHON_DIR"
mkdir "$NTBKS_DIR"

# ---- Download miniforge to have a standard python executable ----
# Detect platform
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]; then
    PLATFORM="Windows"
    MINIFORGE_INSTALLER="Miniforge3-Windows-x86_64.exe"
    PYTHON_BIN=$PYTHON_DIR"/python.exe"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    PLATFORM="macOS"
    if [[ $(uname -m) == "arm64" ]]; then
        MINIFORGE_INSTALLER="Miniforge3-MacOSX-arm64.sh"
    else
        MINIFORGE_INSTALLER="Miniforge3-MacOSX-x86_64.sh"
    fi
    PYTHON_BIN=$PYTHON_DIR"/bin/python"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    PLATFORM="Linux"
    if [[ $(uname -m) == "aarch64" ]]; then
        MINIFORGE_INSTALLER="Miniforge3-Linux-aarch64.sh"
    else
        MINIFORGE_INSTALLER="Miniforge3-Linux-x86_64.sh"
    fi
    PYTHON_BIN=$PYTHON_DIR"/bin/python"
else
    echo "=== Unsupported platform: $OSTYPE"
    exit 1
fi

MINIFORGE_INSTALLER_URL="https://github.com/conda-forge/miniforge/releases/latest/download/$MINIFORGE_INSTALLER"

echo "=== Detected platform: $PLATFORM"
echo "=== Installer: $MINIFORGE_INSTALLER"

# Download Miniforge
echo "=== Downloading Miniforge..."
if ! curl -L -o "$MINIFORGE_INSTALLER" "$MINIFORGE_INSTALLER_URL"; then
    echo "=== Failed to download installer"
    exit 1
fi

# Install based on platform
if [[ "$PLATFORM" == "Windows" ]]; then
    # Windows installation
    WIN_TARGET_DIR=$(cygpath -w "$(pwd)/$PYTHON_DIR")
    echo "=== Installing Miniforge to $WIN_TARGET_DIR "
    echo "=== (this may take a few minutes)..."

    # Start installer in background
    ./"$MINIFORGE_INSTALLER" //S //InstallationType=JustMe //RegisterPython=0 //AddToPath=0 /D="$WIN_TARGET_DIR" &
    INSTALLER_PID=$!

    echo "Installation started (PID: $INSTALLER_PID), monitoring progress..."

    # Monitor the process with better feedback
    COUNTER=0
    while kill -0 "$INSTALLER_PID" 2>/dev/null; do
        COUNTER=$((COUNTER + 1))
        case $((COUNTER % 4)) in
            0) SPINNER="/" ;;
            1) SPINNER="-" ;;
            2) SPINNER="\\" ;;
            3) SPINNER="|" ;;
        esac
        printf "\rInstalling... %s (%d seconds)" "$SPINNER" $((COUNTER * 2))
        sleep 2
    done

    # Check exit code
    wait $INSTALLER_PID
    INSTALL_EXIT_CODE=$?

    printf "\n"  # New line after spinner

    if [ $INSTALL_EXIT_CODE -eq 0 ]; then
        echo "=== Installation process completed successfully"
    else
        echo "=== Installation failed with exit code: $INSTALL_EXIT_CODE"
        exit 1
    fi
    
else
    # macOS/Linux installation
    chmod +x "$MINIFORGE_INSTALLER"
    echo "=== Installing Miniforge to $(pwd)/$PYTHON_DIR..."
    
    if ! ./"$MINIFORGE_INSTALLER" -b -p "$(pwd)/$PYTHON_DIR"; then
        echo "=== Installation failed"
        exit 1
    fi
fi

# Clean up installer
rm -f "$MINIFORGE_INSTALLER"

# Verify installation
if [ ! -f "$PYTHON_BIN" ]; then
    echo "=== Python executable not found after installation: $PYTHON_BIN"
    ls -la "$PYTHON_DIR"
    exit 1
fi

# Test Python
echo "=== Testing Python..."
if ! "$PYTHON_BIN" --version >/dev/null 2>&1; then
    echo "=== Python test failed"
    exit 1
fi

# --- Check version >= 3.10 ---
PY_VER=$($PYTHON_BIN -c 'import sys; print(".".join(map(str, sys.version_info[:3])))')

version_ge() {
    # compare version numbers like 3.12 >= 3.10
    [ "$(printf '%s\n' "$2" "$1" | sort -V | head -n1)" = "$2" ]
}

if ! version_ge "$PY_VER" "$PYTHON_VERSION"; then
    echo "=== Error: Python version $PY_VER found, but >= $PYTHON_VERSION required." >&2
    exit 1
fi

echo "=== Using Python: $PYTHON_BIN"
$PYTHON_BIN -V

# ---- Install dependencies ----
echo "=== Upgrading pip..."
"$PYTHON_BIN" -m pip install --upgrade pip --no-warn-script-location

echo "=== Installing Firefly and dependencies..."
"$PYTHON_BIN" -m pip install --force-reinstall ../ jupyter jupyterlab --no-warn-script-location
"$PYTHON_BIN" -m jupyter lab build --dev-build=False --minimize=True

# write the jupyter config file
cat > "$PYTHON_DIR/jupyter_server_config.py" <<'EOF'
c.MappingKernelManager.default_kernel_name = "firefly-electron"
c.KernelSpecManager.allowed_kernelspecs = {"firefly-electron"}
EOF

echo "=== Python env with dependencies created at $PYTHON_DIR"

echo "=== Copying Firefly data and notebooks..."

# copy the Firefly data to the bundle so that it loads by default
FIRE_DIR=$("$PYTHON_BIN" -c "import firefly; print(firefly.__path__[0])")
cp -r ../src/firefly/static/data/FIRESampleData "$FIRE_DIR/static/data/"

# copy the notebooks to the bundle specifically so the user isn't working inside the site-packages dir
cp -r ../src/firefly/ntbks/* "$NTBKS_DIR"

echo "=== Preparation complete!"
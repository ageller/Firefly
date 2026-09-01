#!/bin/bash

# exit if an error occurs
set -e

echo "=== Starting Firefly prepare.sh script"

RESOURCE_DIR="${1:-$(pwd)}"

BUNDLE_DIR=$HOME"/.firefly"

# if needed
mkdir -p $BUNDLE_DIR

cd $BUNDLE_DIR

# create the bundled python virtual env, install firefly (via this repo) and jupyter
PYTHON_DIR="python"
NTBKS_DIR="ntbks"
PYTHON_VERSION="3.12.10"
FULL_INSTALL=1

echo "=== Creating bundle root directory: $BUNDLE_DIR"
echo "=== Creating bundled Python subdirectory: $PYTHON_DIR"
echo "=== Python version: $PYTHON_VERSION"

# ---- Download miniforge to have a standard python executable ----
# Detect platform (note that currently I am not using this script for windows)
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]; then
    PLATFORM="Windows"
    MINIFORGE_INSTALLER="Miniforge3-Windows-x86_64.exe"
    PYTHON_BIN=$PYTHON_DIR"/python.exe"
    CONDA_BIN=$PYTHON_DIR"/Scripts/conda.exe"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    PLATFORM="macOS"
    if [[ $(uname -m) == "arm64" ]]; then
        MINIFORGE_INSTALLER="Miniforge3-MacOSX-arm64.sh"
    else
        MINIFORGE_INSTALLER="Miniforge3-MacOSX-x86_64.sh"
    fi
    PYTHON_BIN=$PYTHON_DIR"/bin/python"
    CONDA_BIN=$PYTHON_DIR"/bin/conda"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    PLATFORM="Linux"
    if [[ $(uname -m) == "aarch64" ]]; then
        MINIFORGE_INSTALLER="Miniforge3-Linux-aarch64.sh"
    else
        MINIFORGE_INSTALLER="Miniforge3-Linux-x86_64.sh"
    fi
    PYTHON_BIN=$PYTHON_DIR"/bin/python"
    CONDA_BIN=$PYTHON_DIR"/bin/conda"
else
    echo "=== Unsupported platform: $OSTYPE"
    exit 1
fi



if [[ "$FULL_INSTALL" == 1 ]]; then
    # ---- start fresh ----
    rm -rf "$PYTHON_DIR"
    rm -rf "$NTBKS_DIR"
    mkdir -p "$NTBKS_DIR"

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
        mkdir -p "$PYTHON_DIR"

        # Windows installation
        WIN_TARGET_DIR=$(cygpath -w "$(pwd)/$PYTHON_DIR")
        echo "=== Installing Miniforge to $WIN_TARGET_DIR "

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
        echo "=== Python executable not found after installation: $INSTALL_DIR/$BUNDLE_DIR/$PYTHON_BIN"
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

    echo "=== Using Python: $INSTALL_DIR/$BUNDLE_DIR/$PYTHON_BIN"
    $PYTHON_BIN -V

    # ---- Install dependencies ----
    echo "=== Upgrading pip..."
    "$PYTHON_BIN" -m pip install --upgrade pip --no-warn-script-location --no-cache-dir --prefer-binary

    echo "=== Installing Firefly and dependencies ..."
    "$PYTHON_BIN" -m pip install --force-reinstall firefly jupyter jupyterlab --no-warn-script-location --no-cache-dir --prefer-binary
    "$PYTHON_BIN" -m jupyter lab build --dev-build=False --minimize=True

    # write the jupyter config file
    JUPYTER_CONFIG_FILE="$PYTHON_DIR/jupyter_server_config.py"
    if [ -f "$JUPYTER_CONFIG_FILE" ]; then
        rm -f "$JUPYTER_CONFIG_FILE"
    fi
    touch "$JUPYTER_CONFIG_FILE"
    echo 'c.MappingKernelManager.default_kernel_name = "firefly-electron"' >> $JUPYTER_CONFIG_FILE
    echo 'c.KernelSpecManager.allowed_kernelspecs = {"firefly-electron"}' >> $JUPYTER_CONFIG_FILE

    echo "=== Python env with dependencies created at $INSTALL_DIR/$BUNDLE_DIR/$PYTHON_DIR"

fi


echo "=== Copying Firefly data and notebooks..."

# data
FIRE_DIR=$("$PYTHON_BIN" -c "import firefly; print(firefly.__path__[0])")
FIRE_DATA_DIR="${FIRE_DIR}/static/data/"
GETTER=$RESOURCE_DIR"/scripts/downloadFromGitHub.py"
$PYTHON_BIN $GETTER $FIRE_DATA_DIR ageller Firefly "src/firefly/static/data" main

# notebooks
#svn export https://github.com/ageller/Firefly/tree/main/src/firefly/ntbks "$NTBKS_DIR"
$PYTHON_BIN $GETTER $NTBKS_DIR ageller Firefly "src/firefly/ntbks/" main

echo "=== Preparation complete!"
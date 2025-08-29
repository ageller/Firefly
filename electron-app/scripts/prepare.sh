#!/bin/bash

# create the bundled python venv, install firefly (via this repo) and jupyter

# ---- Configuration ----
PYTHON_VERSION="3.10"
BUNDLE_DIR="bundle/python"
PYTHON_BIN=""

echo "=== Starting Firefly prepare.sh script"
echo "=== Target Python version: >=$PYTHON_VERSION"
echo "=== Bundle directory: $BUNDLE_DIR"

# ---- Find a suitable Python ----
if command -v python &>/dev/null; then
    PYTHON_BIN=python
elif command -v python$PYTHON_VERSION &>/dev/null; then
    PYTHON_BIN=python$PYTHON_VERSION
elif command -v python3 &>/dev/null; then
    PYTHON_BIN=python3
fi

if [[ -z "$PYTHON_BIN" ]]; then
    echo "=== Error: Python not found on this system."
    echo "=== Please install Python >=$PYTHON_VERSION:"
    exit 1
fi

# --- Check version >= 3.10 ---
PY_VER=$($PYTHON_BIN -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')

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

# ---- Create venv ----
echo "=== Creating virtual environment in $BUNDLE_DIR ..."
rm -rf "$BUNDLE_DIR"
$PYTHON_BIN -m venv "$BUNDLE_DIR"

# ---- Activate venv in a cross-platform way ----
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" || "$OS" == "Windows_NT" ]]; then
    ACTIVATE="$BUNDLE_DIR/Scripts/activate"
else
    ACTIVATE="$BUNDLE_DIR/bin/activate"
fi

# activate the env so that we use the correct python
source "$ACTIVATE"

# ---- Install dependencies ----
echo "=== Upgrading pip..."
python -m pip install --upgrade pip

echo "=== Installing Firefly and dependencies..."
python -m pip install --force-reinstall ../ jupyter jupyterlab
python -m jupyter lab build --dev-build=False --minimize=True

echo "=== Python venv with dependencies created at $BUNDLE_DIR"

echo "=== Copying Firefly data and notebooks..."

# copy the Firefly data to the bundle so that it loads by default
FIRE_DIR=$(python -c "import firefly; print(firefly.__path__[0])")
cp -r ../src/firefly/static/data/FIRESampleData "$FIRE_DIR/static/data/"

# copy the notebooks to the bundle specifically so the user isn't working inside the site-packages dir
rm -rf bundle/ntbks 
cp -r ../src/firefly/ntbks bundle/ntbks

echo "=== Deactivating..."
deactivate

echo "=== Preparation complete!"
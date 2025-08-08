#!/bin/bash

# creat the bundled python env, install firefly (via this repo) and jupyter
rm -rf ./bundle/python
eval "$(conda shell.bash hook)"
conda create -p ./bundle/python python=3.12 pip --yes
conda activate ./bundle/python
pip install ../ jupyter

# copy the Firefly data to the bundle so that it loads by default
SITE_PACKAGES=$(./bundle/python/bin/python -c "import site; print(site.getsitepackages()[0])")
cp -r ../src/firefly/static/data/FIRESampleData "$SITE_PACKAGES/firefly/static/data/"

# copy the notebooks to the bundle specifically so the user isn't working inside the site-packages dir
rm -rf bundle/ntbks 
cp -r ../src/firefly/ntbks bundle/ntbks

#!/bin/bash
set -e

rm -rf ./bundle/python
eval "$(conda shell.bash hook)"
conda create -p ./bundle/python python=3.12 pip --yes
conda activate ./bundle/python
pip install ../ jupyter

cp -r ../src/firefly/static/data/FIRESampleData ./bundle/python/lib/python3.12/site-packages/firefly/static/data/

rm -rf bundle/ntbks 
cp -r ../src/firefly/ntbks bundle/ntbks

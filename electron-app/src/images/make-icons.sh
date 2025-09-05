#!/bin/bash
magick firefly-icon.png -define icon:auto-resize=256,128,64,48,32,24,16 firefly-icon.ico
magick firefly-icon.png -define icon:auto-resize=1024,512,256,128,64,32,16 firefly-icon.icns

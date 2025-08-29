# Firefly electron app

This directory contains file needed for the electron-based Firefly app.  The goal here is to include all the necessary files (including Python) and bundle this as a (double-clickable) executable to install Firefly and enable the user to run Firefly without needing any other installations or using the command line.

I am bundling Python along with this installation using miniforge, see `scripts/prepare.sh `

Some pre-made installation scripts are already available in the `dist` directory.  Use the correct one for your operating system to install this app on your machine.  


## For development and testing

If you need to build the app for your specific operating system and/or you would like to modify the app, you will first need to clone this repo to your machine.  You will also need to have `node`, `npm` and `conda` (e.g., miniforge) installed on your machine.

Then within this directory you should run:
```
npm install
npm run prepare
```
These commands will install the necessary node dependencies and create a version of Python and other necessary components bundled for the Firefly electron app to access.  The prepare step assumes that you have `conda` available within your `PATH`.  You only need to run these commands once.

Then to run a development version (without building):
```
npm run start
```

To build the electron app:
```
npm run build
```
This will create a setup executable file within your `dist` directory


(More information on these steps can be found in `package.json`.)
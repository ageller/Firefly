# Firefly electron app

This directory contains file needed for the electron-based Firefly app.  The goal here is to include all the necessary files (including Python) and bundle everything as a (double-clickable) executable to install Firefly and enable the user to run Firefly without needing any other installations or using the command line.

I am bundling Python along with this installation using miniforge, see `scripts/prepare.sh `

## For development and testing

If you need to build the app for your specific operating system and/or you would like to modify the app, you will first need to clone this repo to your machine.  You will also need to have `node` and `npm` installed on your machine.

Then within this directory you should run:
```
npm install
```
This command will install the necessary dependencies (first for `node` then for `python` via `scripts/prepare.sh` ) and bundle the necessary components into the `bundle/` directory for the Firefly electron app to access.  The prepare step will install `python` via `miniforge`.  You should only need to run this install command once.  If you see any error messages and/or you don't see `pip` install information in your terminal during this step, you may need to manually debug and run the prepare step using the command `npm run prepare`.

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
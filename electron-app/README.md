# Firefly electron app

This directory contains file needed for the electron-based Firefly app.  The goal here is to include all the necessary files (including Python) and bundle everything as a (double-clickable) executable to install Firefly and enable the user to run Firefly without needing any other installations or using the command line.

I am bundling Python along with this installation using miniforge, see `resources/scripts/prepare.sh `

The first time the user runs the app, it will execute the prepare script (see `resources/scripts/prepare.sh`) to install all the dependencies (including `python`).  This may take a while.  Files will be installed in `$HOME/.firefly`.       

## For development and testing

If you need to build the app for your specific operating system and/or you would like to modify the app, you will first need to clone this repo to your machine.  You will also need to have `node` and `npm` installed on your machine.

Then within this directory you should run:
```
npm install
```
This command will install the necessary `node` dependencies.  

Then to run a development version (without building):
```
npm run start
```

The first time you run the app, the prepare step will install `python` via `miniforge`.   

To build the electron app:
```
npm run build
```
This will create a installation executable file within your `dist` directory

(More information on these steps can be found in `package.json`.)
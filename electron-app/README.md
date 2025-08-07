This directory contains file needed for the electron-based Firefly app.  The goal here is to include all the necessary files (including python) and bundle this as a (double-clickable) executable to install firefly and enable the user to run firefly without needing any other installations or using the command line.

I am bundling python along with this installation using miniforge, see `scripts/prepare.sh `

To create the electron app (see `package.json`):
```
npm run build
```


Data controls
=============

### Decimation
Below the Camera Controls is the Decimation slider and text entry box.  Larger values of decimation causes less particles to be drawn.  (The minimum value is 1.)

### The top bar


This contains the word Controls and an X or "hamburger" symbol.  Click in here to show or hide the Controls panel.  If you click and drag in the top bar, you can move the Controls panel.

### Fullscreen

Click on the green Fullscreen button to resize the window into fullscreen mode.  Use the escape key to go back to the previous view.

### Take Snapshot

This button will take a snapshot of the current view (without the Controls panel).  There are two text boxes with numbers that you can change (here showing 1920, 1200).  These define the width and height, respectively of the snapshot.  When you click this button, you should be prompted to download the snapshot as a png file.  This feature may work best in Firefox.

### Save Preset

This button will save a file names "preset.json" to your computer.  This preset file contains all the information needed to restart Firefly from the current configuration. In some browsers, this file will be downloaded automatically to your Downloads folder.  You can move this file wherever you want, and rename it (but do not change it's contents.)

### Reset to Default

Click this button to reset all values to the defaults that were used when Firefly launched.

### Reset to Preset

Click this button to reset all values to a preset file that you either created with the python reader (see [here](https://github.com/ageller/Firefly/wiki/Python-Data-Converter)), or by clicking the Save Preset button.  When you click Reset to Preset, you will be prompted to locate a preset file on your computer.  Once you select it, Firefly will reset to the configuration saved in the preset file.

### Load New Data

Click this button to select a new data set to display in Firefly.  Once clicked, you will be prompted to select a directory on your computer that contains the json files produced by FIREreader.py.  Note, after you select the directory, some browsers may show a default warning message that you are about to upload many files to the site and to only do so if you trust the site. Please allow Firefly to upload these files.  Also, note that for most browsers, you will only be able to select a directory that is within your data directory. Please keep your json files there.




Understanding Firefly's input requirements
==========================================

### Understanding Firefly's output requirements
Firefly (currently) uses `JSON` to load data into the browser's javascript interpreter. There are four classes of `.json` file that Firefly requires:

* `startup.json` - this is a specifically formatted configuration file that tells Firefly what dataset/visualization to load at startup. If it is in the form of an array Firefly will allow the user to select the dataset/visualization from a dropdown when Firefly is initialized. This must be contained within `Firefly/data`.

* `(options).json` - this is a `.json` file that contains the default options for various aspects of Firefly's UI, as well as default filter settings for each of the particle groups. It should be created using an Options instance and its corresponding `outputToJSON()` method. This lives in the `JSONdir` sub-directory described above. It can be named whatever you'd like as long as it is linked to correctly within `filenames.json`, described below.

* `(prefix)(particleName)(fileNumber).json` - These are the main data files, and contain the particle coordinates and their corresponding array values. They should be created using a ParticleGroup instance's `outputToJSON()` method. These files live in the `JSONdir` sub-directory described above. They can be named whatever you'd like as long as they are linked to correctly within `filenames.json`, described below.

* `filenames.json` - this is a specifically formatted configuration file that tells Firefly what `options.json` file to load and which data `.jsons` to load. This lives in the `JSONdir` sub-directory described above. The easiest way to create this file is to use a Reader instance's `dumpToJSON()` method that contains corresponding Options and ParticleGroup instances (see above).

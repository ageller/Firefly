Managing multiple datasets
==========================

The code within [`firefly_api`](https://github.com/ageller/Firefly/tree/main/dataReader/firefly_api) will help you convert your data set into a format that is readable by Firefly. The converted data for Firefly is placed within the "data" directory within a sub-directory defined either by the snapshot number, or by the user-defined `reader.JSONdir`.  The python code also creates a file named `startup.json` in the "data" directory.  This file is the first thing read into Firefly, and tells Firefly where to find the rest of the data files;  it simply contains the name of the directory where your data resides.

If `startup.json` does not exist, Firefly will display a button that will allow you to select the directory containing the files you want to load (the directory must contain a `filelist.json` file).  You may choose to simply remove the `startup.json file`, or set the option in your `Reader` instance to not create that file automatically.  In that case, you will always need to select a data directory when Firefly launches.

If you already have a data set loaded and displayed in Firefly, you can load a new data set from within the user interface by clicking on the "Load New Data Button".  Again, you will need to choose a directory that contains your json data files (and `filelist.json`).

Note, some browsers may show a default warning message that you are about to upload many files to the site and to only do so if you trust the site.  Please allow Firefly to upload these files-- you are not uploading them to the internet.

Also, note that for most browsers, you will only be able to select a directory that is within your data directory.  You must keep your json files there or could use symbolic links within the data directory pointing to elsewhere on your local disk, e.g.,
```
$ ln -s /home/mydirectory/snapdir_XXX
```
if you'd rather.

If you have multiple data sets available on your computer and prefer to have a menu of these data files to choose from at the start of Firefly, you can append entries to the `startup.json` file to create a list of directories (using the `Reader` instance's `'append'` option for `write_startup`).  For instance, dataParser.py may create a `startup.json` file that contains the following:
```
{"0":"data\/snapdir_001"}
```

You could manually append this to contain the following:
```
{"0":"data\/snapdir_001"
 "1":"data\/snapdir_002"
 "2":"data\/snapdir_003"
 "3":"data\/snapdir_004"}
```
Or use the `'append'` option, as suggested above.

With this `startup.json`, you would see a button when Firefly loads that, when clicked, will allow you to choose which data set to display.  In general, this method may be useful if you are [running Firefly on a remote computer](https://github.com/ageller/Firefly/wiki/Hosting-Firefly-on-a-Cluster-Environment) that contains all your data and port forwarding to your local browser (which can only see your local file system).

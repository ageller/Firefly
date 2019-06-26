from __future__ import print_function

import numpy as np
import os

from firefly_api.options import Options
from firefly_api.reader import Reader,ParticleGroup
from firefly_api.errors import FireflyError,FireflyWarning,warnings


try:
    ### depends on abg_python, if you're me that's not a problem!
    from abg_python.snapshot_utils import openSnapshot
except ImportError:
    try: 
        import snapshot_utils
        warnings.warn(FireflyWarning(
            "importing openSnapshot from: {}".format(snapshot_utils.__file__)))
        openSnapshot = snapshot_utils.openSnapshot
    except ImportError:
        raise ImportError("snapshot_utils not found, try looking inside Firefly/data"+
            "or use yt to open your gizmo data")

class FIREreader(Reader):
    """
    This is an example of a "custom" Reader that has been tuned to conveniently
    open data from the FIRE galaxy formation collaboration (fire.northwestern.edu).
    You should use this as a primer for building your own custom reader!
    """
    def __init__(self,
        snapdir, # directory that contains all the hdf5 data files
        snapnum, # which snapnumber to open
        ptypes = [], # which particle types to extract
        UInames = [], # what those particle types will be called in the UI
        dec_factors = [], # factor by which to decimate the particle types by
        returnKeys = [], # which things to read from the simulation
        filterFlags = [], # flags whether we should filter by that returnKey
        colormapFlags = [], # flags whether we should color by that returnKey
        doMags = [], # flags for whether we should take the magnitude of that returnKey
        doLogs = [], # flags for whether we should take the log of that returnKey
        ## arguments from Reader
        JSONdir=None, ## abs path, must be a sub-directory of Firefly/data
        write_startup = 'append',# True -> write | False -> leave alone | "append" -> adds to existing file
        max_npart_per_file = 10**4,
        prefix = 'FIREData',
        clean_JSONdir = 0,
        options = None,
        ):
        """
        snapdir - string, directory that contains all the hdf5 data files
        snapnum - integer, which snapshot to open
        ptypes=[] - list of strings, which particle types to extract (e.g. 'PartType0', 'PartType1')
        UInames=[] - list of strings, what should the particle groups be called in the UI
        dec_factors=[] - list of integers, by what factor should the datasets be subsampled
        returnKeys=[] - list of strings, which arrays from the snapshot should we extract,
            do not include 'Coordinates'
        filterFlags=[] - list of booleans, of those, which should be "filterable"
        colormapFlags=[] - list of booleans, of those, which should be "colarable"
        doMags=[] - list of booleans, of those, which should have their magnitude taken (e.g. velocity)
        doLogs=[] - list of booleans, of those, which should have their log10 taken (e.g. density)

        ------ inherited from Reader ------
        `JSONdir=None` - This should be the name of the sub-directory that will
            contain your JSON files, if you are not running python from
            `/path/to/Firefly/data` it should be the absolute path.

        `options=None` - An `Options` instance, if you have created one you can
            pass it here. `None` will generate default options. `reader.options.listKeys()`
            will give you a list of the different available options you can set
            using `reader.options["option_name"] = option_value`. 

        `write_startup='append'` - This is a flag for whether `startup.json` file
            should be written. It has 3 values: `True` -> writes a new `startup.json`
            that will contain only this visualization, `'append'` -> which will
            add this visualization to an existing `startup.json` (or create a
            new one), this is the default option, or `False` -> which will not
            add an entry to `startup.json`.

        `max_npart_per_file=10000` - The maximum number of particles saved per file,
            don't use too large a number or you will have trouble loading
            the individual files in. 

        `prefix='Data'` - What you would like your `.json` files to be called when
            you run `reader.dumpToJSON`. The format is
            `(prefix)(particleGroupName)(fileNumber).json`.

        `clean_JSONdir=0` - Whether you would like to delete all `.json` files in
            the `JSONdir`. Usually not necessary (since `filenames.json` will be
            updated) but good to clean up after yourself.
        """
        ## input validation
        ##  ptypes
        try:
            lists = [dec_factors,UInames]
            names = ['dec_factors','UInames']
            for name,llist in zip(names,lists):
                assert len(llist) == len(ptypes)
        except AssertionError:
            raise ValueError("%s is not the same length as ptypes (%d,%d)"%(name,len(llist),len(ptypes)))

        ##  returnKeys
        try:
            lists = [filterFlags,colormapFlags,doMags,doLogs]
            names = ['filterFlags','colormapFlags','doMags','doLogs']
            for name,llist in zip(names,lists):
                assert len(llist) == len(returnKeys)
        except AssertionError:
            raise ValueError("%s is not the same length as returnKeys (%d,%d)"%(name,len(llist),len(returnKeys)))
    
        ##  IO/snapshots
        try:
            assert os.path.isdir(snapdir)
        except AssertionError:
            raise IOError("Cannot find %s"%snapdir)


        ##  this i handle separately 
        if 'Coordinates' in returnKeys:
            print("Do not put Coordinates in returnKeys,removing it... (and its flags)")
            returnKeys = list(returnKeys)
            filterFlags = list(filterFlags)
            colormapFlags = list(colormapFlags)
            doMags = list(doMags)
            doLogs = list(doLogs)

            index = returnKeys.index('Coordinates')

            for llist in [returnKeys,filterFlags,doMags,doLogs]:
                llist.pop(index)

        ## where to find the HDF5 files
        self.snapdir = snapdir
        self.snapnum = snapnum

        ## which particles we want to extract
        self.ptypes = ptypes

        ## what do we want to call those particles in the UI
        self.UInames = UInames
        
        ## do we want to decimate the arrays at all?
        self.dec_factors = dec_factors

        ## what attributes do we want to load of that particle type?
        self.returnKeys = returnKeys
        
        ## do we want to filter on that attribute?
        self.filterFlags = filterFlags

        ## do we want to color by that attribute?
        self.colormapFlags = colormapFlags
        
        ## do we need to take the magnitude of it? (velocity? typically not..)
        self.doMags = doMags
        
        ## do we need to take the log of it 
        self.doLogs = doLogs

        ####### Reader __init__ below: #######

        ## absolute path of where to place all the data files in, must be a 
        ##  sub-directory of Firefly/data for Firefly to be able to find it.
        if JSONdir is None:
            ## let's try and guess what the JSONdir should be
            raise Exception("Datadir guessing is unimplemented!")
            """
            raise IOError("You must specify the absolute path of the"+
                " directory to save the JSON files using the JSONdir kwarg")
            """
        self.JSONdir = JSONdir
        self.path_prefix,self.path = self.splitAndValidateDatadir()

        #write the startup file?
        self.write_startup = write_startup

        #set the maximum number of particles per data file
        self.max_npart_per_file = max_npart_per_file

        ## prefix for the datafiles e.g. FIREdata
        self.prefix = prefix

        #remove the data files in the dataDir directory before adding more?
        self.clean_JSONdir = clean_JSONdir 
        
        if options is None:
            options = Options()

        self.options = options
    
        ## array of particle groups
        self.particleGroups = []
        
        self.particleGroups = []

    def loadData(self):
        """
        Loads the snapshot data using Alex Gurvich's openSnapshot utility
        (originally from github.com/abg_python) and binds it to a ParticleGroup.
        Converts to physical coordinates (removes factors of h and scale factor)
        and will calculate the temperature and age in gyr of star particles for you
        (You're welcome!!). Also adds these particle groups to the reader's options file.
        """
        for ptype,UIname,dec_factor in list(zip(self.ptypes,self.UInames,self.dec_factors)):
            print("Loading ptype %s"%ptype)
            snapdict = openSnapshot(
                self.snapdir,
                self.snapnum,
                int(ptype[-1]), ## ptype should be PartType4,etc...
                keys_to_extract = ['Coordinates']+self.returnKeys
            )

            tracked_names,tracked_arrays,tracked_filter_flags,tracked_colormap_flags = [],[],[],[]
            for returnKey,filterFlag,colormapFlag,doMag,doLog in list(zip(
                self.returnKeys,self.filterFlags,self.colormapFlags,self.doMags,self.doLogs)):
                if returnKey in snapdict:
                    arr = snapdict[returnKey]
                    if doLog:
                        arr = np.log10(arr)
                        returnKey = 'log10%s'%returnKey
                    elif doMag:
                        arr = np.linalg.norm(arr,axis=1)
                        returnKey = 'mag%s'%returnKey

                    tracked_names += [returnKey]
                    tracked_filter_flags += [filterFlag]
                    tracked_colormap_flags += [colormapFlag]
                    tracked_arrays+= [arr]
                
            self.particleGroups += [ParticleGroup(
                UIname,
                snapdict['Coordinates'],
                tracked_names = tracked_names,
                tracked_arrays = tracked_arrays,
                decimation_factor = dec_factor,
                tracked_filter_flags = tracked_filter_flags,
                tracked_colormap_flags = tracked_colormap_flags
                )]

            ## save the filenames that were opened (so you can re-open them yourself in that order)
            self.particleGroups[-1].filenames_opened = snapdict['fnames']

            ## add this particle group to the reader's options file
            self.options.addToOptions(self.particleGroups[-1])

        return self.particleGroups

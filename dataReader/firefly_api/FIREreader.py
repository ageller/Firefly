import numpy as np
import os

from firefly_api.options import Options
from firefly_api.reader import Reader,ParticleGroup
from firefly_api.errors import FireflyError,FireflyWarning,FireflyMessage,warnings


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
        ptypes = None, # which particle types to extract
        UInames = None, # what those particle types will be called in the UI
        decimation_factors = None, # factor by which to decimate the particle types by
        returnKeys = None, # which things to read from the simulation
        filterFlags = None, # flags whether we should filter by that returnKey
        colormapFlags = None, # flags whether we should color by that returnKey
        doMags = None, # flags for whether we should take the magnitude of that returnKey
        doLogs = None, # flags for whether we should take the log of that returnKey
        ## arguments from Reader
        JSONdir=None, ## abs path, must be a sub-directory of Firefly/data
        write_startup = 'append',# True -> write | False -> leave alone | "append" -> adds to existing file
        max_npart_per_file = 10**4,
        prefix = 'FIREData',
        clean_JSONdir = 0,
        options = None,
        tweenParams=None
        ):
        """
        snapdir - string, directory that contains all the hdf5 data files
        snapnum - integer, which snapshot to open
        ptypes=[] - list of strings, which particle types to extract (e.g. 'PartType0', 'PartType1')
        UInames=[] - list of strings, what should the particle groups be called in the UI
        decimation_factors=[] - list of integers, by what factor should the datasets be subsampled
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

        `tweenParams=None` - a tweenParams instance for automating a fly-through
            path by pressing `t` while within an open instance of Firefly.

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

        ## handle default input
        ptypes = [] if ptypes is None else ptypes
        UInames = [] if UInames is None else UInames
        decimation_factors = [] if decimation_factors is None else decimation_factors
        returnKeys = [] if returnKeys is None else returnKeys
        filterFlags = [] if filterFlags is None else filterFlags
        colormapFlags = [] if colormapFlags is None else colormapFlags
        doMags = [] if doMags is None else doMags
        doLogs = [] if doLogs is None else doLogs

        ## input validation
        ##  ptypes
        try:
            lists = [decimation_factors,UInames]
            names = ['decimation_factors','UInames']
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

        ##  this I handle separately 
        if 'Coordinates' in returnKeys:
            warnings.warn(FireflyWarning(
                "Do not put Coordinates in returnKeys,removing it... (and its flags)"))
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
        self.decimation_factors = decimation_factors

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

        ####### execute generic Reader __init__ below #######
        super().__init__(
            JSONdir=JSONdir,
            write_startup=write_startup,
            max_npart_per_file=max_npart_per_file,
            prefix = prefix,
            options = options,
            clean_JSONdir = clean_JSONdir,
            tweenParams = tweenParams)

    def loadData(self):
        """
        Loads the snapshot data using Alex Gurvich's openSnapshot utility
        (originally from github.com/abg_python) and binds it to a ParticleGroup.
        Converts to physical coordinates (removes factors of h and scale factor)
        and will calculate the temperature and age in gyr of star particles for you
        (You're welcome!!). Also adds these particle groups to the reader's options file.
        """
        for ptype,UIname,dec_factor in list(zip(self.ptypes,self.UInames,self.decimation_factors)):
            FireflyMessage("Loading ptype %s"%ptype)
            snapdict = openSnapshot(
                self.snapdir,
                self.snapnum,
                int(ptype), ## ptype should be PartType4,etc...
                keys_to_extract = ['Coordinates']+self.returnKeys
            )

            tracked_names,tracked_arrays,tracked_filter_flags,tracked_colormap_flags = [],[],[],[]
            for returnKey,filterFlag,colormapFlag,doMag,doLog in list(zip(
                self.returnKeys,self.filterFlags,self.colormapFlags,self.doMags,self.doLogs)):
                if returnKey in snapdict:
                    arr = snapdict[returnKey]
                ## if asked to compute galactocentric radius from the coordinates
                elif returnKey in ['GCRadius']:
                    arr = np.sqrt(np.sum(snapdict['Coordinates']**2,axis=1))
                else:
                    continue

                if doLog:
                    arr = np.log10(arr)
                    returnKey = 'log10%s'%returnKey
                elif doMag:
                    arr = np.linalg.norm(arr,axis=1)
                    returnKey = 'mag%s'%returnKey

                tracked_names = np.append(
                    tracked_names,
                    [returnKey],axis=0)

                tracked_filter_flags = np.append(
                    tracked_filter_flags,
                    [filterFlag],axis=0)

                tracked_colormap_flags = np.append(
                    tracked_colormap_flags,
                    [colormapFlag],axis=0)

                tracked_arrays.append(arr)
                
            self.particleGroups = np.append(
                self.particleGroups,
                [ParticleGroup(
                    UIname,
                    snapdict['Coordinates'],
                    tracked_names = tracked_names,
                    tracked_arrays = tracked_arrays,
                    decimation_factor = dec_factor,
                    tracked_filter_flags = tracked_filter_flags,
                    tracked_colormap_flags = tracked_colormap_flags,
                    doSPHrad = 'SmoothingLength' in tracked_names)],
                axis=0)

            ## save the filenames that were opened (so you can re-open them yourself in that order)
            self.particleGroups[-1].filenames_opened = snapdict['fnames']

            ## add this particle group to the reader's options file
            self.options.addToOptions(self.particleGroups[-1])

        return self.particleGroups

class SimpleFIREreader(FIREreader):
    
    def __init__(
        self,
        path_to_snapshots,
        decimation=10,
        **kwargs):
        """
        A highly specific iteration of FIREreader that will create JSON files with
        only a single line for a default view.
        """

        if path_to_snapshots[-1] == os.sep:
            path_to_snapshots = path_to_snapshots[:-1]

        snapdir = os.path.dirname(path_to_snapshots)
        try:
            snapnum = int(path_to_snapshots.split('_')[-1])
        except:
            raise ValueError(
                "%s should be formatted as 'path/to/output/snapdir_xxx'"%path_to_snapshots+
                " where xxx is an integer")

        ## initialize the reader object
        super().__init__(
            snapdir,
            snapnum,
            ptypes = [0,4], # which particle types to extract
            UInames = ['gas','stars'], # what those particle types will be called in the UI
            decimation_factors = [decimation,decimation], # factor by which to decimate the particle types by
            returnKeys = ['AgeGyr','Temperature','Velocities','GCRadius'], # which things to read from the simulation
            filterFlags = [True,True,True,True], # flags whether we should filter by that returnKey
            colormapFlags = [True,True,True,True], # flags whether we should color by that returnKey
            doMags = [False,False,True,False], # flags for whether we should take the magnitude of that returnKey
            doLogs = [False,True,False,False], # flags for whether we should take the log of that returnKey
            ## arguments from Reader
            write_startup = True,# True -> write | False -> leave alone | "append" -> adds to existing file
            prefix = 'FIREData_%d'%snapnum,
            **kwargs)

        ## load the data
        self.loadData()

        self.options['color']['gas'] = [1,0,0,1]
        self.options['color']['stars'] = [0,0,1,1]

        self.options['sizeMult']['gas'] = 0.5
        self.options['sizeMult']['stars'] = 0.5

        self.options['camera'] = [0,0,-15]

        ## dump the JSON files
        self.dumpToJSON(loud=True)

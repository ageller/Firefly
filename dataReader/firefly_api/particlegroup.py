import numpy as np


import os 

from firefly_api.errors import FireflyError,FireflyWarning,FireflyMessage,warnings
from firefly_api.json_utils import write_to_json

class ParticleGroup(object):
    """
    This is a class for organizing data that you want to interface with a 
    Reader instance. This class provides rudimentary data validation and 
    options defaults specific to this data class. If you do not intend
    to attach it to a Reader instance using that reader's addParticleGroup
    method please be careful!!
    """

    def __repr__(self):
        """
        Implementation of builtin function __repr__
        """
        mystr = "\nParticleGroup: %s\n"%(self.UIname)
        mystr += "Contains %d particles (%d after decimation) and %d tracked fields"%(
            self.nparts,self.nparts//self.decimation_factor,len(self.tracked_names))
        return mystr

    def __getitem__(self,key):
        """
        Implementation of builtin function __getitem__
        """
        if key == 'Coordinates':
            return self.coordinates

        elif key in self.tracked_names:
            return self.tracked_arrays[self.tracked_names.index(key)]
        else:
            raise KeyError("%s is not a tracked array"%key)
    
    def __setitem__(self,key,value):
        """
        Implementation of builtin function __setitem__
        """
        if key == 'Coordinates':
            self.coordinates=value
        elif key in self.tracked_names:
            self.tracked_arrays[self.tracked_names.index(key)]=value
        else:
            raise KeyError("%s is not a tracked array"%key)
        
    def __init__(
        self,
        UIname,
        coordinates,
        tracked_arrays = None,
        tracked_names = None,
        tracked_filter_flags = None,
        tracked_colormap_flags = None,
        decimation_factor = 1,
        filenames_and_nparts = None,
        linked_options=None,
        doSPHrad=False,
        **option_kwargs):
        """
        `UIname` - Name of the particle group that shows up in the UI, 4-5 characters is best

        `coordinates` - The coordinates of the points in 3d space, should have a shape of `(nparts,3)`.

        `tracked_arrays=[]` - The arrays to associate with each coordinate in space, each array
            should be one-dimensional and have `nparts` entries.

        `tracked_names=[]` - Should be the same length as `tracked_arrays`, and gives a
            name to each of the arrays when they show up in the UI dropdowns.

        `tracked_filter_flags=[]` - Should be the same length as `tracked_arrays`,
            and gives a flag for whether that array should be available as an interactive filter within Firefly.
        `tracked_colormap_flags=[]` - Should be the same length as `tracked_arrays`,
            and gives a flag for whether that array should be available to color points within Firefly.

        `decimation_factor=1` - An integer factor to sub-sample the provided dataset at
            (in addition to any manual subsampling you might do). This will choose
            `nparts/decimation_factor` many points at random from the dataset to display in Firefly. 

        `filenames_and_nparts=None` - Allows you to manually control how the particles
            are distributed among the JSON files, **highly recommended that
            you leave this to** `None`, but if for whatever reason you need fine-tuning
            you should pass a list of tuples in the form 
            `[("json_name0.json",nparts_this_file0),("json_name1.json",nparts_this_file1) ... ]`
            where where the sum of `nparts_this_file%d` is exactly `nparts`. These files
            will automatically be added to `filenames.json` if you use `reader.dumpToJSON`.

        `doSPHrad=False` - flag to vary the opacity across a particle by the SPH cubic spline. Should
            also provide SmoothingLength as a tracked_array. 

        `**option_kwargs` - allows you to set default options like the color, particle sizes,
            etc... for this particle group at the creation of the instance. You can see available
            options by looking at `list(particleGroup.options_default.keys())`.
        """

        ## handle default values for iterables
        tracked_arrays = [] if tracked_arrays is None else tracked_arrays
        tracked_names = [] if tracked_names is None else tracked_names
        tracked_filter_flags = [] if tracked_filter_flags is None else tracked_filter_flags
        tracked_colormap_flags = [] if tracked_colormap_flags is None else tracked_colormap_flags

        ## assert statements and user-friendly error messages
        try:
            assert len(tracked_names) == len(tracked_arrays)
        except:
            raise ValueError("Make sure each tracked_array has a tracked_name")
    
        try: 
            assert len(tracked_names) == len(tracked_filter_flags)
        except:
            warnings.warn(FireflyWarning(
                "Make sure each tracked_array has a tracked_filter_flag, assuming True."))
            new_tracked_filter_flags = np.append(
                tracked_filter_flags,
                [True]*(len(tracked_names)-len(tracked_filter_flags)),axis=0
            )
            tracked_filter_flags = new_tracked_filter_flags

        try: 
            assert len(tracked_names) == len(tracked_colormap_flags)
        except:
            warnings.warn(FireflyWarning(
                "Make sure each tracked_array has a tracked_colormap_flag, assuming True."))
            new_tracked_colormap_flags = np.append(
                tracked_colormap_flags,
                [True]*(len(tracked_names)-len(tracked_colormap_flags)),axis=0
            )
            tracked_colormap_flags = new_tracked_colormap_flags

        
        if filenames_and_nparts is not None:
            try:
                assert type(filenames_and_nparts[0]) == tuple
                assert type(filenames_and_nparts[0][0]) == str
                assert type(filenames_and_nparts[0][1]) == int
            except AssertionError:
                ValueError("filenames_and_nparts should be a list of tuples of strings and ints")
        
        self.decimation_factor = decimation_factor
        ## what do we want this to be called in the UI? 
        self.UIname = UIname

        ## the most important thing, where do you want these particles
        ##  to live?
        self.coordinates = np.array(coordinates)

        if self.decimation_factor > self.coordinates.shape[0]:
            self.decimation_factor = max(1,self.coordinates.shape[0]-1)

        ## initialize this badboy
        self.nparts = len(coordinates)

        ## these are the values we're associating with each particle
        ##  make sure each one has a name
        for name,array in zip(tracked_names,tracked_arrays):
            try:
                assert len(array) == self.nparts
            except:
                raise ValueError("You passed me %s that is not the right shape!"%name)

        self.tracked_names = tracked_names
        self.tracked_arrays = tracked_arrays
        self.tracked_filter_flags = np.array(tracked_filter_flags)
        self.tracked_colormap_flags = np.array(tracked_colormap_flags)

        self.filenames_and_nparts = filenames_and_nparts

        ## TODO how do these interface with javascript code?
        self.radiusFunction = None
        self.weightFunction = None

        ## setup the options for this particleGroup 
        self.options_default = {
            'UIparticle':True,
            'UIdropdown':True,
            'UIcolorPicker':True,
            'color': np.append(np.random.random(3),[1]),
            'sizeMult':1.,
            'showParts':True,
            'filterVals':dict(),
            'filterLims':dict(),
            'colormapVals':dict(),
            'colormapLims':dict(),
            'colormap':1./64,
            'colormapVariable':0,
            'showColormap':False,
            'showVel':False,
            'plotNmax':None,
            'velType':None
        }
        
        ## setup default values for the initial filter limits (vals/lims represent the interactive
        ##  "displayed" particles and the available boundaries for the limits)
        for tracked_name,tracked_filter_flag in zip(self.tracked_names,self.tracked_filter_flags):
            if tracked_filter_flag:
                self.options_default['filterVals'][tracked_name] = None
                self.options_default['filterLims'][tracked_name] = None

        ## setup default values for the initial color limits (vals/lims represent the interactive
        ##  "displayed" particles and the available boundaries for the limits)
        for tracked_name,tracked_colormap_flag in zip(self.tracked_names,self.tracked_colormap_flags):
            if tracked_filter_flag:
                self.options_default['colormapVals'][tracked_name] = None
                self.options_default['colormapLims'][tracked_name] = None
        
        ## now let the user overwrite the defaults if they'd like (e.g. the color, likely
        ##  the most popular thing users will like to do
        for option_kwarg in option_kwargs:
            if option_kwarg in self.options_default.keys():
                if option_kwarg == 'color':
                    try:
                        assert len(option_kwargs[option_kwarg]) == 4
                    except AssertionError:
                        raise ValueError("Make sure you pass the color as an RGBA array")
                        
                self.options_default[option_kwarg] = option_kwargs[option_kwarg]
            else:
                raise KeyError("Invalid option kwarg")
        self.linked_options = linked_options
        self.doSPHrad = doSPHrad
        
    def trackArray(self,name,arr,filter_flag=1,colormap_flag=1):
        """
        Adds a new "tracked" array to the particle group
        Input:
            name - name of the tracked array in the UI
            arr - the array itself
            filter_flag=1 - whether this array should be filterable in the app
        """
        ## check that it's the correct length
        assert self.nparts == len(arr)

        ## go ahead and put it in the tracked arrays
        self.tracked_names = np.append(self.tracked_names,[name],axis=0)
        self.tracked_arrays.append(arr)
        self.tracked_filter_flags = np.append(
            self.tracked_filter_flags,
            [filter_flag],axis=0)
        self.tracked_colormap_flags = np.append(
            self.tracked_colormap_flags,
            [colormap_flag],axis=0)

        ## and add this to the filter limits arrays, see __init__ above
        if filter_flag: 
            self.options_default['filterVals'][name] = None
            self.options_default['filterLims'][name] = None

        ## and add this to the color limits arrays, see __init__ above
        if colormap_flag: 
            self.options_default['colormapVals'][name] = None
            self.options_default['colormapLims'][name] = None

        if self.linked_options is not None:
            self.linked_options['filterVals'][self.UIname][name] = None
            self.linked_options['filterLims'][self.UIname][name] = None

            self.linked_options['colormapVals'][self.UIname][name] = None
            self.linked_options['colormapLims'][self.UIname][name] = None

    def getDecimationIndexArray(self):
        """
        Creates a numpy index array to handle decimation (sub-sampling) of your
        data. Chooses nparts/decimation_factor many particles randomly without
        replacement.
        """
        if self.decimation_factor > 1 and self.nparts > self.decimation_factor:
            ## use an array of indices
            self.dec_inds = np.random.choice(
                np.arange(self.nparts),int(self.nparts/self.decimation_factor),
                replace=False)
        else:
            ## use a boolean mask instead
            self.dec_inds = np.ones(self.nparts,dtype=bool)

    def outputToDict(
        self,
        these_dec_inds=[None],
        i_file=0,
        verbose=False):
        """
        Outputs a subset of this ParticleGroup instance's 
            data to a dictionary. The subset is determined by the 
            `these_dec_inds` input which should be an array of indices
            matching the tracked arrays. If no input mask is provided 
            it will default to np.arange(len(coordinates)).
        Input:
            these_dec_inds = [None] - the decimation indices to 
                use, defining a subset of the particlegroup data to 
                output.
            i_file=0 - the index of the file (if looping through 
                your particle group data and outputting a series 
                of files). If the index is 0 the output dictionary
                will include the colormap and filter keys.
        Output:
            outDict - a dictionary containing the particlegroup
                information for the indices matching the tracked
                arrays.
        """
        
        ## initialize the output dictionary
        outDict = dict()

        ## initialize a default set of dec inds if none are 
        ##  passed
        if (these_dec_inds[0] == None):
            these_dec_inds = np.arange(len(self.coordinates))
        
        ## save the coordinates as a special case since they 
        ##  aren't in the tracked array
        outDict['Coordinates'] = self.coordinates[these_dec_inds]

        ## do the bulk of the work in a simple loop
        for tracked_name,tracked_arr in zip(
            self.tracked_names,
            self.tracked_arrays):

            outDict[tracked_name]=tracked_arr[these_dec_inds]

        ## if this is the first file, let's include the colormap
        ##  and filter keys
        if i_file == 0:
            if (verbose): print(self.tracked_names,
                'filter:',self.tracked_filter_flags,
                'colormap:',self.tracked_colormap_flags)
            outDict['filterKeys'] = np.array(self.tracked_names)[np.array(
                 self.tracked_filter_flags,dtype=bool)]
            outDict['colormapKeys'] = np.array(self.tracked_names)[np.array(
                self.tracked_colormap_flags,dtype=bool)]

            ## TODO this needs to be changed, this is a flag for having the
            ##  opacity vary across a particle as the impact parameter projection
            ##  of cubic spline kernel
            outDict['doSPHrad'] = [self.doSPHrad]
        
        return outDict

    def outputToJSON(
        self,
        path, ## sub-directory name
        path_prefix, ## absolute path to Firefly/data
        prefix, ## prefix of JSON filename
        loud=1,
        nparts_per_file = 10**4,
        clean=0,
        write_jsons_to_disk=True):
        """
        Outputs this ParticleGroup instance's data to JSON format, best used when coupled with a Reader
        instance's dumpToJSON method. 
        Input:
            path - the name of the sub-directory of Firefly/data you want to put these files into
            path_prefix - the the path to Firefly/data
            prefix - the string you want to prepend to the data JSONs
            loud=1 - flag to print warnings that you should hear if you're not using a
                reader that does these things for you
            nparts_per_file=10**4 - maximum number of particles per JSON file
            clean=0 - flag for whether the JSON directory should be purged before writing your files.
         """

        ## shuffle particles and decimate as necessary, save the output in dec_inds
        self.getDecimationIndexArray()

        ## where are we saving this json to?
        full_path = os.path.join( path_prefix, path )
        if not os.path.isdir(full_path):
            os.makedirs(full_path)
        if loud:
            FireflyMessage(
                "You will need to add the sub-filenames to"+
                " filenames.json if this was not called by a Reader instance.")
            FireflyMessage("Writing:",self,"JSON to %s"%full_path)

        ## do we want to delete any existing jsons here?
        if clean:
            warnings.warn(FireflyWarning("Removing old JSON files from %s"%full_path))
            for fname in os.listdir(full_path):
                if "json" in fname:
                    os.remove(os.path.join(full_path,fname))

        ## if the user did not specify how we should partition the data between
        ##  sub-JSON files then we'll just do it equally
        if self.filenames_and_nparts is None:
            ## determine if we were passed a boolean mask or a index array
            if self.dec_inds.dtype == bool:
                nparts = np.sum(self.dec_inds)
                self.dec_inds = np.argwhere(self.dec_inds) ## convert to an index array
            else:
                nparts = self.dec_inds.shape[0]

            ## how many sub-files are we going to need?
            nfiles = int(nparts/nparts_per_file + ((nparts%nparts_per_file)!=0))

            ## how many particles will each file have and what are they named?
            filenames = [os.path.join(path,"%s%s%03d.json"%(prefix,self.UIname,i_file)) for i_file in range(nfiles)]
            nparts = [min(nparts_per_file,nparts-(i_file)*(nparts_per_file)) for i_file in range(nfiles)]

            self.filenames_and_nparts = list(zip(filenames,nparts))
        
        JSON_array = []
        ## loop through the sub-files
        cur_index = 0
        for i_file,(fname,nparts_this_file) in enumerate(self.filenames_and_nparts):
            ## pick out the indices for this file
            if self.decimation_factor > 1:
                these_dec_inds = self.dec_inds[cur_index:cur_index+nparts_this_file]
            else:
                ## create a dummy index array that takes everything
                these_dec_inds = np.arange(cur_index,cur_index+nparts_this_file)
        
            ## format an output dictionary
            outDict = self.outputToDict(these_dec_inds, i_file)

            fname = os.path.join(path_prefix,fname)

            JSON_array += [(
                fname,
                write_to_json(outDict,
                    fname if write_jsons_to_disk else None))] ## path=None -> returns a string

            ## move onto the next file
            cur_index += nparts_this_file
        
        return JSON_array

    def outputToHDF5(self):
        """
        Hook for a future implementation of Firefly that can use HDF5 formats.
        """
        raise Exception("Unimplemented!")

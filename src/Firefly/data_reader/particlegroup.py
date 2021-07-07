import numpy as np


import os 

from .json_utils import write_to_json

class ParticleGroup(object):
    """
    This is a class for organizing data that you want to interface with a 
    Reader instance. This class provides rudimentary data validation and 
    settings defaults specific to this data class. If you do not intend
    to attach it to a Reader instance using that reader's addParticleGroup
    method please be careful!!
    """

    def __repr__(self):
        """Implementation of builtin function __repr__

        :return: mystr, the pretty rendering of a particle group
        :rtype: str
        """
        
        mystr = "%s "%(self.UIname)
        mystr += "- %d/%d particles - %d tracked fields"%(
            self.nparts//self.decimation_factor,self.nparts,len(self.tracked_names))
        return mystr

    def __getitem__(self,key):
        """Implementation of builtin function __getitem__ to retreive tracked field data.

        :param key: field array to extract
        :type key: str 
        :raises KeyError: if field is not one of the tracked fields
        :return: field
        :rtype: np.ndarray
        """

        if key == 'Coordinates':
            return self.coordinates

        elif key in self.tracked_names:
            return self.tracked_arrays[self.tracked_names.index(key)]
        else:
            raise KeyError("%s is not a tracked array"%key)
    
    def __setitem__(self,key,value):
        """Implementation of builtin function __setitem__ to replace
            field data or track new fields. Filter flag and colormap flags
            will be set to true, call :func:`Firefly.data_reader.ParticleGroup.trackArray`
            directly if this is undesired.

        :param key: name of field to alter or start tracking
        :type key: str
        :param value: field data to replace current field data with
            or initially track
        :type value: np.ndarray 
        """

        if key == 'Coordinates':
            ## replace the coordinates
            self.coordinates=value
        elif key in self.tracked_names:
            ## replace a field array
            self.tracked_arrays[self.tracked_names.index(key)]=value
        else:
            ## track a key we haven't tracked yet,
            ##  filter and colormap flags will be set to True by default.
            self.trackArray(key,value)
        
    def __init__(
        self,
        UIname,
        coordinates,
        tracked_arrays=None,
        tracked_names=None,
        tracked_filter_flags=None,
        tracked_colormap_flags=None,
        decimation_factor=1,
        filenames_and_nparts=None,
        attached_settings=None,
        doSPHrad=False,
        loud=True,
        **settings_kwargs):
        """Accepts pass-through kwargs for :class:`Firefly.data_reader.Settings` whether one is attached
            at initialization or not.

        :param UIname: Name of the particle group that shows up in the UI, 4-5 characters is best
            so that it doesn't spill out of the GUI.
        :type UIname: str 
        :param coordinates: The coordinates of the points in 3d space, should have a shape of `(nparts,3)`
        :type coordinates: np.ndarray
        :param tracked_arrays: The field data arrays to associate with each coordinate in space, each array
            should be one-dimensional and have `nparts` entries., defaults to None
        :type tracked_arrays: (nfields,nparts) np.ndarray, optional
        :param tracked_names: Should be the same length as `tracked_arrays`, and gives a
            name to each of the arrays when they show up in the UI dropdowns., defaults to None
        :type tracked_names: list of str with len = nfields, optional
        :param tracked_filter_flags: Should be the same length as `tracked_arrays`,
            and gives a flag for whether that array should be available as an
            interactive filter within the webapp, defaults to None
        :type tracked_filter_flags: list of bool with len = nfields, optional
        :param tracked_colormap_flags: Should be the same length as `tracked_arrays`,
            and gives a flag for whether that field should be 
            "colormappable" within the webapp, defaults to None
        :type tracked_colormap_flags: list of bool with len = nfields, optional
        :param decimation_factor: factor by which to reduce the data randomly 
                i.e. :code:`data=data[::decimation_factor]`, defaults to 1
        :type decimation_factor: int, optional
        :param filenames_and_nparts: Allows you to manually control how the particles
            are distributed among the sub-JSON files, it is
            **highly recommended that you leave this to** None such that particles are equally
            distributed among the :code:`.jsons` but if for whatever reason you need fine-tuning
            you should pass a list of tuples in the form 

            :code:`[("json_name0.json",nparts_this_file0),("json_name1.json",nparts_this_file1) ... ]`

            where where the sum of :code:`nparts_this_file%d` is exactly :code:`nparts`. These files
            will automatically be added to :code:`filenames.json` if you use
            an attached :class:`Firefly.data_reader.Reader` and 
            its :class:`~Firefly.data_reader.Reader.dumpToJSON` method, defaults to None
        :type filenames_and_nparts: list of tuple of (str,int), optional
        :param attached_settings: :class:`~Firefly.data_reader.Settings` instance that should be linked
            to this particle group such that GUI elements are connected correctly. If not provided here
            can be attached after-the-fact using the
            :func:`Firefly.data-reader.Settings.attachSettings` method, defaults to None
        :type attached_settings: :class:`Firefly.data_reader.Settings`, optional
        :param doSPHrad: flag to vary the opacity across a particle by a cubic spline 
            (as commonly done in SPH).
            Must then also provide :code:`SmoothingLength` as a tracked_array., defaults to False
            **EXPERIMENTAL FEATURE**
        :type doSPHrad: bool, optional
        :param loud: flag to print status information to the console, defaults to False
        :type loud: bool, optional
        :raises ValueError: if len(tracked_names) != len(tracked arrays)
        :raises ValueError: if a tracked_array has length other than len(coordinates)
        :raises ValueError: if filenames_and_nparts is not a list of tuples and strs
        :raises ValueError: if :code:`color` is passed as an option kwarg but the value is 
            not an RGBA iterable
        :raises KeyError: if passed an invalid option_kwarg
        """
        

        ## handle default values for iterables
        tracked_arrays = [] if tracked_arrays is None else tracked_arrays
        tracked_names = [] if tracked_names is None else tracked_names
        tracked_filter_flags = [] if tracked_filter_flags is None else tracked_filter_flags
        tracked_colormap_flags = [] if tracked_colormap_flags is None else tracked_colormap_flags

        ## bind input that will not be validated
        self.UIname = UIname
        self.decimation_factor = decimation_factor
        self.coordinates = np.array(coordinates)
        self.nparts = self.coordinates.shape[0]

        ## reduce the decimation factor if someone has asked to skip
        ##  too many particles for the given dataset so that a single particle
        ##  is shown.
        if self.decimation_factor > self.nparts:
            self.decimation_factor = max(1,self.nparts-1)

        ## allow users to pass in field data as a dictionary rather than a list
        ##  and use keys as field names
        if type(tracked_arrays) == dict:
            tracked_names = list(tracked_arrays.keys())
            tracked_arrays = [tracked_arrays[key] for key in tracked_names]

        ## check if each field is named
        if len(tracked_names) != len(tracked_arrays):
            raise ValueError("Make sure each tracked_array (%d) has a tracked_name (%d)"%(
                len(tracked_names),len(tracked_arrays)))

        ## check if each field is the right length
        for name,array in zip(tracked_names,tracked_arrays):
            if len(array) != self.nparts:
                raise ValueError("You passed me %s with %d entries but only %d coordinates"%(
                    name,len(array),self.nparts))
    
        ## check if each field was specified to be filterable
        if len(tracked_names) != len(tracked_filter_flags):
            if loud:
                print("Make sure each tracked_array (%d) has a tracked_filter_flag (%d), assuming True."%(
                    len(tracked_names),len(tracked_colormap_flags)))

            new_tracked_filter_flags = np.append(
                tracked_filter_flags,
                [True]*(len(tracked_names)-len(tracked_filter_flags)),axis=0
            )
            tracked_filter_flags = new_tracked_filter_flags

        ## check if each field was specified to be colormappable
        if len(tracked_names) != len(tracked_colormap_flags):
            if loud:
                print("Make sure each tracked_array (%d) has a tracked_colormap_flag (%d), assuming True."%(
                    len(tracked_names),len(tracked_colormap_flags)))

            new_tracked_colormap_flags = np.append(
                tracked_colormap_flags,
                [True]*(len(tracked_names)-len(tracked_colormap_flags)),axis=0
            )
            tracked_colormap_flags = new_tracked_colormap_flags

        ## bind validated input
        self.tracked_names = tracked_names
        self.tracked_arrays = tracked_arrays
        self.tracked_filter_flags = np.array(tracked_filter_flags)
        self.tracked_colormap_flags = np.array(tracked_colormap_flags)

        ## validate filenames and nparts if anyone was so foolhardy to
        ##  send it in themselves
        if filenames_and_nparts is not None:
            try:
                assert type(filenames_and_nparts[0]) == tuple
                assert type(filenames_and_nparts[0][0]) == str
                assert type(filenames_and_nparts[0][1]) == int
            except AssertionError:
                ValueError("filenames_and_nparts should be a list of tuples of strings and ints")

        self.filenames_and_nparts = filenames_and_nparts
        

        ## TODO how do these interface with javascript code?
        self.radiusFunction = None
        self.weightFunction = None

        ######### setup the settings for this particleGroup 

        ## start with the default
        self.settings_default = {
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
                self.settings_default['filterVals'][tracked_name] = None
                self.settings_default['filterLims'][tracked_name] = None

        ## setup default values for the initial color limits (vals/lims represent the interactive
        ##  "displayed" particles and the available boundaries for the limits)
        for tracked_name,tracked_colormap_flag in zip(self.tracked_names,self.tracked_colormap_flags):
            if tracked_colormap_flag:
                self.settings_default['colormapVals'][tracked_name] = None
                self.settings_default['colormapLims'][tracked_name] = None
        
        ## now let the user overwrite the defaults if they'd like (e.g. the color, likely
        ##  the most popular thing users will like to do)
        for settings_kwarg in settings_kwargs:
            if settings_kwarg in self.settings_default.keys():
                if settings_kwarg == 'color':
                    color = settings_kwargs['color']
                    if len(color) != 4:
                        ## if passed an RGB color
                        if len(color) == 3:
                            ## assume alpha value of 1
                            settings_kwarg['color'] = np.append(color,[1],axis=0)
                        else:
                            raise ValueError("Make sure you pass the color as an RGB(A) array")
                        
                self.settings_default[settings_kwarg] = settings_kwargs[settings_kwarg]
            else:
                raise KeyError("Invalid settings kwarg %s"%settings_kwarg)

        self.attached_settings = attached_settings
        self.doSPHrad = doSPHrad
        
    def trackArray(
        self,
        field_name,
        arr,
        filter_flag=True,
        colormap_flag=True,
        filterLims=None,
        filterVals=None,
        colormapLims=None,
        colormapVals=None):
        """Adds an additional data field to the ParticleGroup's tracked fields arrays.

        :param field_name: name to show in the GUI for this field
        :type field_name: str
        :param arr: data array for this field, should be self.nparts long
        :type arr: np.ndarray
        :param filter_flag: flag to make field filterable in the GUI, defaults to True
        :type filter_flag: bool, optional
        :param colormap_flag: flag to make field colormappable in the GUI, defaults to True
        :type colormap_flag: bool, optional
        :param filterLims: initial [min, max] limits to the filters. 
            defaults to None and is set in the web app to [min, max] of the field
        :type filterLims: list of float, optional
        :param filterVals: initial location of the filter slider handles.
            defaults to None and is set in the web app to [min, max] of the field
        :type filterVals: list of float, optional
        :param colormapLims: initial [min, max] limits to the colormaps. 
            defaults to None and is set in the web app to [min, max] of the field
        :type colormapLims: list of float, optional
        :param colormapVals: initial location of the colormap slider handles.
            defaults to None and is set in the web app to [min, max] of the field
        :type colormapVals: list of float, optional
        :raises ValueError: if the length of the field array is not self.nparts
        """
        
        ## check that it's the correct length
        if self.nparts != len(arr):
            raise ValueError("You passed me %s with %d entries but only %d coordinates"%(
                field_name,len(arr),self.nparts))

        ## go ahead and put it in the tracked arrays
        self.tracked_names = np.append(
            self.tracked_names,
            [field_name],axis=0)
        self.tracked_arrays= np.append(
            self.tracked_arrays,
            [arr],axis=0)
        self.tracked_filter_flags = np.append(
            self.tracked_filter_flags,
            [filter_flag],axis=0)
        self.tracked_colormap_flags = np.append(
            self.tracked_colormap_flags,
            [colormap_flag],axis=0)

        ## update the default settings with this array's filterVals/Lims
        if filter_flag: 
            self.settings_default['filterLims'][field_name] = filterLims
            self.settings_default['filterVals'][field_name] = filterVals 

        ## update the default settings with this array's colormapVals/Lims
        if colormap_flag: 
            self.settings_default['colormapLims'][field_name] = colormapLims
            self.settings_default['colormapVals'][field_name] = colormapVals

        ## update the attached settings if they're already there
        if self.attached_settings is not None:
            self.attached_settings['filterLims'][self.UIname][field_name] = filterLims
            self.attached_settings['filterVals'][self.UIname][field_name] = filterVals

            self.attached_settings['colormapLims'][self.UIname][field_name] = colormapLims
            self.attached_settings['colormapVals'][self.UIname][field_name] = colormapVals

    def getDecimationIndexArray(self):
        """
        Creates a numpy index array to handle decimation (sub-sampling) of your
        data. Chooses nparts/decimation_factor many particles randomly without
        replacement. Binds it to self.dec_inds.
        :return: dec_inds, indices corresponding to randomly chosen particles
        :rtype: np.ndarray
        """
        
        if self.decimation_factor > 1 and self.nparts > self.decimation_factor:
            ## we've been instructed to decimate and it makes sense to do so
            ##  (decimation factor is not > self.nparts)
            self.dec_inds = np.random.choice(
                np.arange(self.nparts),int(self.nparts/self.decimation_factor),
                replace=False)
        else:
            ## use a dummy boolean mask full of True instead
            self.dec_inds = np.ones(self.nparts,dtype=bool)

        return self.dec_inds

    def outputToDict(
        self,
        dec_inds=None,
        store_extra_keys=False,
        loud=False):
        """Outputs a subset of this ParticleGroup instance's 
            data to a dictionary. The subset is determined by the 
            :code:`dec_inds` input which should be an array of indices
            matching the tracked field arrays. 

        :param dec_inds: the decimation indices to 
                use, defining a subset of the :class:`~Firefly.data_reader.ParticleGroup` data to 
                output, defaults to np.arange(self.nparts)
        :type dec_inds: np.ndarray, optional
        :param store_extra_keys: flag to store filter and colormap flags, defaults to True
        :type store_extra_keys: bool, optional
        :param loud: flag to print status information to the console, defaults to False
        :type loud: bool, optional
        :return: outDict of particle data
        :rtype: dict
        """
        
        ## initialize the output dictionary
        outDict = dict()

        ## initialize a default set of dec inds if none are passed
        if dec_inds is None:
            dec_inds = np.arange(self.nparts)
        
        ## save the coordinates as a special case since they 
        ##  aren't in the tracked array
        outDict['Coordinates'] = self.coordinates[dec_inds]

        ## store the field arrays
        for tracked_name,tracked_arr in zip(
            self.tracked_names,
            self.tracked_arrays):

            outDict[tracked_name]=tracked_arr[dec_inds]

        ## if this is the first file, let's also include the colormap
        ##  and filter keys
        if store_extra_keys:
            if loud: print(
                self.tracked_names,
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
        short_data_path,
        hard_data_path,
        JSON_prefix='',
        loud=True,
        nparts_per_file=10**4,
        clean_JSONdir=False,
        write_jsons_to_disk=True,
        not_reader=True):
        """Outputs this ParticleGroup instance's data to JSON format, splitting it up into 
            multiple sub-JSON files. Best used when coupled with a :class:`Firefly.data_reader.Reader`'s
            :func:`~Firefly.data_reader.Reader.dumpToJSON` method.

        :param short_data_path: the sub-directory you want to put these files into
        :type short_data_path: str
        :param hard_data_path: the path to the directory containing different datasets'
            JSON sub-directories (often :code:`/path/toFirefly/static/data`)
        :type hard_data_path: str
        :param JSON_prefix: Prefix for any :code:`.json` files created, :code:`.json` files will be of the format:
            :code:`<JSON_prefix><parttype>_%d.json`, defaults to ''
        :type JSON_prefix: str, optional
        :param loud: flag to print status information to the console, defaults to True
        :type loud: bool, optional
        :param max_npart_per_file: the maximum number of particles saved per :code:`.json` file,
            don't use too large a number or you will have trouble loading
            the individual files in., defaults to 10**4
        :type max_npart_per_file: int, optional
        :param clean_JSONdir: flag to delete all :code:`.json` files in
            the :code:`JSONdir`. Strictly not necessary (since :code:`filenames.json` 
            will be updated) but it is good to clean up after yourself., defaults to False
        :type clean_JSONdir: bool, optional
        :param write_jsons_to_disk: flag that controls whether data is saved to disk (:code:`True`)
            or only converted to a string and returned (:code:`False`), defaults to True
        :type write_jsons_to_disk: bool, optional
        :param not_reader: flag for whether to print the Reader :code:`filenames.json` warning, defaults to True
        :type write_jsons_to_disk: bool, optional
        :return: filename, JSON_array (either a list full of filenames if
            written to disk or a list of JSON strs)
        :rtype: str, list of str
        """

        ## shuffle particles and decimate as necessary, save the output in dec_inds
        self.getDecimationIndexArray()

        ## where are we saving this json to?
        full_path = os.path.join(hard_data_path, short_data_path)

        if not os.path.isdir(full_path):
            os.makedirs(full_path)
        if loud and not_reader:
            print("You will need to add the sub-filenames to"+
                " filenames.json if this was not called by a Reader instance.")
            print("Writing:",self,"JSON to %s"%full_path)

        ## do we want to delete any existing jsons here?
        if clean_JSONdir:
            print("Removing old JSON files from %s"%full_path)
            for fname in os.listdir(full_path):
                if "json" in fname:
                    os.remove(os.path.join(full_path,fname))

        filenames_and_nparts = self.filenames_and_nparts
        ## if the user did not specify how we should partition the data between
        ##  sub-JSON files then we'll just do it equally
        if filenames_and_nparts is None:
            ## determine if we were passed a boolean mask or a index array
            if self.dec_inds.dtype == bool:
                nparts = np.sum(self.dec_inds)
                self.dec_inds = np.argwhere(self.dec_inds) ## convert to an index array
            else:
                nparts = self.dec_inds.shape[0]

            ## how many sub-files are we going to need?
            nfiles = int(nparts/nparts_per_file + ((nparts%nparts_per_file)!=0))

            ## how many particles will each file have and what are they named?
            filenames = [os.path.join(short_data_path,"%s%s%03d.json"%(JSON_prefix,self.UIname,i_file)) for i_file in range(nfiles)]
            nparts = [min(nparts_per_file,nparts-(i_file)*(nparts_per_file)) for i_file in range(nfiles)]

            filenames_and_nparts = list(zip(filenames,nparts))
        
        JSON_array = []
        ## loop through the sub-files
        cur_index = 0
        for i_file,(fname,nparts_this_file) in enumerate(filenames_and_nparts):
            ## pick out the indices for this file
            if self.decimation_factor > 1:
                these_dec_inds = self.dec_inds[cur_index:cur_index+nparts_this_file]
            else:
                ## create a dummy index array that takes everything
                these_dec_inds = np.arange(cur_index,cur_index+nparts_this_file)
        
            ## format an output dictionary
            outDict = self.outputToDict(
                these_dec_inds,
                i_file==0)

            fname = os.path.join(hard_data_path,fname)

            JSON_array += [(
                fname,
                write_to_json(outDict,
                    fname if write_jsons_to_disk else None))] ## path=None -> returns a string

            ## move onto the next file
            cur_index += nparts_this_file
        
        return JSON_array,filenames_and_nparts
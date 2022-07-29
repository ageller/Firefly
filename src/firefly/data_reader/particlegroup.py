import numpy as np

from matplotlib.colors import hex2color

import os 

from .json_utils import write_to_json,load_from_json
from .binary_writer import BinaryWriter

from .octree import Octree, init_octree_root_node

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
            np.ceil(self.nparts/self.decimation_factor),self.nparts,len(self.field_names))
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

        elif key in self.field_names:
            return self.field_arrays[self.field_names.index(key)]
        else:
            raise KeyError("%s is not a field array"%key)
    
    def __setitem__(self,key,value):
        """Implementation of builtin function __setitem__ to replace
            field data or track new fields. Filter flag and colormap flags
            will be set to true, call :func:`firefly.data_reader.ParticleGroup.trackArray`
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
        elif key in self.field_names:
            ## replace a field array
            self.field_arrays[self.field_names.index(key)]=value
        else:
            ## track a key we haven't tracked yet,
            ##  filter and colormap flags will be set to True by default.
            self.trackArray(key,value)
        
    def __init__(
        self,
        UIname,
        coordinates,
        velocities=None,
        rgba_colors=None,
        field_arrays=None,
        field_names=None,
        field_filter_flags=None,
        field_colormap_flags=None,
        field_radius_flags=None,
        decimation_factor=1,
        attached_settings=None,
        loud=True,
        **settings_kwargs):
        """Accepts pass-through kwargs for :class:`firefly.data_reader.Settings` whether one is attached
            at initialization or not.

        :param UIname: Name of the particle group that shows up in the UI, 4-5 characters is best
            so that it doesn't spill out of the GUI.
        :type UIname: str 
        :param coordinates: The coordinates of the points in 3d space, should have a shape of `(nparts,3)`
        :type coordinates: np.ndarray
        :param velocities: The velocities associated with each coordinate, should have a shape of `(nparts,3)`
            allows vectors to be plotted at the coordinate location
        :type velocities: np.ndarray
        :param rgba_colors: The RGBA tuples associated with each coordinate, should have a shape of `(nparts,4)`
        :type rgba_colors: np.ndarray
        :param field_arrays: The field data arrays to associate with each coordinate in space, each array
            should be one-dimensional and have `nparts` entries., defaults to None
        :type field_arrays: (nfields,nparts) np.ndarray, optional
        :param field_names: Should be the same length as `field_arrays`, and gives a
            name to each of the arrays when they show up in the UI dropdowns., defaults to None
        :type field_names: list of str with len = nfields, optional
        :param field_filter_flags: Should be the same length as `field_arrays`,
            and gives a flag for whether that array should be available as an
            interactive filter within the webapp, defaults to None
        :type field_filter_flags: list of bool with len = nfields, optional
        :param field_colormap_flags: Should be the same length as `field_arrays`,
            and gives a flag for whether that field should be 
            "colormappable" within the webapp, defaults to None
        :type field_colormap_flags: list of bool with len = nfields, optional
        :param field_radius_flags: Should be the same length as `field_arrays`,
            and gives a flag for whether that field should be allowed to scale
            particle radii within the webapp, defaults to None
        :type field_radius_flags: list of bool with len = nfields, optional
        :param decimation_factor: factor by which to reduce the data randomly 
                i.e. :code:`data=data[::decimation_factor]`, defaults to 1
        :type decimation_factor: int, optional
        :param attached_settings: :class:`~firefly.data_reader.Settings` instance that should be linked
            to this particle group such that GUI elements are connected correctly. If not provided here
            can be attached after-the-fact using the
            :func:`firefly.data-reader.Settings.attachSettings` method, defaults to None
        :type attached_settings: :class:`firefly.data_reader.Settings`, optional
        :param loud: flag to print status information to the console, defaults to False
        :type loud: bool, optional
        :raises ValueError: if len(field_names) != len(field arrays)
        :raises ValueError: if a field_array has length other than len(coordinates)
        :raises ValueError: if :code:`color` is passed as an option kwarg but the value is 
            not an RGBA iterable
        :raises KeyError: if passed an invalid option_kwarg
        """
        
        ## this will be overwritten if we call the self.createOctree method
        self.octree: Octree = None

        ## handle default values for iterables
        field_filter_flags = [] if field_filter_flags is None else field_filter_flags
        field_colormap_flags = [] if field_colormap_flags is None else field_colormap_flags
        field_radius_flags = [] if field_radius_flags is None else field_radius_flags

        ## bind input that will not be validated
        self.UIname = UIname
        self.decimation_factor = decimation_factor
        self.coordinates = np.array(coordinates)
        self.velocities = np.array(velocities) if velocities is not None else None
        self.rgba_colors = np.array(rgba_colors) if rgba_colors is not None else None
        self.nparts = self.coordinates.shape[0]
        field_arrays = np.empty((0,self.coordinates.shape[0])) if field_arrays is None else field_arrays

        ## reduce the decimation factor if someone has asked to skip
        ##  too many particles for the given dataset so that a single particle
        ##  is shown.
        if self.decimation_factor > self.nparts:
            self.decimation_factor = max(1,self.nparts-1)

        ## allow users to pass in field data as a dictionary rather than a list
        ##  and use keys as field names
        if type(field_arrays) == dict:
            if field_names is None: 
                field_names = list(field_arrays.keys())
                print('filter/colormap/radius flags correspond to:',field_names)
            field_arrays = [field_arrays[key] for key in field_names]
        else: field_names = [] if field_names is None else field_names

        ## check if each field is named
        if (len(field_names) != len(field_arrays)) and np.size(field_arrays) > 0:
            raise ValueError("Make sure each field_array (%d) has a field_name (%d)"%(
                len(field_arrays),len(field_names)))

        ## check if each field is the right length
        for name,array in zip(field_names,field_arrays):
            if len(array) != self.nparts:
                raise ValueError("You passed me %s with %d entries but only %d coordinates"%(
                    name,len(array),self.nparts))
    
        ## check if each field was specified to be filterable
        if len(field_names) != len(field_filter_flags):
            if loud:
                print("Make sure each field_array (%d) has a field_filter_flag (%d), assuming True."%(
                    len(field_names),len(field_colormap_flags)))

            new_field_filter_flags = np.append(
                field_filter_flags,
                [True]*(len(field_names)-len(field_filter_flags)),axis=0
            )
            field_filter_flags = new_field_filter_flags

        ## check if each field was specified to be colormappable
        if len(field_names) != len(field_colormap_flags):
            if loud:
                print("Make sure each field_array (%d) has a field_colormap_flag (%d), assuming True."%(
                    len(field_names),len(field_colormap_flags)))

            new_field_colormap_flags = np.append(
                field_colormap_flags,
                [True]*(len(field_names)-len(field_colormap_flags)),axis=0
            )
            field_colormap_flags = new_field_colormap_flags

        ## check if each field was specified whether to be allowed to scale radius
        if len(field_names) != len(field_radius_flags):
            if loud:
                print("Make sure each field_array (%d) has a field_radius_flag (%d), assuming False."%(
                    len(field_names),len(field_radius_flags)))

            new_field_radius_flags = np.append(
                field_radius_flags,
                [False]*(len(field_names)-len(field_radius_flags)),axis=0
            )
            field_radius_flags = new_field_radius_flags

        ## bind validated input
        self.field_names = field_names
        self.field_arrays = field_arrays
        self.field_filter_flags = np.array(field_filter_flags)
        self.field_colormap_flags = np.array(field_colormap_flags)
        self.field_radius_flags = np.array(field_radius_flags)

        ## TODO how do these interface with javascript code?
        self.radiusFunction = None
        self.weightFunction = None

        ######### setup the settings for this particleGroup 

        ## start with the default
        self.settings_default = {
            'color': np.append(np.random.random(3),[1]),
            'sizeMult':.1,
            'showParts':True,
            'filterVals':dict(),
            'filterLims':dict(),
            'invertFilter':dict(),
            'colormapVals':dict(),
            'colormapLims':dict(),
            'colormap':1./64,
            'colormapVariable':None, ## use default set in javascript
            'showColormap':None, ## use default set in javascript
            'showVel':None, ## use default set in javascript
            'velVectorWidth':None, ## use default set in javascript
            'velGradient':None, ## use default set in javascript
            'plotNmax':None, ## use default set in javascript
            'velType':None, ## use default set in javascript
            'animateVel':None, ## use default set in javascript
            'animateVelDt':None, ## use default set in javascript
            'animateVelTmax':None, ## use default set in javascript
            'radiusVariable':0, 
            'GUIExcludeList':None
        }
        
        ## setup default values for the initial filter limits (vals/lims represent the interactive
        ##  "displayed" particles and the available boundaries for the limits)
        for field_name,field_filter_flag in zip(self.field_names,self.field_filter_flags):
            if field_filter_flag:
                self.settings_default['filterVals'][field_name] = None
                self.settings_default['filterLims'][field_name] = None

        ## setup default values for the initial color limits (vals/lims represent the interactive
        ##  "displayed" particles and the available boundaries for the limits)
        for field_name,field_colormap_flag in zip(self.field_names,self.field_colormap_flags):
            if field_colormap_flag:
                self.settings_default['colormapVals'][field_name] = None
                self.settings_default['colormapLims'][field_name] = None
        
        ## now let the user overwrite the defaults if they'd like (e.g. the color, likely
        ##  the most popular thing users will like to do)
        for settings_kwarg in settings_kwargs:
            if settings_kwarg in self.settings_default.keys():
                if settings_kwarg == 'color':
                    color = settings_kwargs['color']
                    if type(color) == str: color = list(hex2color(color))
                    if len(color) != 4:
                        ## passed an RGB color, assume alpha value of 1
                        if len(color) == 3: color = np.append(color,[1],axis=0)
                        else: raise ValueError(
                            "Make sure you pass the color as an RGB(A) array")
                    settings_kwargs['color'] = color
                        
                self.settings_default[settings_kwarg] = settings_kwargs[settings_kwarg]
            else:
                raise KeyError("Invalid settings kwarg %s"%settings_kwarg)

        self.attached_settings = attached_settings

        ## add magnitude of velocity to fields
        if self.velocities is not None:
            self.trackArray('Velocity',np.linalg.norm(self.velocities,axis=1),radius_flag=False)
        
    def trackArray(
        self,
        field_name,
        arr,
        filter_flag=True,
        colormap_flag=True,
        radius_flag=False,
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
        :param radius_flag: flag to allow field to be used as a radius scale in the GUI, defaults to True
        :type radius_flag: bool, optional
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

        ## go ahead and put it in the field arrays
        self.field_names = np.append(
            self.field_names,
            [field_name],axis=0)
        self.field_arrays= np.append(
            self.field_arrays,
            [arr],axis=0)
        self.field_filter_flags = np.append(
            self.field_filter_flags,
            [filter_flag],axis=0)
        self.field_colormap_flags = np.append(
            self.field_colormap_flags,
            [colormap_flag],axis=0)
        self.field_radius_flags = np.append(
            self.field_radius_flags,
            [radius_flag],axis=0)

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
                use, defining a subset of the :class:`~firefly.data_reader.ParticleGroup` data to 
                output, defaults to np.arange(self.nparts)
        :type dec_inds: np.ndarray, optional
        :param store_extra_keys: flag to store filter, colormap, and radius flags defaults to True
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
        ##  aren't in the field array
        outDict['Coordinates_flat'] = self.coordinates[dec_inds].flatten()

        if self.velocities is not None:
            outDict['Velocities_flat'] = self.velocities[dec_inds].flatten()

        if self.rgba_colors is not None:
            outDict['rgbaColors_flat'] = self.rgba_colors[dec_inds].flatten()

        ## store the field arrays
        for field_name,field_arr in zip(
            self.field_names,
            self.field_arrays):

            outDict[field_name]=field_arr[dec_inds]

        ## if this is the first file, let's also include the colormap
        ##  and filter keys
        if store_extra_keys:
            if loud: print(
                self.field_names,
                'filter:',self.field_filter_flags,
                'colormap:',self.field_colormap_flags,
                'radius:',self.field_radius_flags)

            outDict['filterKeys'] = np.array(self.field_names)[np.array(
                 self.field_filter_flags,dtype=bool)]

            outDict['colormapKeys'] = np.array(self.field_names)[np.array(
                self.field_colormap_flags,dtype=bool)]

            outDict['radiusKeys'] = np.array(self.field_names)[np.array(
                self.field_radius_flags,dtype=bool)]

        return outDict
    
    def spawn_octree_pg(self,datadir:str,max_npart_per_node:int,**kwargs):
        """ Creates a new :class:`firefly.data_reader.particlegroup.OctreeParticleGroup` instance
            that references the data contained by the :class:`firefly.data_reader.particlegroup.ParticleGroup`
            instance that calls this method.

        :param datadir: directory to output ``self.UIname/octree.json`` (and corresponding files) to.
        :type datadir: str
        :param max_npart_per_node: maximum number of particles a node can contain before it should be refined.
        :type max_npart_per_node: int
        :return: octree_pg
        :rtype: :class:`~firefly.data_reader.particlegroup.OctreeParticleGroup`
        """

        ## create a directory for this particle group to store the octree data in
        pathh = os.path.join(datadir,self.UIname)
        if not os.path.isdir(pathh): os.makedirs(pathh)

        ## decimate if necessary
        self.getDecimationIndexArray()

        dictionary = {
            'x':self.coordinates[:,0][self.dec_inds],
            'y':self.coordinates[:,1][self.dec_inds],
            'z':self.coordinates[:,2][self.dec_inds],
        }

        if self.velocities is not None:
            dictionary.update({
                'vx':self.velocities[:,0][self.dec_inds],
                'vy':self.velocities[:,1][self.dec_inds],
                'vz':self.velocities[:,2][self.dec_inds]
            })

        if self.rgba_colors is not None:
            dictionary.update({
                'rgba_r':self.rgba_colors[:,0][self.dec_inds],
                'rgba_g':self.rgba_colors[:,1][self.dec_inds],
                'rgba_b':self.rgba_colors[:,2][self.dec_inds],
                'rgba_a':self.rgba_colors[:,3][self.dec_inds]
            })
        
        if len(self.field_names) > 0: dictionary.update(zip(self.field_names,self.field_arrays[...,self.dec_inds]))

        ## saves relevant data to disk in the correct .ffraw format at pathh
        init_octree_root_node(dictionary,pathh)

        ## create the new particle group instance
        octree_pg = OctreeParticleGroup(self.UIname,pathh,max_npart_per_node,**kwargs)

        return octree_pg

    def writeToDisk(
        self,
        target_directory,
        file_prefix='',
        file_extension='.ffly',
        loud=True,
        max_npart_per_file=10**5,
        clean_datadir=False,
        not_reader=True,
        write_to_disk=True):
        """Outputs this ParticleGroup instance's data to a compatible Firefly format,
            either `.ffly` or `.json`. Data is partitioned into 
            multiple sub-files. This is best used when coupled with a :class:`firefly.data_reader.Reader`'s
            :func:`~firefly.data_reader.Reader.writeToDisk` method.

        :param target_directory: the path to the directory where data should be saved
        :type target_directory: str
        :param file_extension: File extension for data files created, one of `.ffly` (binary)
            or `.json` (ASCII).
        :type file_extension: str, optional
        :param file_prefix: Prefix for any files created, filenames will look like:
            `f"{file_prefix}{self.UIname}{i_file:03d}{file_extension}"` 
        :type file_prefix: str, optional
        :param loud: flag to print status information to the console, defaults to True
        :type loud: bool, optional
        :param max_npart_per_file: the maximum number of particles saved per :code:`.json` file,
            don't use too large a number or you will have trouble loading
            the individual files in., defaults to 10**4
        :type max_npart_per_file: int, optional
        :param clean_datadir: flag to delete all :code:`.json` files in
            the :code:`JSONdir`. Strictly not necessary (since :code:`filenames.json` 
            will be updated) but it is good to clean up after yourself., defaults to False
        :type clean_datadir: bool, optional
        :param write_to_disk: flag that controls whether data is saved to disk (:code:`True`)
            or only converted to a string and returned (:code:`False`), defaults to True
        :type write_to_disk: bool, optional
        :param not_reader: flag for whether to print the Reader :code:`filenames.json` warning, defaults to True
        :type not_reader: bool, optional
        :return: filename, file_list (either a list full of filenames if
            written to disk or a list of JSON strs)
        :rtype: str, list of str
        """

        ## prepend a . if there isn't one in the string
        if '.' not in file_extension: file_extension='.'+file_extension
        
        extensions = ['.json','.ffly']
        if file_extension not in extensions: raise ValueError(
            f"Invalid extension {file_extension} must be one of {extensions}")
        
        ## can't pass raw binary data to the app while it's running (yet?)
        if not write_to_disk: file_extension = '.json'

        ## where are we saving this json to?

        if not os.path.isdir(target_directory): os.makedirs(target_directory)

        if loud and not_reader:
            print("You will need to add the sub-filenames to"+
                " filenames.json if this was not called by a Reader instance.")
            print("Writing:",self,"files to %s"%target_directory)

        ## do we want to delete any existing files here?
        if clean_datadir:
            #print("Removing old ffly files from %s"%target_directory)
            for fname in os.listdir(target_directory):
                if (".ffly" in fname or
                    ".json" in fname or 
                    ".fftree" in fname):
                    os.remove(os.path.join(target_directory,fname))

        ## shuffle particles and decimate as necessary, save the output in dec_inds
        self.getDecimationIndexArray()

        ## determine if we were passed a boolean mask or a index array
        if self.dec_inds.dtype == bool:
            nparts = np.sum(self.dec_inds)
            self.dec_inds = np.argwhere(self.dec_inds) ## convert to an index array
        else: nparts = self.dec_inds.shape[0]

        ## how many sub-files are we going to need?
        nfiles = int(nparts/max_npart_per_file + ((nparts%max_npart_per_file)!=0))

        ## how many particles will each file have and what are they named?
        filenames = [
            os.path.join(
                os.path.basename(target_directory),
                f"{file_prefix}{self.UIname}{i_file:03d}{file_extension}") 
                for i_file in range(nfiles)]
        nparts = [min(max_npart_per_file,nparts-(i_file)*(max_npart_per_file)) for i_file in range(nfiles)]

        filenames_and_nparts = list(zip(filenames,nparts))
        
        file_list = []
        ## loop through the sub-files
        cur_index = 0

        for i_file,(fname,nparts_this_file) in enumerate(filenames_and_nparts):
            nparts_this_file=np.ceil(nparts_this_file).astype(int)

            abs_fname = os.path.join(os.path.dirname(target_directory),fname)
            ## pick out the indices for this file
            if self.decimation_factor > 1:
                these_dec_inds = self.dec_inds[cur_index:cur_index+nparts_this_file]
            else:
                ## create a dummy index array that takes everything
                these_dec_inds = np.arange(cur_index,cur_index+nparts_this_file,dtype=int)
        
            if file_extension=='.ffly':
                ## prepare writer class
                binary_writer = BinaryWriter(
                    abs_fname,
                    self.coordinates[these_dec_inds],
                    self.velocities[these_dec_inds] if self.velocities is not None else None,
                    self.rgba_colors[these_dec_inds] if self.rgba_colors is not None else None)

                ## fill necessary attributes
                binary_writer.nfields = len(self.field_names)
                binary_writer.field_names = self.field_names
                if len(self.field_names): binary_writer.fields = np.array(self.field_arrays)[:,these_dec_inds]
                else: binary_writer.fields = []
                binary_writer.filter_flags = self.field_filter_flags
                binary_writer.colormap_flags = self.field_colormap_flags
                binary_writer.radius_flags = self.field_radius_flags

                file_list += [(
                    ## need to replace w/ relative path from static/data
                    ##  in reader
                    abs_fname,
                    binary_writer.write())] 
            elif file_extension == '.json': 
                ## format an output dictionary
                outDict = self.outputToDict(
                    these_dec_inds,
                    i_file==0)

                file_list += [
                    (abs_fname,
                    write_to_json(outDict,
                        abs_fname if write_to_disk else None))]
            # else: <-- unnecessary b.c. we do validation above

            ## move onto the next file
            cur_index += nparts_this_file
        
        return file_list,filenames_and_nparts

## Octree's methods will be called before ParticleGroup's
class OctreeParticleGroup(Octree,ParticleGroup):

    def __init__(
        self,
        UIname,
        pathh,
        min_to_refine=1e6,
        build=False,
        **kwargs):

        ## initialize the octree portion of the OctreeParticleGroup
        Octree.__init__(self,UIname,pathh,min_to_refine)
        
        if build: self.build(**kwargs)
    
    def build(self,
        nthreads=1,
        nrecurse=0,
        use_mps=True,
        loud=True,
        **kwargs):

        ## do the actual work of building the octree,
        ##  might take a while...
        self.full_refine(nthreads,nrecurse,use_mps,loud=loud)

        ## unpack the center coordinates and field values
        (coordinates,
            velocities,
            rgba_colors,
            field_arrays) = self.unpack_tree_nodes()

        ## initialize the particlegroup portion of the OctreeParticleGroup
        ParticleGroup.__init__(
            self,
            self.UIname,
            coordinates,
            velocities,
            rgba_colors,
            field_arrays,
            field_names=self.root['field_names'],
            loud=loud,
            **kwargs)
 
    def unpack_tree_nodes(self):

        nodes = self.root['nodes']
        field_names = self.root['field_names']

        numnodes = len(nodes.keys())

        coordinates = np.empty((numnodes,3))

        if self.root['has_velocities']: 
            velocities = np.empty((numnodes,3))
        else: velocities = None

        if self.root['has_colors']: 
            rgba_colors = np.empty((numnodes,4))
        else: rgba_colors = None
        fields = np.empty((len(field_names),numnodes))

        for inode,node_dict in enumerate(nodes.values()):
            coordinates[inode,:] = node_dict['center_of_mass']
            if velocities is not None: velocities[inode,:] = node_dict['com_velocity']
            if rgba_colors is not None: rgba_colors[inode,:] = node_dict['rgba_color']
            for ifield,field_name in enumerate(field_names):
                fields[ifield,inode] = node_dict[field_name]
            node_dict['node_index'] = inode

        return coordinates,velocities,rgba_colors,fields

    def writeToDisk(
        self,
        target_directory,
        file_prefix='',
        octree_format='.fftree',
        nthreads=1,
        **kwargs):

        octree_formats = ['.fftree','.ffraw']

        if '.' not in octree_format: octree_format = '.' + octree_format

        if octree_format not in octree_formats: raise ValueError(
            f"Invalid extension {octree_format} must be one of {octree_formats}")

        ## call super to write "normal" particle data
        file_list,filenames_and_nparts = super().writeToDisk(
            target_directory,
            file_prefix=file_prefix,
            file_extension='.json',
            **kwargs)

        ## need to convert from .ffraw to .fftree, save .fftree files in target_directory
        if octree_format == '.fftree': self.convert_ffraw_to_fftree(
            os.path.join(target_directory,self.UIname+'fftree'),
            f"{file_prefix}{self.UIname}%04d.fftree",
            nthreads=nthreads) 
        elif octree_format == '.ffraw': raise NotImplementedError(
            "Javascript can't read .ffraw yet... must convert to .fftree")

        ## load the first .json particle file for the centers
        ##  and append the octree metadata 
        data_dict = load_from_json(file_list[0][0])
        
        for key,value in self.root.items(): 
            if key == 'nodes': key = 'octree'
            data_dict[key] = value
        data_dict['prefixes'] = self.prefixes

        ## change absolute paths to relative paths
        if octree_format == 'ffraw':
            for node_dict in data_dict['octree'].values():
                if 'files' in node_dict:
                    for i,ftuple in enumerate(node_dict['files']):
                        relative_fname = os.path.join(*ftuple[0].split(os.path.sep)[-3:])
                        new_name =relative_fname.split('-')
                        new_name = '-'.join(new_name[:-1]) +'-<prefix>.'+'.'.join(new_name[-1].split('.')[-2:])
                        node_dict['files'][i] = (
                            new_name,
                            ftuple[1],
                            ftuple[2])
                    node_dict['files'] = set(node_dict['files'])

        write_to_json(data_dict,file_list[0][0])

        return file_list,filenames_and_nparts
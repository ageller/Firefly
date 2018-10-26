import numpy as np
import pandas as pd
import copy
import h5py,os, shutil
from snapshot_utils import openSnapshot
import warnings

class Options(object):
    def __getitem__(self,key):
        attr = self.findWhichOptionsDict(key)
        return getattr(self,attr)[key]
        
    def __setitem__(self,key,value):
        attr = self.findWhichOptionsDict(key)
        ## set that dictonary's value
        getattr(self,attr)[key]=value

    def findWhichOptionsDict(self,key):
        for attr in self.__dict__.keys():
            if '_options' in attr:
                if key in getattr(self,attr).keys():
                    return attr
        raise KeyError("Invalid option key")
        
    def keys(self):
        this_keys = [] 
        for attr in self.__dict__.keys():
            if '_options' in attr:
                this_keys += list(getattr(self,attr).keys())
        return this_keys

    def __init__(self,
        options_filename = 'Options.json',
        **kwargs):

        ## where should this be saved if it's outputToJSON
        self.options_filename = options_filename

        self.window_options = {
            'title':'Firefly', #set the title of the webpage
			########################
			#this should not be modified
			'loaded':True, #used in the web app to check if the options have been read in
        }

        ## flags for enabling different elements of the UI
        self.UI_options = {
			########################
			#these settings are to turn on/off different bits of the user interface
			'UI':True, #do you want to show the UI?
            'UIfullscreen':True, #do you want to show the fullscreen button?
			'UIsnapshot':True, #do you want to show the snapshot button?
			'UIreset':True, #do you want to show the reset button?
			'UIsavePreset':True, #do you want to show the save preset button?
			'UIloadNewData':True, #do you want to show the load new data button?
			'UIcameraControls':True, #do you want to show the camera controls
			'UIdecimation':True, #do you want to show the decimation slider
			########################
        }

        ## flags that control how the UI for each particle group looks like
        self.particle_UI_options = {
			'UIparticle':dict(), #do you want to show the particles 
			#	in the user interface (default = True). This is a dict 
			#	with keys of the particle swapnames (as defined in self.names),
			#	 and is boolean.
			'UIdropdown':dict(), #do you want to enable the dropdown menus for 
			#	particles in the user interface (default = True).This is a 
			#	dict with keys of the particle UInames, 
			#	and is boolean.
			'UIcolorPicker':dict(), #do you want to allow the user to change 
			#	the color (default = True).This is a dict with keys of the 
			#	particle UInames, and is boolean.
        }
			
        ## options that will define the initial camera view
        self.startup_options = {
			#these settings affect how the data are displayed
			'center':np.zeros(3), #do you want to define the initial camera center 
			#	(if not, the WebGL app will calculate the center as the mean 
			#	of the coordinates of the first particle set loaded in) 
			#	(should be an np.array of length 3: x,y,z)
			'camera':None, #initial camera location, NOTE: the magnitude must 
			#	be >0 (should be an np.array of length 3: x,y,z)
			'cameraRotation':None, #can set camera rotation if you want 
			#	(should be an np.array of length 3: xrot, yrot, zrot, in radians)
			'maxVrange':2000., #maximum range in velocities to use in deciding 
			#	the length of the velocity vectors (making maxVrange 
			#	larger will enhance the difference between small and large velocities)
			'startFly':False, #start in Fly controls? (if False, then 
			#	start in the default Trackball controls)
			'friction':None, #set the initial friction for the controls (default is 0.1)
			'stereo':False, #start in stereo mode?
			'stereoSep':None, #camera (eye) separation in the stereo 
			#	mode (default is 0.06, should be < 1)
			'decimate':None, #set the initial decimation (e.g, 
			#	you could load in all the data by setting self.decimate to 
			#	1 above, but only display some fraction by setting 
			#	self.options.decimate > 1 here).  This is a single value (not a dict)
        }
        
        ## options that will define the initial values of the particle UI panes
        self.particle_startup_options = {
			'plotNmax':dict(), #maximum initial number of particles to plot 
			#	(can be used to decimate on a per particle basis).  This is 
			#	a dict with keys of the particle swapnames (as defined in self.names)
			'showVel':dict(), #start by showing the velocity vectors?  
			#	This is a dict with keys of the particle UInames
			#	, and is boolean
			'velType':dict(), #default type of velocity vectors to plot.  
			#	This is a dict with keys of the particle UInames, 
			#	and must be either 'line', 'arrow', or 'triangle'.  (default is 'line')
			'color':dict(), #set the default color, This is a dict with keys 
			#	of the particle UInames, must contain 
			#	4-element lists with rgba. (default is random colors with a = 1)
			'sizeMult':dict(), #set the default point size multiplier. This is a 
			#	dict with keys of the particle UInames,
			#	 default for all sizes is 1.
			'showParts':dict(), #show particles by default. This is a dict with 
			#	keys of the particle UInames, 
			#	boolean, default is true.
        }
        
        ## options that will define the initial values of the /filters/ in the particle UI panes
        ##  and consequently what particles are filtered at startup.
        self.particle_filter_options = {
			'filterVals':dict(), #initial filtering selection. This is a dict 
			#	with initial keys of the particle UInames, 
			#	then for each filter the [min, max] range 
			#	(e.g., 'filter':{'Gas':{'log10Density':[0,1],'magVelocities':[20, 100]}} )
			'filterLims':dict(), #initial [min, max] limits to the filters. 
			#	This is a dict with initial keys of the UInames 
			#	, then for each filter the [min, max] range 
			#	(e.g., 'filter':{'Gas':{'log10Density':[0,1],'magVelocities':[20, 100]}} )
		}

    def outputToJSON(
        self,
        datadir,prefix=''):
        all_options_dict = {}
        for attr in self.__dict__.keys():
            if '_options' in attr:
                all_options_dict.update(getattr(self,attr))

        pd.Series(all_options_dict).to_json(
            os.path.join(datadir,prefix+self.options_filename), orient='index')  

class ParticleGroup(object):

    def __init__(
        self,
        UIname,
        coordinates,
        tracked_names = [],
        tracked_arrays = [],
        decimation_factor = 1,
        tracked_filter_flags = [],
        filenames_and_nparts = None,
        **option_kwargs):
        
        ## assert statements and user-friendly error messages
        try:
            assert len(tracked_names) == len(tracked_arrays)
        except:
            raise ValueError("Make sure each tracked_array has a tracked_name")
    
        try: 
            assert len(tracked_names) == len(tracked_filter_flags)
        except:
            print(tracked_names,tracked_filter_flags)
            warnings.warn("Make sure each tracked_array has a tracked_filter_flag, assuming True.")
            new_tracked_filter_flags = np.append(
                tracked_filter_flags,
                [True]*(len(tracked_names)-len(tracked_filter_flags)),axis=0
            )
            print(tracked_filter_flags,"becomes ->",new_tracked_filter_flags)
            tracked_filter_flags = new_tracked_filter_flags
        
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
        self.coordinates = coordinates

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
        self.tracked_filter_flags = tracked_filter_flags

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
            'filterLims':dict()
        }
        
        ## setup default values for the initial filter limits (vals/lims represent the interactive
        ##  "displayed" particles and the available boundaries for the limits)
        for tracked_name,tracked_filter_flag in zip(self.tracked_names,self.tracked_filter_flags):
            if tracked_filter_flag:
                self.options_default['filterVals'][tracked_name] = None
                self.options_default['filterLims'][tracked_name] = None
        
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

        ## functions that should happen after initialization: 
        ##  get that decimation index array so when we write out we 
        ##  have it ready (but still be able to add stuff whenever)
        self.getDecimationIndexArray()
        
    def trackArray(self,name,arr,filter_flag=1):
        """Adds a new array to the particle group,
            compare with addToDict method of reader"""
        ## check that it's the correct length
        assert self.nparts == len(arr)

        ## go ahead and put it in the tracked arrays
        self.tracked_names = np.append(self.tracked_names,[name],axis=0)
        self.tracked_arrays = np.append(self.tracked_arrays,[arr],axis=0)
        self.tracked_filter_flags = np.append(self.tracked_filter_flags,[filter_flag])

        ## and add this to the filter limits arrays, see __init__ above
        if filter_flag: 
            self.options_default['filterVals'][name] = None
            self.options_default['filterLims'][name] = None

    def getDecimationIndexArray(self):
        if self.decimation_factor > 1:
            ## use an array of indices
            self.dec_inds = np.random.choice(
                np.arange(self.nparts),int(self.nparts/self.decimation_factor),
                replace=False)
        else:
            ## use a boolean mask instead
            self.dec_inds = np.ones(self.nparts,dtype=bool)

    def outputToJSON(
        self,
        path, ## sub-directory name
        path_prefix, ## absolute path to Firefly/data
        prefix, ## prefix of JSON filename
        loud=1,
        nparts_per_file = 10**4,
        clean=0):
        """loud will print warnings that you should hear if you're not using a
            reader that does these things for you"""
        if not os.path.isdir(path):
            os.makedirs(path)
        if loud:
            warnings.warn("You will need to add the sub-filenames to"+
                " filenames.json if this was not called by a Reader instance.")
            print("Writing:",self,"JSON to %s"%path)
        if clean:
            warnings.warn("Removing data files from %s"%path)
            for fname in os.listdir(path):
                if "prefix" in fname and "json" in fname:
                    os.remove(os.path.join(path,filee))

        if self.filenames_and_nparts is None:
            if self.dec_inds.dtype == bool:
                nparts = np.sum(self.dec_inds)
            else:
                nparts = self.dec_inds.shape[0]
            nfiles = int(nparts/nparts_per_file + ((nparts%nparts_per_file)!=0))
            filenames = [os.path.join(path,"%s%s%03d.json"%(prefix,self.UIname,i_file)) for i_file in range(nfiles)]
            nparts = [min(nparts_per_file,nparts-(i_file)*(nparts_per_file)) for i_file in range(nfiles)]
            self.filenames_and_nparts = zip(filenames,nparts)
        
        cur_index = 0
        for i_file,(fname,nparts_this_file) in enumerate(self.filenames_and_nparts):
            ## which particles to save?
            these_dec_inds = self.dec_inds[cur_index:cur_index+nparts_this_file]

            outDict = dict()
            outDict['Coordinates'] = self.coordinates[these_dec_inds]

            for tracked_name,tracked_arr in zip(self.tracked_names,self.tracked_arrays):
                outDict[tracked_name]=tracked_arr[these_dec_inds]

            cur_index+=nparts_this_file
            if i_file == 0:
                print(self.tracked_names,self.tracked_filter_flags)
                outDict['filterKeys'] = np.array(self.tracked_names)[np.array(self.tracked_filter_flags,dtype=bool)]

                ## TODO this needs to be changed, this is a flag for having the
                ##  opacity vary across a particle as the impact parameter projection
                ##  of cubic spline kernel
                outDict['doSPHrad'] = [0]

            pd.Series(outDict).to_json(os.path.join(path_prefix,fname), orient='index')

        return self.filenames_and_nparts

    def addToOptions(
        self,
        options):
        for key in [
            'UIparticle','UIdropdown','UIcolorPicker',
            'color','sizeMult','showParts',
            'filterVals','filterLims']:
            options[key][self.UIname]=self.options_default[key]

    def outputToHDF5(self):
        raise Exception("Unimplemented!")

    def __repr__(self):
        mystr = "Particle Group of %s\n"%(self.UIname)
        mystr += "Contains %d (%d after dec) particles and %d arrays\n"%(
            self.nparts,self.nparts/self.decimation_factor,len(self.tracked_names))
        return mystr

class Reader(object):
    def __init__(self,
        options=None,
        datadir=None, ## abs path, must be a sub-directory of Firefly/data
        write_startup = True,# True -> write | False -> leave alone | "append" -> adds to existing file
        max_npart_per_file = 10**4,
        prefix = 'Data',
        clean_datadir = 0,
        ):
        if options is not None:
            try:
                ## fun fact, assert isinstance(options,Options) won't work with jupyter notebooks
                ##  that use %load_ext autoreload
                assert options.__class__.__name__ == 'Options'
            except AssertionError:
                raise ValueError("Make sure you use an Options instance to specify Firefly settings.")
        else:
            ## we'll use the default ones then
            options = Options()

        self.options = options
        ## absolute path of where to place all the data files in, must be a 
        ##  sub-directory of Firefly/data for Firefly to be able to find it.

        ## get rid of the trailing '/' if it's there
        if datadir[-1]==os.sep:
            datadir=datadir[:-1]

        self.datadir = datadir
        self.path_prefix,self.path = self.splitAndValidateDatadir()

        #write the startup file?
        self.write_startup = write_startup

        #set the maximum number of particles per data file
        self.max_npart_per_file = max_npart_per_file

        ## prefix for the datafiles e.g. FIREdata
        self.prefix = prefix

        #remove the data files in the dataDir directory before adding more?
        self.clean_datadir = clean_datadir 
    
        ## array of particle groups
        self.particleGroups = []

    def splitAndValidateDatadir(self):
        path_prefix,path = os.path.split(self.datadir)
        for validate in ['index.html','data','src','LICENSE','README.md']:
            try:
                assert validate in os.listdir(os.path.split(path_prefix)[0])   
            except:
                IOError("datadir is not a sub-directory of a version of Firefly/data")
        return path_prefix,path

    def addParticleGroup(self,particleGroup):
        """ If you can open your own data then more power to you,
            I respect your autonomy"""
        print("adding")
        ## data validation of new ParticleGroup happened in its initialization
        self.particleGroups += [particleGroup]

        ## add this particle group to the reader's options file
        particleGroup.addToOptions(self.options)

        return self.particleGroups
    
    def dumpToJSON(
        self,
        loud=0):

        filenamesDict = {}

        ## write each particleGroup to JSON using their own method
        ##  save the filenames into a dictionary for filenames.json
        for particleGroup in self.particleGroups:
            print("outputting",particleGroup)
            this_filenames_and_nparts = particleGroup.outputToJSON(
                self.path,
                self.path_prefix,
                self.prefix,
                loud=loud,
                nparts_per_file = self.max_npart_per_file,
                clean = self.clean_datadir)
            filenamesDict[particleGroup.UIname]=this_filenames_and_nparts

        ## output the options file...
        self.options.outputToJSON(self.datadir,prefix=self.prefix)

        ## really... it has to be an array with a tuple with a 0 in the nparts spot? 
        filenamesDict['options'] = [(os.path.join(self.path,self.prefix+self.options.options_filename),0)]
        pd.Series(filenamesDict).to_json(os.path.join(self.datadir,'filenames.json'), orient='index')  

        ## add these files to the startup.json
        if self.write_startup == 'append':
            raise Exception("Unimplemented... not sure how to append lol")
        elif self.write_startup:
            pd.Series({"0":os.path.join("data",self.path)}).to_json('startup.json', orient='index') 

class ABGFIREreader(Reader):
    def __init__(self,
        snapdir, # directory that contains all the hdf5 data files
        snapnum, # which snapnumber to open
        ptypes = [], # which particle types to extract
        UInames = [], # what those particle types will be called in the UI
        dec_factors = [], # factor by which to decimate the particle types by
        returnKeys = [], # which things to read from the simulation
        filterFlags = [], # flags whether we should filter by that returnKey
        doMags = [], # flags for whether we should take the magnitude of that returnKey
        doLogs = [], # flags for whether we should take the log of that returnKey
        ## arguments from Reader
        datadir=None, ## abs path, must be a sub-directory of Firefly/data
        write_startup = True,# True -> write | False -> leave alone | "append" -> adds to existing file
        max_npart_per_file = 10**4,
        prefix = 'FIREData',
        clean_datadir = 0,
        options = None,
        ):

        ## input validation
        ##  ptypes
        try:
            lists = [dec_factors,UInames]
            names = ['dec_factors','UInames']
            for name,llist in zip(names,lists):
                assert len(llist) == len(returnKeys)
        except AssertionError:
            raise ValueError("%s is not the same length as ptypes"%name)

        ##  returnKeys
        try:
            lists = [filterFlags,doMags,doLogs]
            names = ['filterFlags','doMags','doLogs']
            for name,llist in zip(names,lists):
                assert len(llist) == len(returnKeys)
        except AssertionError:
            raise ValueError("%s is not the same length as returnKeys"%name)
    
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
        
        ## do we need to take the magnitude of it? (velocity? typically not..)
        self.doMags = doMags
        
        ## do we need to take the log of it 
        self.doLogs = doLogs

        ####### Reader __init__ below: #######

        ## absolute path of where to place all the data files in, must be a 
        ##  sub-directory of Firefly/data for Firefly to be able to find it.
        if datadir is None:
            ## let's try and guess what the datadir should be
            raise Exception("Datadir guessing is unimplemented!")
            """
            raise IOError("You must specify the absolute path of the"+
                " directory to save the JSON files using the datadir kwarg")
            """
        self.datadir = datadir
        self.path_prefix,self.path = self.splitAndValidateDatadir()

        #write the startup file?
        self.write_startup = write_startup

        #set the maximum number of particles per data file
        self.max_npart_per_file = max_npart_per_file

        ## prefix for the datafiles e.g. FIREdata
        self.prefix = prefix

        #remove the data files in the dataDir directory before adding more?
        self.clean_datadir = clean_datadir 
        
        if options is None:
            options = Options()

        self.options = options
    
        ## array of particle groups
        self.particleGroups = []
        
        self.particleGroups = []

    def loadData(self):
        for ptype,UIname,dec_factor in zip(self.ptypes,self.UInames,self.dec_factors):
            print("Loading ptype %s"%ptype)
            snapdict = openSnapshot(
                self.snapdir,
                self.snapnum,
                int(ptype[-1]), ## ptype should be PartType4,etc...
                keys_to_extract = ['Coordinates']+self.returnKeys
            )

            tracked_names,tracked_arrays,tracked_filter_flags = [],[],[]
            for returnKey,filterFlag,doMag,doLog in zip(
                self.returnKeys,self.filterFlags,self.doMags,self.doLogs):
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
                    tracked_arrays+= [arr]
                
            self.particleGroups += [ParticleGroup(
                UIname,
                snapdict['Coordinates'],
                tracked_names = tracked_names,
                tracked_arrays = tracked_arrays,
                decimation_factor = dec_factor,
                tracked_filter_flags = tracked_filter_flags
                )]

            ## add this particle group to the reader's options file
            self.particleGroups[-1].addToOptions(self.options)

        return self.particleGroups

class FIREreader(object):
	"""
	#These are the defaults that can be redefined by the user at runtime.  
	#These defaults are only applied after running self.defineDefaults().

		#directory that contains all the hdf5 data files
		self.directory = './' 
		
		#snapshot number to open
		self.snapnum = None

		#particles to return
		self.returnParts = ['PartType0', 'PartType1', 'PartType2', 'PartType4']
 
		#set names for the particle sets (note: these will be used in the 
		#   UI of Firefly; 4 characters or less is best)
		self.names = {'PartType0':'PartType0', 
					  'PartType1':'PartType1', 
					  'PartType2':'PartType2', 
					  'PartType4':'PartType4' }
		
		#flag to check if user has already defined the default values
		self.defined = False
		
		#amount to decimate the data before creating the json files 
		#   (==1 means no decimates, >1 factor by which to reduce the amount of data)
		self.decimate = dict()
		
		#keys from the hd5 file to include in the JSON file for Firefly 
		#   (must at least include Coordinates)
		self.returnKeys = dict()
				
		#set the weight of the particles (to define the alpha value). 
		#   This is a function that will calculate the weights
		self.weightFunction = dict()
		
		#set the radii of the particles. This is a function that will 
		#   calculate the radii
		self.radiusFunction = dict()
		
		#decide whether you want to use the key from returnKeys as 
		#   a filter item in the UI
		#NOTE: each of these must be the same length as self.returnKeys
		self.addFilter = dict()
  
		#should we use the log of these values?  
		#NOTE: this must be the same length as self.returnKeys
		self.dolog = dict()

		#should we use the magnitude of these values?   
		#NOTE: this must be the same length as self.returnKeys
		#NOTE: setting any of these to true will significantly slow down the file creation
		#NOTE: I calculate magnitude of velocity, if Velocities is 
		#   supplied, in the web app.  No need to do it here for Velocities.
		self.domag = dict()
 
		#should we plot using Alex Gurvich's radial profile fit to the 
		#   SPH particles (==1), or a simple symmetric radial profile?   
		#NOTE: this must be the same length as self.returnKeys
		self.doSPHrad = dict()
		
		#a dictionary of  for the WebGL app
		self.options = {'title':'Firefly', #set the title of the webpage
			########################
			#these settings are to turn on/off different bits of the user interface
			'UI':True, #do you want to show the UI?
			'UIparticle':dict(), #do you want to show the particles 
			#	in the user interface (default = True). This is a dict 
			#	with keys of the particle swapnames (as defined in self.names),
			#	 and is boolean.
			'UIdropdown':dict(), #do you want to enable the dropdown menus for 
			#	particles in the user interface (default = True).This is a 
			#	dict with keys of the particle swapnames (as defined in self.names), 
			#	and is boolean.
			'UIcolorPicker':dict(), #do you want to allow the user to change 
			#	the color (default = True).This is a dict with keys of the 
			#	particle swapnames (as defined in self.names), and is boolean.
			'UIfullscreen':True, #do you want to show the fullscreen button?
			'UIsnapshot':True, #do you want to show the snapshot button?
			'UIreset':True, #do you want to show the reset button?
			'UIsavePreset':True, #do you want to show the save preset button?
			'UIloadNewData':True, #do you want to show the load new data button?
			'UIcameraControls':True, #do you want to show the camera controls
			'UIdecimation':True, #do you want to show the decimation slider
			########################
			#these settings affect how the data are displayed
			'center':None, #do you want to define the initial camera center 
			#	(if not, the WebGL app will calculate the center as the mean 
			#	of the coordinates of the first particle set loaded in) 
			#	(should be an np.array of length 3: x,y,z)
			'camera':None, #initial camera location, NOTE: the magnitude must 
			#	be >0 (should be an np.array of length 3: x,y,z)
			'cameraRotation':None, #can set camera rotation if you want 
			#	(should be an np.array of length 3: xrot, yrot, zrot, in radians)
			'maxVrange':2000., #maximum range in velocities to use in deciding 
			#	the length of the velocity vectors (making maxVrange 
			#	larger will enhance the difference between small and large velocities)
			'startFly':False, #start in Fly controls? (if False, then 
			#	start in the default Trackball controls)
			'friction':None, #set the initial friction for the controls (default is 0.1)
			'stereo':False, #start in stereo mode?
			'stereoSep':None, #camera (eye) separation in the stereo 
			#	mode (default is 0.06, should be < 1)
			'decimate':None, #set the initial decimation (e.g, 
			#	you could load in all the data by setting self.decimate to 
			#	1 above, but only display some fraction by setting 
			#	self.options.decimate > 1 here).  This is a single value (not a dict)
			'plotNmax':dict(), #maximum initial number of particles to plot 
			#	(can be used to decimate on a per particle basis).  This is 
			#	a dict with keys of the particle swapnames (as defined in self.names)
			'showVel':dict(), #start by showing the velocity vectors?  
			#	This is a dict with keys of the particle swapnames 
			#	(as defined in self.names), and is boolean
			'velType':dict(), #default type of velocity vectors to plot.  
			#	This is a dict with keys of the particle swapnames (as defined in self.names), 
			#	and must be either 'line', 'arrow', or 'triangle'.  (default is 'line')
			'color':dict(), #set the default color, This is a dict with keys 
			#	of the particle swapnames (as defined in self.names), must contain 
			#	4-element lists with rgba. (default is random colors with a = 1)
			'sizeMult':dict(), #set the default point size multiplier. This is a 
			#	dict with keys of the particle swapnames (as defined in self.names),
			#	 default for all sizes is 1.
			'showParts':dict(), #show particles by default. This is a dict with 
			#	keys of the particle swapnames (as defined in self.names), 
			#	boolean, default is true.
			'filterVals':dict(), #initial filtering selection. This is a dict 
			#	with initial keys of the particle swapnames (as defined in self.names), 
			#	then for each filter the [min, max] range 
			#	(e.g., 'filter':{'Gas':{'log10Density':[0,1],'magVelocities':[20, 100]}} )
			'filterLims':dict(), #initial [min, max] limits to the filters. 
			#	This is a dict with initial keys of the particle swapnames 
			#	(as defined in self.names), then for each filter the [min, max] range 
			#	(e.g., 'filter':{'Gas':{'log10Density':[0,1],'magVelocities':[20, 100]}} )

			########################
			#this should not be modified
			'loaded':True, #used in the web app to check if the options have been read in

		  } 
		
		#the prefix of the the JSON files
		self.JSONfname = 'FIREdata'
		
		#write the startup file?
		self.writeStartup = True

		#remove the data files in the dataDir directory before adding more?
		self.cleanDataDir = False
		
		#set the maximum number of particles per data file
		self.maxppFile = 1e4

		#in case you want to print the available keys to the screen
		self.showkeys = False
		
		#directory to place all the data files in (assumed to be within the current directory)
		self.dataDir = None

	"""


	def __init__(self,
        snapdir='./', #directory that contains all the hdf5 data files
        snapnum = None,
        returnParts = ['PartType0', 'PartType1', 'PartType2', 'PartType4'],
        **kwargs):
##################################################        
#defaults that can be modified


		self.snapdir = snapdir
		#snapshot number to open
		self.snapnum = snapnum

		#particles to return
		self.returnParts = returnParts
 
		#set names for the particle sets (note: these will be used in the UI of Firefly; 4 characters or less is best)
		self.names = {'PartType0':'PartType0', 
					  'PartType1':'PartType1', 
					  'PartType2':'PartType2', 
					  'PartType4':'PartType4' }
		
		#flag to check if user has already defined the default values
		self.defined = False
		
		#amount to decimate the data before creating the json files (==1 means no decimates, >1 factor by which to reduce the amount of data)
		self.decimate = dict()
		
		#keys from the hd5 file to include in the JSON file for Firefly (must at least include Coordinates)
		self.returnKeys = dict()
				
		#set the weight of the particles (to define the alpha value). This is a function that will calculate the weights
		self.weightFunction = dict()
		
		#set the radii of the particles. This is a function that will calculate the radii
		self.radiusFunction = dict()
		
		#decide whether you want to use the key from returnKeys as a filter item in the UI
		#NOTE: each of these must be the same length as self.returnKeys
		self.addFilter = dict()
  
		#should we use the log of these values?  
		#NOTE: this must be the same length as self.returnKeys
		self.dolog = dict()

		#should we use the magnitude of these values?   
		#NOTE: this must be the same length as self.returnKeys
		#NOTE: setting any of these to true will significantly slow down the file creation
		#NOTE: I calculate magnitude of velocity, if Velocities is supplied, in the web app.  No need to do it here for Velocities.
		self.domag = dict()
 
		#should we plot using Alex Gurvich's radial profile fit to the SPH particles (==1), or a simple symmetric radial profile?   
		#NOTE: this must be the same length as self.returnKeys
		self.doSPHrad = dict()
		
		#a dictionary of  for the WebGL app
		self.options = {'title':'Firefly', #set the title of the webpage
			########################
			#these settings are to turn on/off different bits of the user interface
			'UI':True, #do you want to show the UI?
			'UIparticle':dict(), #do you want to show the particles 
			#	in the user interface (default = True). This is a dict 
			#	with keys of the particle swapnames (as defined in self.names),
			#	 and is boolean.
			'UIdropdown':dict(), #do you want to enable the dropdown menus for 
			#	particles in the user interface (default = True).This is a 
			#	dict with keys of the particle swapnames (as defined in self.names), 
			#	and is boolean.
			'UIcolorPicker':dict(), #do you want to allow the user to change 
			#	the color (default = True).This is a dict with keys of the 
			#	particle swapnames (as defined in self.names), and is boolean.
			'UIfullscreen':True, #do you want to show the fullscreen button?
			'UIsnapshot':True, #do you want to show the snapshot button?
			'UIreset':True, #do you want to show the reset button?
			'UIsavePreset':True, #do you want to show the save preset button?
			'UIloadNewData':True, #do you want to show the load new data button?
			'UIcameraControls':True, #do you want to show the camera controls
			'UIdecimation':True, #do you want to show the decimation slider
			########################
			#these settings affect how the data are displayed
			'center':None, #do you want to define the initial camera center 
			#	(if not, the WebGL app will calculate the center as the mean 
			#	of the coordinates of the first particle set loaded in) 
			#	(should be an np.array of length 3: x,y,z)
			'camera':None, #initial camera location, NOTE: the magnitude must 
			#	be >0 (should be an np.array of length 3: x,y,z)
			'cameraRotation':None, #can set camera rotation if you want 
			#	(should be an np.array of length 3: xrot, yrot, zrot, in radians)
			'maxVrange':2000., #maximum range in velocities to use in deciding 
			#	the length of the velocity vectors (making maxVrange 
			#	larger will enhance the difference between small and large velocities)
			'startFly':False, #start in Fly controls? (if False, then 
			#	start in the default Trackball controls)
			'friction':None, #set the initial friction for the controls (default is 0.1)
			'stereo':False, #start in stereo mode?
			'stereoSep':None, #camera (eye) separation in the stereo 
			#	mode (default is 0.06, should be < 1)
			'decimate':None, #set the initial decimation (e.g, 
			#	you could load in all the data by setting self.decimate to 
			#	1 above, but only display some fraction by setting 
			#	self.options.decimate > 1 here).  This is a single value (not a dict)
			'plotNmax':dict(), #maximum initial number of particles to plot 
			#	(can be used to decimate on a per particle basis).  This is 
			#	a dict with keys of the particle swapnames (as defined in self.names)
			'showVel':dict(), #start by showing the velocity vectors?  
			#	This is a dict with keys of the particle swapnames 
			#	(as defined in self.names), and is boolean
			'velType':dict(), #default type of velocity vectors to plot.  
			#	This is a dict with keys of the particle swapnames (as defined in self.names), 
			#	and must be either 'line', 'arrow', or 'triangle'.  (default is 'line')
			'color':dict(), #set the default color, This is a dict with keys 
			#	of the particle swapnames (as defined in self.names), must contain 
			#	4-element lists with rgba. (default is random colors with a = 1)
			'sizeMult':dict(), #set the default point size multiplier. This is a 
			#	dict with keys of the particle swapnames (as defined in self.names),
			#	 default for all sizes is 1.
			'showParts':dict(), #show particles by default. This is a dict with 
			#	keys of the particle swapnames (as defined in self.names), 
			#	boolean, default is true.
			'filterVals':dict(), #initial filtering selection. This is a dict 
			#	with initial keys of the particle swapnames (as defined in self.names), 
			#	then for each filter the [min, max] range 
			#	(e.g., 'filter':{'Gas':{'log10Density':[0,1],'magVelocities':[20, 100]}} )
			'filterLims':dict(), #initial [min, max] limits to the filters. 
			#	This is a dict with initial keys of the particle swapnames 
			#	(as defined in self.names), then for each filter the [min, max] range 
			#	(e.g., 'filter':{'Gas':{'log10Density':[0,1],'magVelocities':[20, 100]}} )

			########################
			#this should not be modified
			'loaded':True, #used in the web app to check if the options have been read in

		} 
		
		#the prefix of the the JSON files
		self.JSONfname = 'FIREdata'
		
		#write the startup file?
		self.writeStartup = True

		#remove the data files in the dataDir directory before adding more?
		self.cleanDataDir = False
		
		#set the maximum number of particles per data file
		self.maxppFile = 1e4

		#directory to place all the data files in (assumed to be within the current directory)
		self.dataDir = None
		

################################################## 
#don't modify these

		#the data for the JSON file
		self.partsDict = dict()
		
		#keys that shouldn't be shuffled or decimated
		self.nodecimate = ['filterKeys','doSPHrad']
		
		#keys for filtering (will be defined below)
		self.filterKeys = {}
		
		#will store all the file names that are produced (will be defined below in defineFilenames)
		self.filenames = dict()

		#will contain a list of the files in the order they are read
		self.loadedHDF5Files = []


		self.slash = '/'
		if os.name == 'nt':
			self.slash = '\\'

		

################################################## 
################################################## 
################################################## 
		
	def defineDefaults(self):
		self.defined = True
		for p in self.returnParts:
			#amount to decimate the data (==1 means no decimates, 
			#   >1 factor by which to reduce the amount of data)
			self.decimate[p] = 1.

			#keys from the hdf5 file to include in the JSON file for 
			#   Firefly (must at least include Coordinates)
			self.returnKeys[p] = ['Coordinates']      

			#set the weight of the particles (to define the alpha value). 
			#   This is a function that will calculate the weights
			self.weightFunction[p] = None

			#set the radii of the particles. This is a function that will calculate the radii
			self.radiusFunction[p] = None

			#decide whether you want to use the key from returnKeys as a filter item in the UI
			self.addFilter[p] = [False]   

			#should we use the log of these values?  
			self.dolog[p] = [False]

			#should we use the magnitude of these values?   
			self.domag[p] = [False]

			#should we plot using Alex Gurvich's radial profile fit to the 
			#   SPH particles (==1), or a simple symmetric radial profile?   
			self.doSPHrad[p] = [0]

			#options
			#dropdown menus
			pp = self.swapnames(p) 
			self.options['UIparticle'][pp] = True
			self.options['UIdropdown'][pp] = True
			self.options['UIcolorPicker'][pp] = True
			self.options['color'][pp] = [
				np.random.random(), 
				np.random.random(), 
				np.random.random(), 1.] #set the default color = rgba.  
			self.options['sizeMult'][pp] = 1. #set the default point size multiplier 
			self.options['showParts'][pp] = True
			
	#used self.names to swap the dictionary keys
	def swapnames(self, pin):
		return self.names[pin]

	#adds an array to the dict for a given particle set and data file 
	def addtodict(self, d, snap, part, dkey, sendlog, sendmag, usekey = None, mfac = 1., vals = None, filterFlag = False):
		if (usekey is None):
			ukey = dkey
		else:
			ukey = usekey
		
		if (vals is None):
			vals = snap[part + '/' + dkey][...] * mfac
		else:
			self.returnKeys[part].append(ukey)

		if (sendlog):
			ukey = "log10"+ukey
			vals = np.log10(vals)
		if (sendmag):  
			#print "calculating magnitude for ", ukey
			ukey = "mag"+ukey
			vals = [np.linalg.norm(v) for v in vals]
		 
		if ukey in list(d[part].keys()):
			d[part][ukey] = np.append(d[part][ukey], vals,  axis=0)
		else:
			d[part][ukey] = vals

		if (filterFlag):
			if ('filterKeys') not in d[part]:
				d[part]['filterKeys'] = []
			d[part]['filterKeys'].append(ukey)

	#populate the dict
	def populate_dict(self):
		## fill the parts dict with values
		for ptype in self.returnParts:
			self.partsDict[ptype]={}
			if len(self.returnKeys[ptype]) == 0:
				continue
			snapdict = openSnapshot(
				self.directory,
				self.snapnum,
				int(ptype[-1]),## PartType%d <-- final character is number
				keys_to_extract = copy.copy(self.returnKeys[ptype]),
				header_only=0)
			for i,key in enumerate(self.returnKeys[ptype]):
				try:
					
					snapvals = snapdict[key]
					if self.dolog[ptype][i]:
						snapvals=np.log10(snapvals)
						key = 'log10%s'%key
					self.partsDict[ptype][key]=snapvals
				except KeyError:
					print("%s has no %s"%(ptype,key))


		## return the ordering of the files, so we can reopen them outside of the reader
		##  if we want...
		try:
			self.loadedHDF5Files = snapdict['fnames']
		except NameError:
			pass
		#and on some of the options here
		for p in list(self.partsDict.keys()):
			self.partsDict[p]['filterKeys'] = self.filterKeys[p]
			self.partsDict[p]['doSPHrad'] = self.doSPHrad[p]
		return self.loadedHDF5Files

	def shuffle_dict(self):
		#should we decimate the data? (NOTE: even if decimate = 1, it is wise to shuffle the data so it doesn't display in blocks)

		for p in list(self.partsDict.keys()):
	
			if (self.decimate[p] > 0): 
				if (self.decimate[p] > 1):
					print("decimating and shuffling ...")
				else:
					print("shuffling ... ")
				N = int(len(self.partsDict[p][self.returnKeys[p][0]]))
				indices = np.arange(N )
				dindices = np.random.choice(indices, size = int(round(N/self.decimate[p])), replace=False)
				for k in list(self.partsDict[p].keys()):
					if (k not in self.nodecimate):
						self.partsDict[p][k] = self.partsDict[p][k][dindices]

	def swap_dict_names(self):
		#swap the names
		for p in list(self.partsDict.keys()):
			pp = self.swapnames(p)
			self.partsDict[pp] = self.partsDict.pop(p)
			
	#create the JSON file, and then add the name of the variable (parts) that we want in Firefly
	def createJSON(self):

		## NOTE ABG: added here default dataDirectory parsing
		print("dataDir",self.dataDir)
		if (self.dataDir == None):
			self.dataDir = ""#self.slash.join(os.path.realpath(__file__).split(self.slash)[:-1]) 
			self.dataDir = os.path.join(self.dataDir, "%s_%d"%(self.directory.split(self.slash)[-2],self.snapnum))



		print("writing JSON files ...")
		if (os.path.exists(self.dataDir) and self.cleanDataDir):
			print("REMOVING FILES FROM data"+self.slash+self.dataDir)	
			shutil.rmtree(self.dataDir)

		if (not os.path.exists(self.dataDir)):
			os.makedirs(self.dataDir)

		self.defineFilenames()
		for ptype in self.partsDict:
			nprinted = 0
			for i_file,fname in enumerate(self.filenames[ptype]):
				#print(f)
				outDict = dict()
				foo = 0
				for key in list(self.partsDict[ptype].keys()):
					if (isinstance(self.partsDict[ptype][key], list) or 
						type(self.partsDict[ptype][key]) == np.ndarray):
						if (len(self.partsDict[ptype][key]) > nprinted):
							foo = int(np.floor(float(fname[1])))
							#print("list", k, len(self.partsDict[p][k]), nprinted, foo)
							outDict[key] = self.partsDict[ptype][key][int(nprinted):(nprinted + foo)]
							print(key,i_file,outDict[key] if key == 'filterKeys' or key == 'doSPHrad' else '')	
							print(fname)	
					else:
						if (i_file == 0):
							outDict[key] = self.partsDict[ptype][key]

				nprinted += foo
				pd.Series(outDict).to_json(fname[0], orient='index')
		#for the options
		#print(self.filenames['options'][0])
		self.createOptionsJSON()
		#the list of files
		pd.Series(self.filenames).to_json(self.dataDir + self.slash + 'filenames.json', orient='index') 
		#the startup file
		if (self.writeStartup):
			pd.Series({"0":"data" +self.slash+ self.dataDir}).to_json('startup.json', orient='index') 

		
	def defineFilenames(self):
		#first create the dict of file names and write that to a JSON file
		for p in self.partsDict:
			nparts = len(self.partsDict[p]['Coordinates'])
			nused = 0
			i = 0
			while nused < nparts:
				ninfile = min(self.maxppFile, nparts - nused)
				nused += ninfile
				foo = [self.dataDir + self.slash + self.JSONfname+p+str(i).zfill(3)+'.json', ninfile]
				if (i == 0):
					self.filenames[p] = [foo]
				else:
					self.filenames[p].append(foo)
				i += 1
			self.filenames[p] = np.array(self.filenames[p])

		#for the options
		self.filenames['options'] = np.array([self.dataDir + self.slash + self.JSONfname+'Options.json',0])
		
	def createOptionsJSON(self, file = None):
		#separated this out incase user wants to only write the options file
		if (file is None):
			file = self.filenames['options'][0]
		pd.Series(self.options).to_json(file, orient='index') 
 
	
	def defineFilterKeys(self):
		for p in self.returnParts:
			self.filterKeys[p] = []
			pp = self.swapnames(p) 

			self.options['filterVals'][pp] = dict()
			self.options['filterLims'][pp] = dict()
			j = 0

			if (len(self.addFilter[p]) < len(self.returnKeys[p])):
				self.addFilter[p] = np.full(len(self.returnKeys[p]), self.addFilter[p][0])
			if (len(self.dolog[p]) < len(self.returnKeys[p])):
				self.dolog[p] = np.full(len(self.returnKeys[p]), self.dolog[p][0])
			if (len(self.domag[p]) < len(self.returnKeys[p])):
				self.domag[p] = np.full(len(self.returnKeys[p]), self.domag[p][0])

			for i,k in enumerate(self.returnKeys[p]):
				if (self.addFilter[p][i]):
					self.filterKeys[p].append(k)
					if (self.dolog[p][i]):
						self.filterKeys[p][j] = 'log10' + self.filterKeys[p][j]
					if self.domag[p][i]:
						self.filterKeys[p][j] = 'mag' + self.filterKeys[p][j]
					self.options['filterVals'][pp][self.filterKeys[p][j]] = None
					self.options['filterLims'][pp][self.filterKeys[p][j]] = None
					j += 1
				#init.js will automatically add this to the filters if Velocities are provided in the data
				if (k == "Velocities"):
					self.options['filterVals'][pp]['magVelocities'] = None
					self.options['filterLims'][pp]['magVelocities'] = None

	def run(self):
		if (not self.defined):
			self.defineDefaults()
			
		self.defineFilterKeys()
		self.populate_dict()
		self.shuffle_dict()
		self.swap_dict_names()
		self.createJSON()
		print("done")

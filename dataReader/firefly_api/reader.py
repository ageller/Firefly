from __future__ import print_function

import h5py
import os 
import requests
import numpy as np

from firefly_api.options import Options
from firefly_api.tween import TweenParams
from firefly_api.particlegroup import ParticleGroup
from firefly_api.errors import FireflyError,FireflyWarning,FireflyMessage,warnings
from firefly_api.json_utils import write_to_json,load_from_json

class Reader(object):
    """
    This class provides a framework to unify the Options and ParticleGroup classes
    to make sure that the user can easily produce Firefly compatible files. It also 
    provides some rudimentary data validation. You should use this Reader as a base
    for any custom readers you may build (and should use inheritance, as demonstrated
    below in FIREreader!
    """
    def __init__(self,
        JSONdir = None, ## abs path, must be a sub-directory of Firefly/data
        options = None,
        write_startup = 'append',# True -> write | False -> leave alone | "append" -> adds to existing file
        max_npart_per_file = 10**4,
        prefix = 'Data',
        clean_JSONdir = 0,
        tweenParams = None
        ):
        """
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

        `tweenParams=None` - a tweenParams instance for automating a fly-through
            path by pressing `t` while within an open instance of Firefly.
        """

        ## where will firefly look for jsons
        ##  firefly_api lives in dataReader, so let's steal the 
        ##  path from there
        self.DATA_dir = os.path.join(
                os.path.dirname( ## /
                os.path.dirname( ## /dataReader
                os.path.dirname(  
                os.path.realpath(__file__)))),
                'static', ## /static
                'data') ## /static/data

        if JSONdir is None:
            FireflyMessage("JSONdir is None, defaulting to %s/%s"%(self.DATA_dir,prefix))
            JSONdir = os.path.join(
                self.DATA_dir,
                prefix)

        if options is not None:
            try:
                ## fun fact, assert isinstance(options,Options) won't work with jupyter notebooks
                ##  that use %load_ext autoreload
                assert options.__class__.__name__ == 'Options'
            except AssertionError:
                raise FireflyError("Make sure you use an Options instance to specify Firefly settings.")
        else:
            ## we'll use the default ones then
            options = Options()

        if tweenParams is not None:
            try:
                assert tweenParams.__class__.__name__ == 'TweenParams'
            except AssertionError:
                raise FireflyError("Make sure you use a TweenParams instance to specify fly-through paths.")

        self.tweenParams = tweenParams

        self.options = options
        ## absolute path of where to place all the data files in, must be a 
        ##  sub-directory of Firefly/data for Firefly to be able to find it.

        ## get rid of the trailing '/' if it's there
        if JSONdir[-1]==os.sep:
            JSONdir=JSONdir[:-1]

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
    
        ## array of particle groups
        self.particleGroups = []

    def splitAndValidateDatadir(self):
        """
        Ensures that files will be output to a location that Firefly 
        can read, as well as splits the path so that filenames.json 
        references files correctly.
        """
        path_prefix,path = os.path.split(self.JSONdir)
        if path_prefix == '':
            path_prefix = os.getcwd()

        for validate in ['index.html','static','LICENSE','README.md']:
            try:
                assert validate in os.listdir(
                    os.path.join(
                        os.path.split(path_prefix)[0],
                        ".."))   
            except:
                warnings.warn(FireflyWarning(
                    "JSONdir: {} -- ".format(self.JSONdir)+
                    "is not a sub-directory of Firefly/static/data. "+
                    "\nThis may produce confusing or inoperable results. "+
                    "As such, we will create a symlink for you. You're "+
                    "welcome."))

        return path_prefix,path

    def addParticleGroup(self,particleGroup):
        """
        Adds a particle group to the Reader instance and adds that particle group's
        options to the attached Options instance.
        Input:
            particleGroup - the particle group in question that you would like to add
        """

        ## data validation of new ParticleGroup happened in its initialization
        self.particleGroups = np.append(
            self.particleGroups,
            [particleGroup],axis=0)

        ## add this particle group to the reader's options file
        self.options.addToOptions(particleGroup)

        return self.particleGroups
    
    def dumpToJSON(
        self,
        loud=0,
        write_jsons_to_disk=True):
        """
        Creates all the necessary JSON files to run Firefly, making sure they are
        properly linked and cross-reference correctly, using the attached Options
        instance's and particleGroups' outputToJSON() methods.
        Input:
            loud=0 - flag for whether warnings within each outputToJSON should be shown
        """

        ## handle JSON dir stuff
        if write_jsons_to_disk:
            if not os.path.isdir(self.JSONdir):
                os.makedirs(self.JSONdir)

            if not os.path.dirname(self.JSONdir) == 'data':

                ## create a symlink so that data can 
                ##  be read from a "sub-directory"
                try:
                    os.symlink(self.JSONdir,os.path.join(
                        self.DATA_dir,
                        self.path))
                except FileExistsError:
                    FireflyMessage("Symlink already exists. Skipping.")


        ## initialize an output array to contain all the jsons and their names
        JSON_array = []

        ## write each particleGroup to JSON using their own method
        ##  save the filenames into a dictionary for filenames.json
        filenamesDict = {}
        for particleGroup in self.particleGroups:
            FireflyMessage("outputting:",particleGroup)
            ## append the JSON arrays for this particle group
            JSON_array += particleGroup.outputToJSON(
                self.path,
                self.path_prefix,
                self.prefix,
                loud=loud,
                nparts_per_file=self.max_npart_per_file,
                clean=self.clean_JSONdir if particleGroup is self.particleGroups[0] else False,
                write_jsons_to_disk=write_jsons_to_disk)

            filenamesDict[particleGroup.UIname]=list(particleGroup.filenames_and_nparts)

        ## output the options.json file
        JSON_array +=[self.options.outputToJSON(
            self.JSONdir,
            prefix=self.prefix,
            loud=loud,
            write_jsons_to_disk=write_jsons_to_disk)]

        ## format and output the filenames.json file
        filenamesDict['options'] = [(os.path.join(self.path,self.prefix+self.options.options_filename),0)]

        filename=os.path.join(self.JSONdir,'filenames.json')
        JSON_array +=[(
            filename,
            write_to_json(
                filenamesDict,
                filename if write_jsons_to_disk else None))] ## None -> returns JSON string

        ## handle the startup.json file, may need to append or totally overwrite
        startup_file = os.path.join(
            self.DATA_dir,
            'startup.json')

        ## actual path to data for this dataset
        startup_path = os.path.join("data",self.path)

        if self.write_startup == 'append' and os.path.isfile(startup_file):
            startup_dict = load_from_json(startup_file)

            maxx = 0 
            for key in startup_dict.keys():
                if int(key) > maxx: 
                    maxx = int(key)

                ## it's already in startup.json
                if startup_dict[key] == startup_path:
                    startup_file = None 
                    maxx-=1 ## since we'll add 1 below
            
            startup_dict[str(maxx+1)]=startup_path
            JSON_array+=[(
                ## recreate in case we overwrote the startup_file variable in loop above
                os.path.join(self.DATA_dir,'startup.json'), 
                write_to_json(
                    startup_dict,
                    startup_file if write_jsons_to_disk else None))] ## None -> returns JSON string

        elif self.write_startup:
            JSON_array+=[(
                startup_file,
                write_to_json(
                    {"0":startup_path},
                    startup_file if write_jsons_to_disk else None))] ## None -> returns JSON string

        ## write a tweenParams file if a TweenParams instance is attached to reader
        if hasattr(self,'tweenParams') and self.tweenParams is not None:
            JSON_array+=[self.tweenParams.outputToJSON(
                self.JSONdir,
                #prefix=self.prefix,
                loud=loud,
                write_jsons_to_disk=write_jsons_to_disk)] ## None -> returns JSON string

        if not write_jsons_to_disk:
            ## create a single "big JSON" with all the data in it in case
            ##  we want to send dataViaFlask
            self.JSON = write_to_json(dict(JSON_array),None)
        else:
            ## we wrote all the little JSONs to disk
            ##  so we won't store a single big JSON to send to Flask
            ##  since we only have None's in there anyway
            self.JSON = None
        return self.JSON

    def outputToDict(self):
        """
        Formats the data in the reader to a python dictionary,
        using the attached Options
        instance's and particleGroups' outputToDict() methods.
        """

        outputDict = {}
        outputDict['parts'] = {}

        ## create each particleGroup's dictionary using their own method
        for particleGroup in self.particleGroups:
            outputDict['parts'][particleGroup.UIname] = particleGroup.outputToDict()

        ## store the options file in the output dictionary
        outputDict['options'] = self.options.outputToDict()

        return outputDict

    def sendDataViaFlask(self,port=5000):

        ## retrieve a single "big JSON" of all the mini-JSON 
        ##  sub-files. 
        if not hasattr(self,'JSON') or self.JSON is None:
            self.dumpToJSON(
                loud=False,
                write_jsons_to_disk=False)

        ## post the json to the listening url data_input
        ##  defined in FireflyFlaskApp.py
        print("posting...",end='')
        requests.post(
            f'http://localhost:{port:d}/data_input',
            json=self.JSON)
        print("data posted!")

class SimpleReader(Reader):

    def __init__(
        self,
        path_to_data,
        write_jsons_to_disk=True,
        decimation_factor=1,
        **kwargs):
        """
        A simple reader that will take as minimal input the path to a 
        (set of) .hdf5 file(s) and extract each top level group's
        'Coordinates' or 'x','y','z' values. 

        Keyword arguments are passed to the Reader initialization.

        Input:
            path_to_data - path to .hdf5 file(s)
            write_jsons_to_disk=True - flag to write JSONs to disk
                immediately at the end of SimpleReader's __init__
        """

        if '.hdf5' in path_to_data:
            ## path_to_data points directly to a single .hdf5 file
            fnames = [path_to_data]

        elif os.path.isdir(path_to_data):
            ## path_to_data points to a directory containing .hdf5 data files

            fnames = []
            for this_fname in os.listdir(path_to_data):
                if '.hdf5' in this_fname:
                    fnames += [os.path.join(path_to_data,this_fname)]
        else:
            raise ValueError(
                "%s needs to point to an .hdf5 file or "%path_to_data+
                "a directory containing .hdf5 files.")

        ## take the contents of the "first" file to define particle groups and keys
        with h5py.File(fnames[0],'r') as handle:
            particle_groups = list(handle.keys())

        ## Gadget data has a header as well as particle groups
        ##  so we need to ignore it
        if 'Header' in particle_groups:
            particle_groups.pop(particle_groups.index("Header"))

        print("Opening %d files and %d particle types..."%(len(fnames),len(particle_groups)))

        ## create a default reader instance
        super().__init__(**kwargs)
        for particle_group in particle_groups:
            for i,fname in enumerate(fnames):
                with h5py.File(fname,'r') as handle:
                    ## (re)-initialize the coordinate array
                    if i == 0:
                        coordinates = np.empty((0,3))

                    ## open the hdf5 group
                    h5_group = handle[particle_group]
                    
                    if "Coordinates" in h5_group.keys():
                        ## append the coordinates
                        coordinates = np.append(coordinates,h5_group['Coordinates'][()],axis=0)

                    elif ("x" in h5_group.keys() and
                        "y" in h5_group.keys() and
                        "z" in h5_group.keys()):

                        ## read the coordinate data from x,y,z arrays
                        xs = h5_group['x'][()]
                        ys = h5_group['y'][()]
                        zs = h5_group['z'][()]

                        ## initialize a temporary coordinate array to append
                        temp_coordinates = np.zeros((xs.size,3))
                        temp_coordinates[:,0] = xs
                        temp_coordinates[:,1] = ys
                        temp_coordinates[:,2] = zs

                        ## append the coordinates
                        coordinates = np.append(coordinates,temp_coordinates,axis=0)

            ## initialize a firefly particle group instance
            firefly_particleGroup = ParticleGroup(
                particle_group,
                coordinates,
                decimation_factor=decimation_factor)
            ## attach the instance to the reader
            self.addParticleGroup(firefly_particleGroup)

        ## either write a bunch of mini JSONs to disk or store 
        ##  a single big JSON in self.JSON
        self.dumpToJSON(write_jsons_to_disk=write_jsons_to_disk)
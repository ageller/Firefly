from __future__ import print_function

import h5py
import os 
import pandas as pd
import requests
import numpy as np

from .settings import Settings
from .tween import TweenParams
from .particlegroup import ParticleGroup
from .errors import FireflyWarning,FireflyMessage,warnings
from .json_utils import write_to_json,load_from_json

class Reader(object):
    """This class provides a framework to unify the Settings and ParticleGroup classes
    to make sure that the user can easily produce Firefly compatible files. It also 
    provides some rudimentary data validation. You should use this Reader as a base
    for any custom readers you may build (and should use inheritance, as demonstrated
    in FIREreader).
    """
    
    def __init__(self,
        prefix = 'Data',
        JSONdir = None, ## abs path, must be a sub-directory of Firefly/data
        clean_JSONdir = False,
        max_npart_per_file = 10**4,
        write_startup = 'append',# True -> write | False -> leave alone | "append" -> adds to existing file
        settings = None,
        tweenParams = None):
        """[summary]

        :param prefix: Prefix for any JSON files created, JSON files will be of the format:
            <prefix><parttype>_%d.json, defaults to 'Data'
        :type prefix: str, optional
        :param JSONdir: the sub-directory that will contain your JSON files, relative
            to your $HOME directory. , defaults to $HOME/<prefix>
        :type JSONdir: str, optional
        :param clean_JSONdir: flag to delete all :code:`.json` files in
            the :code:`JSONdir`. Strictly not necessary (since :code:`filenames.json` 
            will be updated) but it is good to clean up after yourself., defaults to False
        :type clean_JSONdir: bool, optional
        :param max_npart_per_file: , defaults to 10**4
        :type max_npart_per_file: int, optional
        :param write_startup: flag for how to treat the :code:`startup.json` file. 
            Takes three values: 
            :code:`'append'`: appends :code:`JSONdir` to :code:`startup.json`, 
            :code:`True`: overwrites :code:`startup.json` with a single entry, :code:`JSONdir`, 
            :code:`False`: does not alter :code:`startup.json`, 
            , defaults to 'append'
        :type write_startup: str/bool, optional
        :param settings: a :class:`Firefly.data_reader.Settings` instance, defaults to 
            a new default :class:`Firefly.data_reader.Settings` instance.
        :type settings: :class:`Firefly.data_reader.Settings`, optional
        :param tweenParams: :class:`Firefly.data_reader.TweenParams` instance, defaults to None
        :type tweenParams: :class:`Firefly.data_reader.TweenParams`, optional
        :raises TypeError: raised if anything other than a :class:`Firefly.data_reader.Settings` 
            instance is passed to :code:`settings`
        :raises TypeError: raised if anything other than a :class:`Firefly.data_reader.TweenParams` 
            instance is passed to :code:`tweenParams`
        """

        """
        `max_npart_per_file=10000` - The maximum number of particles saved per file,
            don't use too large a number or you will have trouble loading
            the individual files in. 

        `prefix='Data'` - What you would like your `.json` files to be called when
            you run `reader.dumpToJSON`. The format is
            `(prefix)(particleGroupName)(fileNumber).json`.

        `clean_JSONdir=0` - 

        `tweenParams=None` - a tweenParams instance for automating a fly-through
            path by pressing `t` while within an open instance of Firefly.
        """

       

        ## where will firefly look for jsons
        ##  we're in data_reader, so let's steal the 
        ##  path from there
        self.DATA_dir = os.path.join(
                os.path.dirname( ## /
                os.path.dirname(  
                os.path.realpath(__file__))),
                'static', ## /static
                'data') ## /static/data

        if JSONdir is None:
            FireflyMessage("JSONdir is None, defaulting to %s/%s"%(self.DATA_dir,prefix))
            JSONdir = os.path.join(
                self.DATA_dir,
                prefix)
        elif JSONdir[:1] != os.sep:
            ## JSONdir is a relative path. 
            ##  Let's assume they want to save w.r.t. their home directory?
            JSONdir = os.path.join(os.environ['HOME'],JSONdir)

        if settings is not None:
            if settings.__class__.__name__ != 'Settings':
                ## fun fact, assert isinstance(settings,Settings) won't work with jupyter notebooks
                ##  that use %load_ext autoreload
                raise TypeError("Make sure you use a Settings instance to specify Firefly settings.")
        else:
            ## we'll use the default ones then
            settings = Settings()

        if tweenParams is not None:
            if tweenParams.__class__.__name__ != 'TweenParams':
                raise TypeError("Make sure you use a TweenParams instance to specify fly-through paths.")

        self.tweenParams = tweenParams

        self.settings = settings
        ## absolute path of where to place all the data files in, must be a 
        ##  sub-directory of Firefly/data for Firefly to be able to find it.

        ## get rid of the trailing '/' if it's there
        if JSONdir[-1:]==os.sep:
            JSONdir=JSONdir[:-1]

        self.JSONdir = JSONdir
        self.path_prefix,self.path = self.__splitAndValidateDatadir()

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

    def __splitAndValidateDatadir(self):
        """[summary]

        :return: [description]
        :rtype: [type]
        """

        """
        Ensures that files will be output to a location that Firefly 
        can read, as well as splits the path so that filenames.json 
        references files correctly.
        """
        
        path_prefix,path = os.path.split(self.JSONdir)
        if path_prefix == '':
            path_prefix = os.getcwd()

        self.needs_link = False
        for validate in ['index.html','static','LICENSE','README.md']:
            if validate not in os.listdir(
                    os.path.join(
                        os.path.split(path_prefix)[0],
                        "..")):

                warnings.warn(FireflyWarning(
                    "JSONdir: {} -- ".format(self.JSONdir)+
                    "is not a sub-directory of Firefly/static/data. "+
                    "\nThis may produce confusing or inoperable results. "+
                    "As such, we will create a symlink for you when you "+
                    " dumpToJSON."))

                self.needs_link = True
                break

        return path_prefix,path

    def addParticleGroup(self,particleGroup):
        """[summary]

        :param particleGroup: [description]
        :type particleGroup: [type]
        :return: [description]
        :rtype: [type]
        """

        """
        Adds a particle group to the Reader instance and adds that particle group's
        settings to the attached Settings instance.
        Input:
            particleGroup - the particle group in question that you would like to add
        """
        

        ## data validation of new ParticleGroup happened in its initialization
        self.particleGroups = np.append(
            self.particleGroups,
            [particleGroup],axis=0)

        ## add this particle group to the reader's settings file
        self.settings.addToSettings(particleGroup)

        return self.particleGroups
    
    def dumpToJSON(
        self,
        loud=0,
        write_jsons_to_disk=True):
        """[summary]

        :param loud: [description], defaults to 0
        :type loud: int, optional
        :param write_jsons_to_disk: [description], defaults to True
        :type write_jsons_to_disk: bool, optional
        :return: [description]
        :rtype: [type]
        """

        """
        Creates all the necessary JSON files to run Firefly, making sure they are
        properly linked and cross-reference correctly, using the attached Settings
        instance's and particleGroups' outputToJSON() methods.
        Input:
            loud=0 - flag for whether warnings within each outputToJSON should be shown
        """
        

        ## handle JSON dir stuff
        if write_jsons_to_disk:
            if not os.path.isdir(self.JSONdir):
                os.makedirs(self.JSONdir)

            if self.needs_link:
                try:
                    ## create a symlink so that data can 
                    ##  be read from a "sub-directory"
                    os.symlink(
                        self.JSONdir,
                        os.path.join(
                            self.DATA_dir,
                            self.path))

                except FileExistsError:
                    ## remove the existing symlink
                    os.unlink(
                        os.path.join(
                            self.DATA_dir,
                            self.path))

                    ## create a symlink so that data can 
                    ##  be read from a "sub-directory"
                    os.symlink(
                        self.JSONdir,
                        os.path.join(
                            self.DATA_dir,
                            self.path))


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

        ## output the settings.json file
        JSON_array +=[self.settings.outputToJSON(
            self.JSONdir,
            prefix=self.prefix,
            loud=loud,
            write_jsons_to_disk=write_jsons_to_disk)]

        ## format and output the filenames.json file
        filenamesDict['options'] = [(os.path.join(self.path,self.prefix+self.settings.settings_filename),0)]

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
        """[summary]

        :return: [description]
        :rtype: [type]
        """

        """
        Formats the data in the reader to a python dictionary,
        using the attached Settings
        instance's and particleGroups' outputToDict() methods.
        """
        

        outputDict = {}
        outputDict['parts'] = {}

        ## create each particleGroup's dictionary using their own method
        for particleGroup in self.particleGroups:
            outputDict['parts'][particleGroup.UIname] = particleGroup.outputToDict()

        ## store the settings file in the output dictionary
        outputDict['options'] = self.settings.outputToDict()

        return outputDict

    def sendDataViaFlask(self,port=5000):
        """[summary]

        :param port: [description], defaults to 5000
        :type port: int, optional
        """


        ## retrieve a single "big JSON" of all the mini-JSON 
        ##  sub-files. 
        if not hasattr(self,'JSON') or self.JSON is None:
            self.dumpToJSON(
                loud=False,
                write_jsons_to_disk=False)

        ## post the json to the listening url data_input
        ##  defined in server.py
        print("posting...",end='')
        requests.post(
            f'http://localhost:{port:d}/data_input',
            json=self.JSON)
        print("data posted!")

class SimpleReader(Reader):
    """[summary]

    :param Reader: [description]
    :type Reader: [type]
    """

    def __init__(
        self,
        path_to_data,
        write_jsons_to_disk=True,
        decimation_factor=1,
        extension='.hdf5',
        **kwargs):
        """[summary]

        :param path_to_data: [description]
        :type path_to_data: [type]
        :param write_jsons_to_disk: [description], defaults to True
        :type write_jsons_to_disk: bool, optional
        :param decimation_factor: [description], defaults to 1
        :type decimation_factor: int, optional
        :param extension: [description], defaults to '.hdf5'
        :type extension: str, optional
        :raises ValueError: [description]
        :raises ValueError: [description]
        :raises ValueError: [description]
        """

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

        if extension in path_to_data:
            ## path_to_data points directly to a single .hdf5 file
            fnames = [path_to_data]

        elif os.path.isdir(path_to_data):
            ## path_to_data points to a directory containing .hdf5 data files

            fnames = []
            for this_fname in os.listdir(path_to_data):
                if extension in this_fname:
                    fnames += [os.path.join(path_to_data,this_fname)]
        else:
            raise ValueError(
                "%s needs to point to an %s file or "%(path_to_data,extension)+
                "a directory containing %s files."%extension)

        if extension == '.hdf5':
            ## take the contents of the "first" file to define particle groups and keys
            with h5py.File(fnames[0],'r') as handle:
                particle_groups = list(handle.keys())

            ## Gadget data has a header as well as particle groups
            ##  so we need to ignore it
            if 'Header' in particle_groups:
                particle_groups.pop(particle_groups.index("Header"))
        elif extension == '.csv':
            particle_groups = [fname.replace(extension,'').split(os.sep)[-1] for fname in fnames]
        else:
            raise ValueError("Invalid extension %s, must be .hdf5 or .csv"%extension) 

        print("Opening %d files and %d particle types..."%(len(fnames),len(particle_groups)))

        ## create a default reader instance
        super().__init__(**kwargs)
        for i,particle_group in enumerate(particle_groups):
            coordinates = None
            if extension == '.hdf5':
                ## need to loop through each file and get the matching coordinates, 
                ##  concatenating them.
                for fname in fnames:
                   coordinates = getHDF5Coordinates(fname,particle_group,coordinates) 
            elif extension == '.csv':
                ## each file corresponds to a single set of coordinates
                coordinates = getCSVCoordinates(fnames[i]) 
            else:
                raise ValueError("Invalid extension %s, must be .hdf5 or .csv"%extension) 


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

def getCSVCoordinates(fname):
    """[summary]

    :param fname: [description]
    :type fname: [type]
    :return: [description]
    :rtype: [type]
    """
    full_df = pd.read_csv(fname,sep=' ')
    coordinates = np.empty((full_df.shape[0],3))

    if 'x' in full_df and 'y' in full_df and 'z' in full_df:
        coordinates[:,0] = full_df['x']
        coordinates[:,1] = full_df['y']
        coordinates[:,2] = full_df['z']
    else:
        coordinates[:,0] = full_df.iloc[:,0]
        coordinates[:,1] = full_df.iloc[:,1]
        coordinates[:,2] = full_df.iloc[:,2]

    return coordinates

def getHDF5Coordinates(fname,particle_group,coordinates=None):
    """[summary]

    :param fname: [description]
    :type fname: [type]
    :param particle_group: [description]
    :type particle_group: [type]
    :param coordinates: [description], defaults to None
    :type coordinates: [type], optional
    :return: [description]
    :rtype: [type]
    """
    with h5py.File(fname,'r') as handle:
        ## (re)-initialize the coordinate array
        if coordinates is None:
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

    return coordinates

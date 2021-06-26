from __future__ import print_function

import h5py
import os 
import shutil 
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
        JSON_prefix = 'Data',
        JSONdir = None, 
        clean_JSONdir = False,
        max_npart_per_file = 10**4,
        write_startup = 'append',# True -> write | False -> leave alone | "append" -> adds to existing file
        settings = None,
        tweenParams = None):
        """[summary]

        :param JSON_prefix: Prefix for any :code:`.json` files created, :code:`.json` files will be of the format:
            :code:`<JSON_prefix><parttype>_%d.json`, defaults to 'Data'
        :type JSON_prefix: str, optional
        :param JSONdir: the sub-directory that will contain your JSON files, relative
            to your :code:`$HOME directory`. , defaults to :code:`$HOME/<JSON_prefix>`
        :type JSONdir: str, optional
        :param clean_JSONdir: flag to delete all :code:`.json` files in
            the :code:`JSONdir`. Strictly not necessary (since :code:`filenames.json` 
            will be updated) but it is good to clean up after yourself., defaults to False
        :type clean_JSONdir: bool, optional
        :param max_npart_per_file: the maximum number of particles saved per :code:`.json` file,
            don't use too large a number or you will have trouble loading
            the individual files in., defaults to 10**4
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

        ## where will firefly look for jsons
        ##  we're in data_reader, so let's steal the 
        ##  path from there
        self.static_data_dir = os.path.abspath(
            os.path.join(
                os.path.realpath(__file__),
                '..', '..', 'static', 'data'))

        if JSONdir is None:
            ## default to saving directly into the Firefly directory
            FireflyMessage("JSONdir is None, defaulting to %s/%s"%(self.static_data_dir,JSON_prefix))
            JSONdir = os.path.join(
                self.static_data_dir,
                JSON_prefix)
        elif JSONdir[:1] != os.sep:
            ## JSONdir is a relative path. 
            ##  Let's assume they want to save w.r.t. their home directory?
            JSONdir = os.path.join(os.environ['HOME'],JSONdir)
        if JSONdir[-1:]==os.sep:
            ## get rid of the trailing '/' if it's there
            JSONdir=JSONdir[:-1]

        self.JSONdir = JSONdir

        ## determine whether the directory we're saving the
        ##  actual data in is a sub-directory of Firefly/static/data.
        ##  if not, set self.needs_soft_link = True
        ##  hard_data_path is where the JSONs *actually* live on disk
        ##  short_data_path is the name of the directory in Firefly/static/data
        ##  that the JSONs will live in (either on disk or by symlink)
        self.hard_data_path,self.short_data_path = self.__splitAndValidateDatadir()

        ## how are we managing multiple datasets?
        self.write_startup = write_startup

        #set the maximum number of particles per data file
        self.max_npart_per_file = max_npart_per_file

        ## JSON_prefix for the datafiles e.g. Data 
        self.JSON_prefix = JSON_prefix

        #remove existing data files in the JSONdir before adding more?
        self.clean_JSONdir = clean_JSONdir 
    
        ## array of particle groups
        self.particleGroups = []

        if settings is not None:
            if settings.__class__.__name__ != 'Settings':
                ## fun fact, assert isinstance(settings,Settings) won't work with jupyter notebooks
                ##  that use %load_ext autoreload
                raise TypeError("Make sure you use a Settings instance to specify Firefly settings.")
        else:
            ## we'll use the default ones then
            settings = Settings()

        self.settings = settings

        if tweenParams is not None:
            if tweenParams.__class__.__name__ != 'TweenParams':
                raise TypeError("Make sure you use a TweenParams instance to specify fly-through paths.")

        self.tweenParams = tweenParams

    def __splitAndValidateDatadir(self,loud=True):
        """[summary]

        :param loud: [description], defaults to True
        :type loud: bool, optional
        :return: [description]
        :rtype: [type]
        """

        """
        Ensures that files will be output to a location that Firefly 
        can read, as well as splits the path so that filenames.json 
        references files correctly.
        """
        
        hard_data_path,short_data_path = os.path.split(self.JSONdir)

        self.needs_soft_link = False
        for validate in ['index.html','static']:
            if validate not in os.listdir(
                os.path.join(hard_data_path,"..","..")):

                if loud:
                    warnings.warn(FireflyWarning(
                        "JSONdir: {} -- ".format(self.JSONdir)+
                        "is not a sub-directory of Firefly/static/data. "+
                        "\nThis may produce confusing or inoperable results. "+
                        "As such, we will create a symlink for you when you "+
                        " dumpToJSON."))

                self.needs_soft_link = True
                break

        return hard_data_path,short_data_path

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
        write_jsons_to_disk=True,
        symlink=True):
        """[summary]

        :param loud: [description], defaults to 0
        :type loud: int, optional
        :param write_jsons_to_disk: [description], defaults to True
        :type write_jsons_to_disk: bool, optional
        :param symlink: [description], defaults to True
        :type symlink: bool, optional
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
        
        ## put the hard JSON files where we're asked to by default
        static_data_path = os.path.join(
            self.static_data_dir,
            self.short_data_path)

        JSONdir = self.JSONdir if symlink else static_data_path

        if not symlink:
            ## we've been asked to ignore the request to put the
            ##  hard files in self.JSONdir and instead actually put them in 
            ##  Firefly/static/data/<short_data_path>
            FireflyMessage(
                "Outputting files to: %s instead of: %s as originally specified."%(
                    static_data_path,
                    self.JSONdir))

        ## if we don't actually want to write to disk then we don't need
        ##  to do any filesystem tasks
        if write_jsons_to_disk:
            ## make the output directory
            if not os.path.isdir(JSONdir):
                os.makedirs(JSONdir)

            ## soft link between the "hard" data and Firefly/static/data
            ##  Firefly can be run locally
            if self.needs_soft_link and symlink:
                try:
                    ## create a symlink so that data can 
                    ##  be read from a "sub-directory"
                    os.symlink(JSONdir,static_data_path)

                except FileExistsError:
                    try:
                        ## remove the existing symlink
                        os.unlink(static_data_path)
                    except PermissionError as e:
                        print(e)
                        raise ## TODO: make a check here that the issue is hard vs. soft and not like, 
                        ## an actual permission error that should be respected

                        ## trying to unlink a hard directory
                        ##  raises a PermissionError, for some reason
                        shutil.rmtree(static_data_path)

                    ## create a symlink so that data can 
                    ##  be read from a "sub-directory"
                    os.symlink(JSONdir,static_data_path) 

        ## initialize an output array to contain all the jsons and their names
        JSON_array = []

        ## write each particleGroup to JSON using their own method
        ##  and save the filenames into a dictionary for filenames.json
        filenamesDict = {}
        for particleGroup in self.particleGroups:
            FireflyMessage("outputting:",particleGroup)
            ## append the JSON arrays for this particle group
            this_JSON_array,filenames_and_nparts = particleGroup.outputToJSON(
                self.short_data_path,
                self.hard_data_path,
                self.JSON_prefix,
                loud=loud,
                nparts_per_file=self.max_npart_per_file,
                clean=self.clean_JSONdir if particleGroup is self.particleGroups[0] else False,
                write_jsons_to_disk=write_jsons_to_disk)

            JSON_array += this_JSON_array

            filenamesDict[particleGroup.UIname]=list(filenames_and_nparts)

        ## output the settings.json file
        JSON_array +=[self.settings.outputToJSON(
            JSONdir,
            JSON_prefix=self.JSON_prefix,
            loud=loud,
            write_jsons_to_disk=write_jsons_to_disk)]

        ## format and output the filenames.json file
        filenamesDict['options'] = [(os.path.join(self.short_data_path,self.JSON_prefix+self.settings.settings_filename),0)]

        filename=os.path.join(JSONdir,'filenames.json')
        JSON_array +=[(
            filename,
            write_to_json(
                filenamesDict,
                filename if write_jsons_to_disk else None))] ## None -> returns JSON string

        ## handle the startup.json file, may need to append or totally overwrite
        startup_file = os.path.join(
            self.static_data_dir,
            'startup.json')

        ## relative path from .js interpreter (which runs in /Firefly/static) 
        ##  to this dataset
        startup_path = os.path.join("data",self.short_data_path)

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
                os.path.join(self.static_data_dir,'startup.json'), 
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
                JSONdir,
                JSON_prefix=self.JSON_prefix,
                loud=loud,
                write_jsons_to_disk=write_jsons_to_disk)] ## None -> returns JSON string

        if not write_jsons_to_disk:
            ## create a single "big JSON" with all the data in it in case
            ##  we want to send dataViaFlask
            JSON_dict = dict(JSON_array)
            self.JSON = write_to_json(JSON_dict,None)
            self.JSON_dict = JSON_dict
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

    def copyFireflySourceToTarget(
        self,
        target=None,
        flask_templates=False,
        dump_data=True,
        overwrite=True):
        """[summary]

        :param target: [description], defaults to None
        :type target: [type], optional
        :param flask_templates: [description], defaults to False
        :type flask_templates: bool, optional
        :param dump_data: [description], defaults to True
        :type dump_data: bool, optional
        :param overwrite: [description], defaults to True
        :type overwrite: bool, optional
        """

        ## handle default argument(s)
        if target is None: target = os.path.join(os.environ['HOME'],'Firefly')

        if not os.path.isdir(target): 
            ## create the directory because it doesn't exist
            os.makedirs(target)
        elif overwrite:
            ## purge the old
            shutil.rmtree(target)
            ## replace with the new
            os.makedirs(target)

        ## identify source directory
        src = os.path.abspath(os.path.join(
            os.path.dirname(__file__),
            ".."))

        ## copy the index.html file
        shutil.copy(
            os.path.join(src,'index.html'),
            target)
        
        ## copy the flask templates if requested
        ##  in case someone wants to run flask from
        ##  this directory rather than "just" host on 
        ##  the web
        if flask_templates:
            shutil.copytree(
                os.path.join(src,'templates'),
                os.path.join(target,'templates'))
        
        for obj in os.listdir(os.path.join(src,'static')):
            this_target = os.path.join(target,'static',obj)
            if not os.path.isdir(this_target):
                if obj == 'data':
                    ## make an empty data directory rather than copy
                    ##  whatever jsons happen to be there
                    os.mkdir(this_target) 
                else:
                    ## copy the source files
                    shutil.copytree(
                        os.path.join(src,'static',obj),
                        this_target)

        if dump_data:
            try:
                ## stash the old stat_data_dir
                old = self.static_data_dir

                ## dump to this dummy target
                self.hard_data_path = self.static_data_dir = os.path.join(target,'static','data')


                if not os.path.isdir(self.static_data_dir): os.makedirs(self.static_data_dir)
                self.dumpToJSON(symlink=False)
            except:
                raise
            finally:
                ## replace the old stat_data_dir
                self.static_data_dir = old
                self.hard_data_path,self.short_data_path = self.__splitAndValidateDatadir()


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

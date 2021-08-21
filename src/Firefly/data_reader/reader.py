import h5py
import os 
import shutil 
import subprocess
import pandas as pd
import requests
import numpy as np

from .settings import Settings
from .tween import TweenParams
from .particlegroup import ParticleGroup
from .json_utils import write_to_json,load_from_json

class Reader(object):
    """ This class provides a framework to unify the Settings and ParticleGroup classes
    to make sure that the user can easily produce Firefly compatible files. 
    You should use this Reader as a base class for any custom readers you may build
    (see :class:`Firefly.data_reader.SimpleReader` or :class:`Firefly.data_reader.FIREreader` for example).
    """

    def __repr__(self):
        """Implementation of builtin function __repr__

        :return: mystr, the pretty rendering of a reader
        :rtype: str
        """

        my_str = str(self.__class__).split('.')[-1].replace("'>","")

        my_str += " with %d particle groups" % len(self.particleGroups)

        return my_str
    
    def __init__(
        self,
        JSONdir=None, 
        JSON_prefix='Data',
        clean_JSONdir=False,
        max_npart_per_file=10**4,
        write_startup='append',
        settings=None,
        tweenParams=None):
        """Base initialization method for Reader instances. A Reader will read data and produce
            Firefly compatible :code:`.json` files. 

        :param JSONdir: the sub-directory that will contain your JSON files, relative
            to your :code:`$HOME directory`. , defaults to :code:`$HOME/<JSON_prefix>`
        :type JSONdir: str, optional
        :param JSON_prefix: Prefix for any :code:`.json` files created, :code:`.json` files will be of the format:
            :code:`<JSON_prefix><parttype>_%d.json`, defaults to 'Data'
        :type JSON_prefix: str, optional
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
            print("JSONdir is None, defaulting to %s/%s"%(self.static_data_dir,JSON_prefix))
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
        self.__splitAndValidateDatadir()

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

        :param loud: flag to print status information to the console, defaults to False
        :type loud: bool, optional
        :return: [description]
        :rtype: [type]
        """

        """
        Ensures that files will be output to a location that Firefly 
        can read, as well as splits the path so that filenames.json 
        references files correctly.
        """
        
        ## split the JSON directory path into the folder 
        ##  that will actually contain the JSON files and the path leading 
        ##  to it. 
        hard_data_path,short_data_path = os.path.split(self.JSONdir)

        ## determine if we will need to soft link this data or if 
        ##  it was saved to some kind of self.static_data_dir (whether this one
        ##  or another).
        self.needs_soft_link = False
        for validate in ['index.html','static']:
            if validate not in os.listdir(
                os.path.join(hard_data_path,"..","..")):

                if loud:
                    print( "JSONdir: {} -- ".format(self.JSONdir)+
                        "is not a sub-directory of Firefly/static/data. "+
                        "\nThis may produce confusing or inoperable results. "+
                        "As such, we will create a symlink for you when you "+
                        " dumpToJSON.")

                self.needs_soft_link = True
                break

        return hard_data_path,short_data_path

    def addParticleGroup(self,particleGroup):
        """ Track a new :class:`~Firefly.data_reader.ParticleGroup` instance in 
            this :class:`Firefly.data_reader.Reader` instance's :code:`particleGroups` array
            and to the attached :class:`Firefly.data_reader.Settings` instance.

        :param particleGroup: a :class:`~Firefly.data_reader.ParticleGroup` instance
            that contains particle data for an individual UI element.
        :type particleGroup: :class:`Firefly.data_reader.ParticleGroup`
        """

        ## data validation of new ParticleGroup happened in its initialization
        self.particleGroups = np.append(
            self.particleGroups,
            [particleGroup],axis=0)

        ## add this particle group to the reader's settings file
        self.settings.attachSettings(particleGroup)

    def dumpToJSON(
        self,
        loud=False,
        write_jsons_to_disk=True,
        symlink=True):
        """Creates all the necessary JSON files to run Firefly and ensures they are
        properly linked and cross-referenced correctly using the
        :func:`Firefly.data_reader.Settings.outputToJSON` and
        :func:`Firefly.data_reader.ParticleGroup.outputToJSON` methods
        (and :func:`Firefly.data_reader.TweenParams.outputToJSON` if one is attached).
        :param loud: flag to print status information to the console, defaults to False
        :type loud: bool, optional
        :param write_jsons_to_disk: flag that controls whether data is saved to disk (:code:`True`) 
            or only converted to a string and stored in :code:`self.JSON` (:code:`False`), defaults to True
        :type write_jsons_to_disk: bool, optional
        :param symlink: flag for whether a soft link should be created between where the data is stored on 
            disk and the :code:`self.static_data_dir` directory (:code:`True`) or whether it should be 
            saved directly to :code:`self.static_data_dir` directory (:code:`False`). 
            Note that :code:`symlink=False` will not _also_ save results in :code:`self.JSONdir`, defaults to True
        :type symlink: bool, optional
        :return: :code:`self.JSON` or :code:`""` according to :code:`write_jsons_to_disk`
        :rtype: str
        """
        
        ## path where data needs to be visible to Firefly
        static_data_path = os.path.join(
            self.static_data_dir,
            os.path.basename(self.JSONdir))

        ## where to put hard JSON files, if no symlink then we will
        ##  need to save directly to static_data_path
        JSONdir = self.JSONdir if symlink else static_data_path

        if not symlink:
            ## we've been asked to ignore the request to put the
            ##  hard files in self.JSONdir and instead actually put them in 
            ##  Firefly/static/data/<short_data_path>
            if loud:
                print("Outputting files to: %s instead of: %s as originally specified."%(
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
                    if os.path.islink(static_data_path):
                        ## remove the existing symlink
                        os.unlink(static_data_path)
                    elif os.path.isdir(static_data_path):
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
            if loud:
                print("Outputting:",particleGroup)

            this_JSON_array,filenames_and_nparts = particleGroup.outputToJSON(
                os.path.basename(JSONdir),
                os.path.dirname(JSONdir),
                self.JSON_prefix,
                loud=loud,
                nparts_per_file=self.max_npart_per_file,
                clean_JSONdir=self.clean_JSONdir if particleGroup is self.particleGroups[0] else False,
                write_jsons_to_disk=write_jsons_to_disk,
                not_reader=False)

            ## append the JSON arrays for this particle group
            JSON_array += this_JSON_array

            filenamesDict[particleGroup.UIname]=list(filenames_and_nparts)

        ## output the settings.json file
        JSON_array +=[self.settings.outputToJSON(
            JSONdir,
            JSON_prefix=self.JSON_prefix,
            loud=loud,
            write_jsons_to_disk=write_jsons_to_disk,
            not_reader=False)]

        ## format and output the filenames.json file
        filenamesDict['options'] = [(os.path.join(
            os.path.basename(JSONdir),
            self.JSON_prefix+self.settings.settings_filename),0)]

        filename=os.path.join(JSONdir,'filenames.json')
        JSON_array +=[(
            filename,
            write_to_json(
                filenamesDict,
                filename if write_jsons_to_disk else None))] ## None -> returns JSON string

        ## write a tweenParams file if a TweenParams instance is attached to reader
        if hasattr(self,'tweenParams') and self.tweenParams is not None:
            JSON_array+=[self.tweenParams.outputToJSON(
                JSONdir,
                JSON_prefix=self.JSON_prefix,
                loud=loud,
                write_jsons_to_disk=write_jsons_to_disk,
                not_reader=False)] ## None -> returns JSON string

        ## handle the startup.json file, may need to append or totally overwrite
        startup_file = os.path.join(
            self.static_data_dir,
            'startup.json')

        ## relative path from .js interpreter (which runs in /Firefly/static) 
        ##  to this dataset
        startup_path = os.path.join("data",os.path.basename(JSONdir))

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

        if not write_jsons_to_disk:
            ## create a single "big JSON" with all the data in it in case
            ##  we want to send dataViaFlask
            JSON_dict = dict(JSON_array)
            self.JSON = write_to_json(JSON_dict,None)
            self.JSON_dict = JSON_dict
        else:
            ## we wrote all the little JSONs to disk individually already
            ##  so we won't store a single big JSON
            ##  since we only have None's in there anyway
            self.JSON = ""

        return self.JSON

    def outputToDict(self):
        """ Formats the data in the reader to a python dictionary using
            the attached
            :func:`Firefly.data_reader.Settings.outputToDict` and
            :func:`Firefly.data_reader.ParticleGroup.outputToDict` methods
            (and :func:`Firefly.data_reader.TweenParams.outputToDict` if one is attached).

        :return: :code:`outputDict`, a dictionary structured like the javascript object in
            the Firefly webapp. Can be sent to the js interpreter via Flask using the
            :func:`Firefly.data_reader.Reader.sendDataViaFlask` method.
        :rtype: dict
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
        """ Exports the data as if it were being dumped to disk
            but instead stores it as a string. Then feeds this string
            to the js interpreter via Flask.

        :param port: port that the Firefly Flask server is being hosted on,
            defaults to 5000
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
        print("Posting...",end='')
        requests.post(
            f'http://localhost:{port:d}/data_input',
            json=self.JSON)
        print("data posted!")

    def copyFireflySourceToTarget(
        self,
        target=None,
        flask_templates=False,
        dump_data=True,
        overwrite=True,
        init_gh_pages=False,
        GHREPONAME=None,
        GHUSER=None,
        GHOAUTHTOKENPATH=None):
        """ Copies the necessary source files to run a stand-alone instance of Firefly
            on the web. Optionally, will also initialize a new GitHub repository with 
            GitHub pages, a free web-hosting service, so that this stand-alone instance 
            can be accessed by anyone over the internet.

        :param target: target directory to save Firefly source files to,
            defaults to :code:`$HOME/my_Firefly`
        :type target: str, optional
        :param flask_templates: flag for whether the flask template files should also be
            copied. In general, these files are not required to run Firefly over the internet
            but may be useful if one intends to run Firefly locally in this new directory,
            defaults to False
        :type flask_templates: bool, optional
        :param dump_data: flag for whether the data stored in this reader should also be saved
            to this new stand-alone Firefly directory (vs. only the Firefly source files), defaults to True
        :type dump_data: bool, optional
        :param overwrite: flag for whether the existing target directory should be purged
            before anything is copied over or written to disk, defaults to True
        :type overwrite: bool, optional
        :param init_gh_pages: flag to run :code:`Firefly/bin/make_new_repo.sh` in an attempt to initialize
            a new github repository with GitHub Pages, a free web-hosting service provided by GitHub, enabled,
            defaults to False
        :type init_gh_pages: bool, optional
        :param GHREPONAME: repository name that we should attempt to create (note that a non-critical error will be raised
            if the repo already exists), defaults to the last sub-directory of :code:`target`
        :type GHREPONAME: str, optional
        :param GHUSER: GitHub username, defaults to :code:`$USER`
        :type GHUSER: str, optional
        :param GHOAUTHTOKENPATH: filepath to a file containing only the OAUTH token generated at:
            https://github.com/settings/tokens, defaults to :code:`$HOME/.github.token`
        :type GHOAUTHTOKENPATH: str, optional
        :raises FileNotFoundError: if :code:`GHOAUTHTOKENPATH` cannot be resolved
        :raises FileNotFoundError: if :code:`Firefly/bin/make_new_repo.sh` cannot be found.
        :return: returns a list of strings, :code:`[target]` if :code:`init_git_pages=False` otherwise
            the output of running :code:`Firefly/bin/make_new_repo.sh`.
        :rtype: list of str
        """

        ## handle default argument(s)
        if target is None: target = os.path.join(os.environ['HOME'],'my_Firefly')
        elif target[:1] != os.sep: target = os.path.join(os.environ['HOME'],target)

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
                self.static_data_dir = os.path.join(target,'static','data')

                if not os.path.isdir(self.static_data_dir): os.makedirs(self.static_data_dir)
                self.dumpToJSON(symlink=False)
            except:
                raise
            finally:
                ## replace the old stat_data_dir
                self.static_data_dir = old

        ## attempts to initialize a github pages site in order to 
        ##  host this copied version of Firefly on the web.
        if not init_gh_pages:
            return [target]
        else:
            
            ## default GHREPONAME to the directory name of the target
            if GHREPONAME is None: GHREPONAME = os.path.split(target)[-1]

            ## default GHOAUTHOTOKENPATH to ~/.github.token (my arbitrary choice)
            if GHOAUTHTOKENPATH is None: GHOAUTHTOKENPATH = '.github.token'

            ## if we were passed a relative path prepend the $HOME path
            if GHOAUTHTOKENPATH[:1] !=  os.sep: GHOAUTHTOKENPATH = os.path.join(
                os.environ['HOME'],
                GHOAUTHTOKENPATH)

            ## default to the current user name
            if GHUSER is None: GHUSER = os.environ['USER']

            if not os.path.isfile(GHOAUTHTOKENPATH):
                raise FileNotFoundError(f"No OAUTH token file matching {GHOAUTHTOKENPATH}, generate one from"+
                " https://github.com/settings/tokens and write it to disk somewhere.")

            print(f"Initializing a new GitHub repository at {target} with\n" + 
                f"\tGHREPONAME: {GHREPONAME}\n" + 
                f"\tGHUSER: {GHUSER}\n" + 
                f"\tGHOAUTHTOKENPATH: {GHOAUTHTOKENPATH}\n")

            ## check if the executable exists
            executable = os.path.abspath(
                os.path.join(
                    self.static_data_dir,
                    '..','..','bin','make_new_repo.sh'))
            
            if not os.path.isfile(executable):
                raise FileNotFoundError("Missing make_new_repo.sh executable, cannot initialize a new repository.")
            
            ## stash the current directory
            old = os.getcwd()
            try:
                ## move to the target directory
                os.chdir(target)
                ## intialize the github repo
                lines = subprocess.check_output(
                    ["bash",executable,GHREPONAME,GHUSER,GHOAUTHTOKENPATH])
                lines = lines.decode("utf-8").split("\n")
                return lines
            except:
                ## raise any error that might've come up
                raise
            finally:
                ## move back to the current directory
                os.chdir(old)
    
class ArrayReader(Reader):
    """A wrapper to :class:`Firefly.data_reader.Reader` that stores 
        raw numpy array data without opening anything from disk.
    """

    def __init__(
        self,
        coordinates,
        UInames=None,
        fields=None,
        field_names=None,
        decimation_factor=1,
        write_jsons_to_disk=True,
        loud=True,
        **kwargs):
        """Takes a list of opened numpy arrays and creates a :class:`Firefly.data_reader.Reader` instance
            with their data. Takes :class:`Firefly.data_reader.Reader` passthrough kwargs.

        :param coordinates: raw coordinate data, ignores path_to_data if passed.
            Can either pass N,3 np.array which is interpreted as a single particle group's 
            coordinates or a jagged (M,N_m,3) list of np.arrays which is interpreted as M many 
            particle groups with each having N_m particles
        :type coordinates: list, optional
        :param UInames: list of particle group UInames
        :type UInames: list of str
        :param fields: list of field arrays corresponding to each point of the coordinate data, 
            Can pass:
            length N np.array which is interpreted as a single particle group's field,
            (N_m,N_f) list which is interpreted as a single particle group's fields,
            or a jagged (M,N_m,N_f) list of np.arrays which is interpreted as M many 
            particle groups with each having N_m particles with N_f fields, defaults to []
        :type fields: list of shape (M,N_f,N_m)
        :param field_names: strings to name fields by, defaults to ['field%d' for field in fields]
        :type field_names: list of strs
        :param decimation_factor: factor by which to reduce the data randomly 
            i.e. :code:`data=data[::decimation_factor]`, defaults to 1
        :type decimation_factor: int, optional
        :param write_jsons_to_disk: flag that controls whether data is saved to disk (:code:`True`)
            or only converted to a string and stored in :code:`self.JSON` (:code:`False`), defaults to True
        :type write_jsons_to_disk: bool, optional
        :param loud: flag to print status information to the console, defaults to False
        :type loud: bool, optional
        :raises np.AxisError: if the coordinate data cannot be interpreted
        :raises ValueError: if the number of particle groups does not match the number of
            coordinate arrays
        :raises np.AxisError: if the field data cannot be interpreted
        :raises np.AxisError: if the field names cannot be interpreted
        """

        super().__init__(**kwargs)

        ## wrap coordinate array if necessary
        if len(np.shape(coordinates))==2 and np.shape(coordinates)[-1]==3:
            ## passed a single list of coordinates, prepend an axis for the single group
            coordinates = [coordinates]
        elif len(np.shape(coordinates[0]))==2 and np.shape(coordinates[0])[-1]==3:
            ## passed a jagged array of different coordinates
            pass
        else:
            raise np.AxisError("Uninterpretable coordinate array, either pass a single (N,3) array"+ 
                " or a jagged list of 'shape' (M,N_m,3)")

        ngroups = len(coordinates)
        npartss = np.array([len(coords) for coords in coordinates])
        
        ## check fields and wrap a single field for a single particle group
        fielderror = np.AxisError("Uninterpretable field array, either pass a single N array"
                        " or a jagged list of 'shape' (M,N_fm,N_pm)")
        if fields is not None:
            ## special case and want to allow convenient/inconsistent syntax,
            ##  so let's just handle it independently
            if ngroups == 1:
                if type(fields) != dict and type(fields[0]) != dict:
                    try: fields = np.reshape(fields,(1,-1,npartss[0]))
                    except: raise fielderror
            else:
                ## is everything square? unlikely but you know one can dream
                try: fields = np.reshape(fields,(ngroups,-1,npartss[0]))
                except:
                    ## yeah okay i didn't think that was gonna work anyway
                    ##  let's build up a jagged list
                    temp_fields = []

                    ## first check that we have enough fields for each group
                    if len(fields) != ngroups: raise fielderror

                    ## okay, we've got something to work with
                    try:
                        ## this should work *if* users passed correctly formatted input
                        for igroup in range(ngroups):
                            this_fields = fields[igroup]
                            ## if this_fields is a dictionary it will be understood by ParticleGroup below
                            if type(this_fields) != dict: np.reshape(this_fields,(-1,npartss[igroup]))
                            temp_fields.append(this_fields)
                    ## go read the documentation!
                    except: raise fielderror

                    ## swap the variable names
                    fields = temp_fields

            nfieldss = [len(this_fields) for this_fields in fields]

        ## check field names and generate them if necessary
        fieldnameerror = np.AxisError("Uninterpretable field array, either pass a single N array"+
            " or a jagged list of 'shape' (M,N_fm,N_pm)")

        if field_names is not None: 
            ## special case and want to allow convenient/inconsistent syntax,
            ##  so let's just handle it independently
            if ngroups == 1: 
                try: field_names = np.array(field_names).reshape(ngroups,nfieldss[0]).tolist()
                except: raise fieldnameerror
            else:
                for igroup in range(ngroups):
                    if len(field_names[igroup]) != nfieldss[igroup]: raise fieldnameerror

        ## so some fields were passed but not field_names
        elif fields is not None:
            field_names = []
            for igroup in range(ngroups):
                ## field names will be extracted from dictionary in ParticleGroup initialization
                these_names = (["field%d"%j for j in range(nfieldss[igroup])] if
                    type(fields[0]) != dict else None)
                field_names.append(these_names)

        ## initialize default particle group names
        if UInames is None: UInames = ['PGroup_%d'%i for i in range(len(coordinates))]
        elif len(UInames) != len(coordinates): 
            raise ValueError("%d UInames does not match passed"+
            " number of %d coordinate arrays"%(len(UInames),len(coordinates)))

        ## loop through each of the particle groups
        for i,(coords,UIname) in enumerate(zip(coordinates,UInames)):

            ## initialize a firefly particle group instance
            firefly_particleGroup = ParticleGroup(
                UIname,
                coords,
                decimation_factor=decimation_factor,
                tracked_arrays=None if fields is None else fields[i],
                tracked_names=None if field_names is None else field_names[i])

            ## attach the instance to the reader
            self.addParticleGroup(firefly_particleGroup)

        ## either write a bunch of mini JSONs to disk or store 
        ##  a single big JSON in self.JSON
        self.dumpToJSON(
            write_jsons_to_disk=write_jsons_to_disk,
            loud=loud)

class SimpleReader(ArrayReader):
    """ A wrapper to :class:`Firefly.data_reader.ArrayReader` that attempts to 
        flexibily open generically formatetd data with minimal interaction from the user.
    """

    def __init__(
        self,
        path_to_data,
        field_names=None,
        write_jsons_to_disk=True,
        extension='.hdf5',
        loud=True,
        **kwargs):
        """A simple reader that will take as minimal input the path to a 
        (set of) .hdf5 file(s) and extract each top level group's
        'Coordinates' or 'x','y','z' values. Coordinate data must saved either as an (N,3) array 
        or in 3 separate (N,) arrays indexed by x,y, and z. 

        Keyword arguments are passed to the parent :class:`~Firefly.data_reader.Reader`.

        :param path_to_data: path to .hdf5/csv file(s; can be a directory)
        :type path_to_data: str 
        :param field_names: strings to try and extract from .hdf5 file. If file format is .csv then there must be a header row
        :type field_names: list of strs
        :param extension: file extension to attempt to open. 
            Accepts only :code:`'.hdf5'` or :code:`'.csv'`, defaults to '.hdf5'
        :type extension: str, optional
        :param loud: flag to print status information to the console, defaults to False
        :type loud: bool, optional
        :raises ValueError: if :code:`path_to_data` is not a directory or doesn't contain
            :code:`extension`
        :raises ValueError: if :code:`extension` is passed anything either 
            than :code:`'.hdf5'` or :code:`'.csv'`
        :raises ValueError: if particle_groups is not None, extension = .csv, and 
            len(particle_groups) != len(detected filenames in path_to_data)
        """

        if extension in path_to_data:
            ## path_to_data points directly to a single data file
            fnames = [path_to_data]

        elif os.path.isdir(path_to_data):
            ## path_to_data points to a directory containing .hdf5 data files
            fnames = []
            ## gather the individual filenames
            for this_fname in os.listdir(path_to_data):
                if extension in this_fname:
                    fnames += [os.path.join(path_to_data,this_fname)]
        else:
            ## couldn't interpret what we were given
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

        coordss = []

        ## initialize bucket for holding field data
        fieldsss = None if field_names is None else []

        for i,particle_group in enumerate(particle_groups):
            coordinates = None
            fieldss = {}
            if extension == '.hdf5':
                ## need to loop through each file and get the matching coordinates, 
                ##  concatenating them.
                for fname in fnames:
                    coordinates = self.__getHDF5Coordinates(fname,particle_group,coordinates) 
                    fieldss = self.__getHDF5Fields(fname,particle_group,field_names,fieldss) 
            elif extension == '.csv':
                ## each file corresponds to a single set of coordinates and fields
                coordinates = self.__getCSVCoordinates(fnames[i]) 
                fieldss = self.__getCSVFields(fnames[i],field_names) 
            else:
                raise ValueError("Invalid extension %s, must be .hdf5 or .csv"%extension) 
            coordss.append(coordinates)
            if fieldsss is not None: fieldsss.append(fieldss)

        ## create a default reader instance
        super().__init__(
            coordinates=coordss,
            UInames=particle_groups,
            fields=fieldsss,
            write_jsons_to_disk=write_jsons_to_disk,
            loud=loud)

    def __getCSVCoordinates(self,fname):
        """Simple parser for opening a CSV file and extracting
            its coordinates.

        :param fname: full filepath to :code:`.csv` file
        :type fname: str
        :return: :code:`coordinates`
        :rtype: np.ndarray
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

    def __getCSVFields(self,fname,field_names):
        """Use pandas to interpret csv data in order to load field data matching
            field names (field names that are not present are ignored).

        :param fname: full filepath to :code:`.csv` file
        :type fname: str
        :param field_names: strings to try and extract from .csv. There must be a header row
        :type field_names: list of strs
        :return: dictionary of fields and field name pairings
        :rtype: dict if field_names is not None else None
        """

        if field_names is None: return

        fieldss = {}

        ## trust pandas to open the .csv and detect if there's a header \_(ツ)_/
        full_df = pd.read_csv(fname,sep=' ')
        for field_name in field_names:
            if field_name in full_df: fieldss[field_name] = full_df[field_name].to_numpy()
        return fieldss

    def __getHDF5Coordinates(
        self,
        fname,
        particle_group=None,
        coordinates=None): 
        """Simple parser for opening an hdf5 file and extracting
            its coordinates.

        :param fname: full filepath to :code:`.hdf5` file
        :type fname: str
        :param particle_group: :code:`group_name` in the :code:`.hdf5` file
            that contains this particle type's coordinates. If :code:`None`
            then it is assumed the Coordinates dataset is saved at the top level
            of the file, defaults to None
        :type particle_group: str
        :param coordinates: existing coordinate array that should be appended to, defaults to None
        :type coordinates: np.ndarray, optional
        :raises TypeError: if :code:`coordinates` is not of type :code:`np.ndarray`
        :raises np.AxisError: if :code:`coordinates` does not have shape (N,3)
        :return: coordinates, the opened coordinate array from :code:`fname`
        :rtype: np.ndarray
        """

        with h5py.File(fname,'r') as handle:
            ## valide the existing coordinate array or initialize it in the first place
            if coordinates is None:
                coordinates = np.empty((0,3))
            elif type(coordinates)!= np.ndarray:
                raise TypeError("Existing coordinate array must be of type np.ndarry")
            if np.shape(coordinates)[-1] != 3:
                raise np.AxisError("Last axis of existing coordinate array must be of size 3")

            ## open the hdf5 group
            if particle_group is not None:
                h5_group = handle[particle_group]
            else:
                h5_group = handle
            
            if "Coordinates" in h5_group.keys():
                ## append the (N,3) coordinate array
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

    def __getHDF5Fields(self,fname,particle_group,field_names,fieldss):
        """Extracts field data corresponding to particle positions from .hdf5 file
            from particle_group matching field_names (field names that are not present 
            are ignored.)

        :param fname: path to hdf5 data file
        :type fname: str
        :param particle_group: name of hdf5 particle group naming
        :type particle_group: str
        :param field_names: strings to try and extract from .hdf5 file. 
        :type field_names: list of strs
        :param fieldss: dictionary contianing mapping between field_name:field_data
        :type fieldss: dict
        :return: fieldss
        :rtype: dict if field_names is not None else None
        """

        if field_names is None: return

        ## open the hdf5 file and read out field data
        with h5py.File(fname,'r') as handle:
            this_group = handle[particle_group]

            for field_name in field_names:
                ## allow users to pass a single array of fields that not all particle types
                ##  will match
                if field_name in this_group.keys():
                    if field_name in fieldss:
                        ## if it's already there append it
                        fieldss[field_name] = np.append(fieldss[field_name],this_group[field_name])
                    ## initialize it otherwise
                    else: fieldss[field_name] = this_group[field_name]
        return fieldss
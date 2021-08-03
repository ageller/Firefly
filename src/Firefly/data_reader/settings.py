from __future__ import print_function

import numpy as np

import os 

from .json_utils import write_to_json,load_from_json

class Settings(object):
    """This is a class for organizing the various settings you can pass to 
        Firefly to customize how the app is initialized and what features 
        the user has access to. 

        It is easiest to use when instances of Settings are passed to a 
        :class:`Firefly.data_reader.Reader` instance when it is initialized.
    """
    def __getitem__(self,key):
        """Implementation of builtin function  __getitem__

        :param key: key to read
        :type key: str
        :return: attr, the value from the settings dictionary
        :rtype: object
        """
        attr = self.__findWhichSettingsDict(key)
        return getattr(self,attr)[key]
        
    def __setitem__(self,key,value):
        """Implementation of builtin function __setitem__ 

        :param key: key to set
        :type key: str
        :param value: value to set to key
        :type value: object
        """
        attr = self.__findWhichSettingsDict(key)
        ## set that dictonary's value
        getattr(self,attr)[key]=value

    def __findWhichSettingsDict(self,key):
        """ Find which sub-dictionary a key belongs to.

        :param key: key to search for
        :type key: str
        :raises KeyError: if no sub-dictionary matches
        :return: attr
        :rtype: private str
        """
        for attr in self.__dict__.keys():
            if '_settings' in attr:
                obj = getattr(self,attr)

                ## distinguish between methods and private dictionaries
                if type(obj) == dict:
                    if key in obj.keys():
                        return attr

        raise KeyError("Invalid settings key %s"%key)
        
    def printKeys(
        self,
        pattern=None,
        values=True):
        """Prints keys (and optionally their values) to the console in an organized (and pretty) fashion.

        :param pattern: string that settings group must contain to be printed, defaults to None
        :type pattern: str, optional
        :param values: flag to print what the settings are set to, in addition to the key, defaults to True
        :type values: bool, optional
        """
        for attr in self.__dict__.keys():
            if '_settings' in attr:
                obj = getattr(self,attr)
                if type(obj) == dict and (pattern is None or pattern in attr):
                    print('--',
                        attr.replace('_',' ').replace('  ',': '),
                        '--')
                    if values:
                        for key in list(getattr(self,attr).keys()):
                            print(key,self[key],)
                    else:
                        print(list(getattr(self,attr).keys()))
                    print()

    def keys(self):
        """ Returns a list of keys for all the different settings sub-dictionaries """
        this_keys = [] 
        for attr in self.__dict__.keys():
            if '_settings' in attr:
                this_keys += list(getattr(self,attr).keys())
        return this_keys

    def __init__(self,
        settings_filename='Settings.json',
        **kwargs):
        """Base initialization method for Settings instances. A Settings will store
            the app state and produce Firefly compatible :code:`.json` files.

            accepts passthrough kwargs from:

            :func:`Firefly.data_reader.Settings.window_settings`

            :func:`Firefly.data_reader.Settings.UI_settings`

            :func:`Firefly.data_reader.Settings.particle_UI_settings`

            :func:`Firefly.data_reader.Settings.camera_settings`

            :func:`Firefly.data_reader.Settings.startup_settings`

            :func:`Firefly.data_reader.Settings.particle_startup_settings`

            :func:`Firefly.data_reader.Settings.particle_filter_settings`

            :func:`Firefly.data_reader.Settings.particle_colormap_settings`
            

        :param settings_filename: name of settings :code:`.json` file,
            defaults to 'Settings.json'
        :type settings_filename: str, optional
        """

        ## where should this be saved if it's outputToJSON
        self.settings_filename = settings_filename

        ## initialize default settings and apply any passed kwargs
        self.startup_settings(**kwargs)
        self.UI_settings(**kwargs)
        self.window_settings(**kwargs)
        self.camera_settings(**kwargs)
        self.particle_startup_settings(**kwargs)
        self.particle_UI_settings(**kwargs)
        self.particle_filter_settings(**kwargs)
        self.particle_colormap_settings(**kwargs)

    def window_settings(
        self,
        title='Firefly',
        annotation=None,
        showfps=False,
        **extra):
        """Settings that affect the browser window

        :param title: the title of the webpage, shows up in browser tab,
            defaults to 'Firefly'
        :type title: str, optional
        :param annotation: text to include at the top of the
            Firefly window as an annotation, defaults to None
        :type annotation: str, optional
        :param showfps: flag to display the FPS (frames per second) of the 
            Firefly scene, defaults to False
        :type showfps: bool, optional
        """

        self.__window_settings = {
            'title':title, 
            ## used in the web app to check if the settings have been read in
            ##  this should not be modified
            'loaded':True, 
            'annotation':annotation ,
            'showfps':showfps
        }

    def UI_settings(
        self,
        UI=True,
        UIfullscreen=True,
        UIsnapshot=True,
        UIreset=True,
        UIsavePreset=True,
        UIloadNewData=True,
        UIcameraControls=True,
        UIdecimation=True,
        **extra):
        """Flags for enabling different elements of the UI

        :param UI: flag to show the UI as a whole, defaults to True
        :type UI: bool, optional
        :param UIfullscreen: flag to show the fullscreen button, defaults to True
        :type UIfullscreen: bool, optional
        :param UIsnapshot: flag to show the screenshot button, defaults to True
        :type UIsnapshot: bool, optional
        :param UIreset: flag to show the "Default Settings" button, defaults to True
        :type UIreset: bool, optional
        :param UIsavePreset: flag to show the "Save Settings" button, defaults to True
        :type UIsavePreset: bool, optional
        :param UIloadNewData: flag to show the "Load Data" button, defaults to True
        :type UIloadNewData: bool, optional
        :param UIcameraControls: flag to show the camera controls pane, defaults to True
        :type UIcameraControls: bool, optional
        :param UIdecimation: flag to show the decimation slider, defaults to True
        :type UIdecimation: bool, optional
        """

        self.__UI_settings = {
            'UI':UI, 
            'UIfullscreen':UIfullscreen, 
            'UIsnapshot':UIsnapshot, 
            'UIreset':UIreset, 
            'UIsavePreset':UIsavePreset, 
            'UIloadNewData':UIloadNewData, 
            'UIcameraControls':UIcameraControls, 
            'UIdecimation':UIdecimation, 
        }

    def particle_UI_settings(
        self,
        UIparticle=None,
        UIdropdown=None,
        UIcolorPicker=None,
        **extra):
        """Flags that control how the UI for each particle group looks like

        :param UIparticle: do you want to show the particles 
            in the user interface.
            This is a dict with keys of the particle UInames mapped to bools,
            defaults to dict([(UIname,True) for UIname in UInames])
        :type UIparticle: dict of UIname:bool, optional
        :param UIdropdown: do you want to enable the dropdown menus for 
               particles in the user interface.
               This is a dict with keys of the particle UInames mapped to bools,
               defaults to dict([(UIname,True) for UIname in UInames])
        :type UIdropdown: dict of UIname:bool, optional
        :param UIcolorPicker: do you want to allow the user to change the color.
               This is a dict with keys of the particle UInames mapped to bools,
               defaults to dict([(UIname,True) for UIname in UInames])
        :type UIcolorPicker: dict of UIname:bool, optional
        """

        self.__particle_UI_settings = {
            'UIparticle':dict() if UIparticle is None else UIparticle,
            'UIdropdown':dict() if UIdropdown is None else UIdropdown,
            'UIcolorPicker':dict() if UIcolorPicker is None else UIcolorPicker,
        }

    def camera_settings(
        self,
        center=None,
        camera=None,
        cameraRotation=None):
        """Settings that affect the position and orientation of the camera

        :param center: do you want to explicilty define the initial camera focus/
            zero point (if not, the WebGL app will calculate the center as the mean 
            of the coordinates of the first particle set loaded in), defaults to None
        :type center: np.ndarray of shape (3), optional
        :param camera: initial camera location, 
            NOTE: the magnitude must be >0 , defaults to None
        :type camera: np.ndarray of shape (3), optional
        :param cameraRotation: can set camera rotation in units of radians 
            if you want, defaults to None
        :type cameraRotation: np.ndarray of shape (3), optional
        """

        self.__camera_settings = {
            'center':np.zeros(3) if center is None else center, 
            'camera':camera, 
            'cameraRotation':cameraRotation, 
        }

    def startup_settings(
        self,
        maxVrange=2000.,
        startFly=False,
        friction=0.1,
        stereo=False,
        stereoSep=0.06,
        decimate=None,
        start_tween=False,
        **extra):
        """General settings that affect the state app state

        :param maxVrange: maximum range in velocities to use in deciding 
            the length of the velocity vectors (making maxVrange 
            larger will enhance the difference between small and large velocities),
            defaults to 2000.
        :type maxVrange: float, optional
        :param startFly: flag to start in Fly controls
            (if False, then start in the default Trackball controls),
            defaults to False
        :type startFly: bool, optional
        :param friction: set the initial friction for the controls, defaults to 0.1
        :type friction: float, optional
        :param stereo: flag to start in stereo mode, defaults to False
        :type stereo: bool, optional
        :param stereoSep: camera (eye) separation in the stereo 
            mode (should be < 1), defaults to 0.06
        :type stereoSep: float, optional
        :param decimate: set the initial global decimation 
            (e.g, you could load in all the data by setting 
            the :code:`decimation_factor` to 1 for any individual
            :class:`Firefly.data_reader.ParticleGroup`,
            but only _display_ some fraction by setting
            decimate > 1 here).  
            This is a single value (not a dict), defaults to None
        :type decimate: int, optional
        :param start_tween: flag to initialize the Firefly scene in tween mode, 
            requires a valid tweenParams.json file to be present in the JSONdir,
            defaults to False
        :type start_tween: bool, optional
        """

        self.__startup_settings = {
            'maxVrange':maxVrange,
            'startFly':startFly,
            'friction':friction,
            'stereo':stereo,
            'stereoSep':stereoSep,
            'decimate':decimate,
            'start_tween':start_tween
        }
    
    def particle_startup_settings(
        self,
        plotNmax=None,
        showVel=None,
        velType=None,
        color=None,
        sizeMult=None,
        showParts=None,
        **extra):
        """Settings that will define the initial values of the particle UI panes

        :param plotNmax: maximum number of particles to plot 
            This is a dict with keys of the particle UInames mapped to ints,
            defaults to all particles
        :type plotNmax: int, optional
        :param showVel: flag to start showing the velocity vectors
            This is a dict with keys of the particle UInames mapped to bools,
            defaults to dict([(UIname,False) for UIname in UInames])
        :type showVel: dict of UIname:bool, optional
        :param velType: type of velocity vectors to plot.  
            This is a dict with keys of the particle UInames mapped to strs that
            must be one of 'line', 'arrow', or 'triangle',
            defaults to dict([(UIname,'line') for UIname in UInames])
        :type velType: dict of UIname:str, optional
        :param color: the default colors for each particle group, 
            This is a dict with keys of the particle UInames mapped to
            4-element lists of rgba float values,
            defaults to random color with a = 1
        :type color: dict of UIname:list of len = 4, optional
        :param sizeMult: the default point size multiplier.
            This is a dict with keys of the particle UInames mapped to floats,
            defaults to dict([(UIname,1) for UIname in UInames])
        :type sizeMult: dict of UIname:float, optional
        :param showParts: show particles by default.
            This is a dict with keys of the particle UInames mapped to bools,
            defaults to dict([(UIname,True) for UIname in UInames])
        :type showParts: dict of UIname:bool, optional
        """

        self.__particle_startup_settings = {
            'plotNmax':dict() if plotNmax is None else plotNmax,
            'showVel':dict() if showVel is None else showVel,
            'velType':dict() if velType is None else velType,
            'color':dict() if color is None else color,
            'sizeMult':dict() if sizeMult is None else sizeMult,
            'showParts':dict() if showParts is None else showParts
        }
    
    def particle_filter_settings(
        self,
        filterLims=None,
        filterVals=None,
        **extra):
        """Settings that will define the initial values of the filters in the particle UI panes
        and consequently what particles are filtered at startup.

        :param filterLims: initial [min, max] limits to the filters. 
            This is a nested dict of the particle UInames, 
            then for each filterble field the [min, max] range 
            (e.g., {'Gas':{'log10Density':[0,1],'magVelocities':[20, 100]}}),
            defaults to None and is set in the web app to [min, max] of that field
        :type filterLims: dict of UIname:dict of field:[min,max] range, optional
        :param filterVals: initial location of the filter slider handles.
            This is a nested dict of the particle UInames, 
            then for each filterble field the [min, max] range 
            (e.g., {'Gas':{'log10Density':[.1,0.5],'magVelocities':[50, 60]}}),
            defaults to None and is set in the web app to [min, max] of that field
        :type filterVals: dict of UIname:dict of field:[min,max] range, optional
        """

        self.__particle_filter_settings = {
            'filterLims':dict() if filterLims is None else filterLims, 
            'filterVals':dict() if filterVals is None else filterVals, 
        }

    def particle_colormap_settings(
        self,
        colormapLims=None,
        colormapVals=None,
        colormap=None,
        colormapVariable=None,
        showColormap=None,
        **extra):
        """Settings that will define the initial values of the colormaps in the particle UI panes.

        :param colormapLims: initial [min, max] limits to the colormaps. 
            This is a nested dict of the particle UInames, 
            then for each colormappable field the [min, max] range 
            (e.g., {'Gas':{'log10Density':[0,1],'magVelocities':[20, 100]}}),
            defaults to None and is set in the web app to [min, max] of that field
        :type colormapLims: dict of UIname:dict of field:[min,max] range, optional
        :param colormapVals: initial location of the colormap slider handles.
            This is a nested dict of the particle UInames, 
            then for each colormappable field the [min, max] range 
            (e.g., {'Gas':{'log10Density':[.1,0.5],'magVelocities':[50, 60]}}),
            defaults to None and is set in the web app to [min, max] of that field
        :type colormapVals: dict of UIname:dict of field:[min,max] range, optional
        :param colormap: index of the colormap to use for each gas particle,
            defined by the grid of colors in Firefly/static/textures/colormap.png
            TODO: (index + 0.5) * (8/256)
            This is a dict with keys of the particle UInames mapped to floats,
            (e.g. {'Gas':0.015625, 'Stars':0.015625}),
            defaults to first colormap
        :type colormap: dict of UIname:float, optional
        :param colormapVariable: index in arrays_to_track of array to colormap by 
            This is a dict with keys of the particle UInames mapped to ints,
            (e.g. {'Gas':0, 'Stars':0}), defaults to 0
        :type colormapVariable: dict of UIname:int, optional
        :param showColormap: flags for whether the colormap should be initialized
        at startup. 
            This is a dict with keys of the particle UInames mapped to bools,
            (e.g. {'Gas':False, 'Stars':False}), defaults to False
        :type showColormap: dict of UIname:bool, optional
        """

        ## settings that will define the initial values of the /colormap/ in the particle UI panes
        ##  and consequently what particles are colored at startup.
        self.__particle_colormap_settings = {
            'colormapLims':dict() if colormapLims is None else colormapLims, 
            'colormapVals':dict() if colormapVals is None else colormapVals,  
            'colormap':dict() if colormap is None else colormap, 
            'colormapVariable':dict() if colormapVariable is None else colormapVariable,  
            'showColormap':dict() if showColormap is None else showColormap, 
        }


    def attachSettings(
        self,
        particleGroup):
        """Adds a :class:`~Firefly.data_reader.ParticleGroup`'s settings to the
        relevant settings dictionaries.

        :param particleGroup: the :class:`~Firefly.data_reader.ParticleGroup`
            that you want to link to this :class:`~Firefly.data_reader.Settings`.
        :type particleGroup: :class:`Firefly.data_reader.ParticleGroup`
        """

        ## transfer keys from particle group
        for key in [
            'UIparticle','UIdropdown','UIcolorPicker',
            'color','sizeMult','showParts','plotNmax',
            'filterVals','filterLims',
            'colormapVals','colormapLims',
            'showVel','velType',
            'colormap','colormapVariable','showColormap']:
            self[key][particleGroup.UIname]=particleGroup.settings_default[key]
        
        ## and link the other way, this Settings instance to the particleGroup
        particleGroup.attached_settings = self

    def outputToDict(
        self):
        """
        Concatenates all the settings dicts into a single dictionary.

        :return: all_settings_dict, concatenated settings dictionary
        :rtype: dict
        """

        all_settings_dict = {}
        for attr in self.__dict__.keys():
            ## loop through all attributes to locate all the sub-dictionaries
            if '_settings' in attr:
                obj = getattr(self,attr)

                ## distinguish between methods and private dictionaries
                if type(obj) == dict:
                    ## copy the keys over
                    all_settings_dict.update(obj)

        return all_settings_dict

    def outputToJSON(
        self,
        JSONdir,
        JSON_prefix='',
        filename=None,
        loud=True,
        write_jsons_to_disk=True,
        not_reader=True):
        """ Saves the current settings to a JSON file.

        :param JSONdir: the sub-directory that will contain your JSON files, relative
            to your :code:`$HOME directory`. , defaults to :code:`$HOME/<JSON_prefix>`
        :type JSONdir: str, optional
        :param JSON_prefix: Prefix for any :code:`.json` files created, :code:`.json` files will be of the format:
            :code:`<JSON_prefix><filename>.json`, defaults to 'Data'
        :type JSON_prefix: str, optional
        :param filename: name of settings :code:`.json` file,
            defaults to self.settings_filename
        :type filename: str, optional
        :param JSON_prefix: string that is prepended to filename, defaults to ''
        :type JSON_prefix: str, optional
        :param loud: flag to print status information to the console, defaults to True
        :type loud: bool, optional
        :param write_jsons_to_disk: flag that controls whether data is saved to disk (:code:`True`)
            or only converted to a string and returned (:code:`False`), defaults to True
        :type write_jsons_to_disk: bool, optional
        :param not_reader: flag for whether to print the Reader :code:`filenames.json` warning, defaults to True
        :type write_jsons_to_disk: bool, optional
        :return: filename, JSON(all_settings_dict) (either a filename if
            written to disk or a JSON strs)
        :rtype: str, str
        """
        
        ## determine where we're saving the file
        filename = self.settings_filename if filename is None else filename
        filename = os.path.join(JSONdir,JSON_prefix+filename)

        ## export settings to a dictionary
        all_settings_dict = self.outputToDict()

        if loud and not_reader:
            print("You will need to add this settings filename to"+
                " filenames.json if this was not called by a Reader instance.")

        ## convert dictionary to a JSON (either write to disk or get back a str)
        return filename,write_to_json(
            all_settings_dict,
            filename if write_jsons_to_disk else None) ## None -> string

    def loadFromJSON(
        self,
        filename,
        loud=True):
        """Replaces the current settings with those stored in a JSON file.

        :param filename: full filepath to settings :code:`.json` file
        :type filename: str
        :param loud: flag to print status information to the console, defaults to True
        :type loud: bool, optional
        :raises FileNotFoundError: if the specified filename does not exist 
        """

        ## check for existence of the file
        if os.path.isfile(filename):
            settings_dict = load_from_json(filename)
        else:
            raise FileNotFoundError("Settings file: %s doesn't exist."%filename) 

        ## import settings
        for key in settings_dict.keys():
            if loud:
                ## notify user if any setting is being replacing, 
                ##  but *only* if it's being replaced
                if np.all(settings_dict[key] != self[key]):
                    print("replacing",key)
                    print(self[key],'-->',settings_dict[key])

            self[key]=settings_dict[key]

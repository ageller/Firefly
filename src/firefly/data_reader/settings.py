from __future__ import print_function

import numpy as np

import os 

from .json_utils import write_to_json,load_from_json

class Settings(object):
    """This is a class for organizing the various settings you can pass to 
        Firefly to customize how the app is initialized and what features 
        the user has access to. 

        It is easiest to use when instances of Settings are passed to a 
        :class:`firefly.data_reader.Reader` instance when it is initialized.

        General settings that affect the app state
        :param decimate: set the initial global decimation 
            (e.g, you could load in all the data by setting 
            the :code:`decimation_factor` to 1 for any individual
            :class:`firefly.data_reader.ParticleGroup`,
            but only _display_ some fraction by setting
            decimate > 1 here).  
            This is a single value (not a dict), defaults to None
        :type decimate: int, optional
        :param maxVrange: maximum range in velocities to use in deciding 
            the length of the velocity vectors (making maxVrange 
            larger will enhance the difference between small and large velocities),
            defaults to 2000.
        :type maxVrange: float, optional 
        :param friction: set the initial friction for the controls, defaults to 0.1
        :type friction: float, optional
        :param zmin: set the minimum distance a particle must be to appear on the screen
            (defines the front edge of the frustum), defaults to 1
        :type zmin: float, optional
        :param zmin: set the maximum distance a particle can be to appear on the screen
            (defines the back edge of the frustum), defaults to 5e10
        :type zmax: float, optional
        :param stereo: flag to start in stereo mode, defaults to False
        :type stereo: bool, optional
        :param stereoSep: camera (eye) separation in the stereo 
            mode (should be < 1), defaults to 0.06
        :type stereoSep: float, optional
        :param minPointScale: minimum size of particles, defaults to 0.01
        :type minPointScale: float, optional
        :param maxPointScale: maximum size of particles, defaults to 10
        :type maxPointScale: float, optional
        :param startFly: flag to start in Fly controls
            (if False, then start in the default Trackball controls),
            defaults to False
        :type startFly: bool, optional
        :param startTween: flag to initialize the Firefly scene in tween mode, 
            requires a valid tweenParams.json file to be present in the datadir,
            defaults to False
        :type startTween: bool, optional
        :param startVR: flag to initialize Firefly in VR mode, defaults to False
        :type startVR: bool, optional
        :param startColumnDensity: flag to initialize Firefly in the (mostly) experimental column density
            projection mode, defaults to False
        :type startColumnDensity: bool, optional
 
        Settings that affect the browser window

        :param title: the title of the webpage, shows up in browser tab,
            defaults to 'Firefly'
        :type title: str, optional
        :param annotation: text to include at the top of the
            Firefly window as an annotation, defaults to None
        :type annotation: str, optional
        :param controlsExplainerDelay_sec: seconds before the controls explainer auto-hides. If <=0,
            then the controls explainer is not shown, defaults to 5
        :type controlsExplainerDelay_sec: int, optional
        :param showFPS: flag to display the FPS (frames per second) of the 
            Firefly scene, defaults to False
        :type showFPS: bool, optional
        :param showMemoryUsage: flag to display the memory usage in GB of the 
            loaded data-- useful for octrees when memory usage changes over time, defaults to False
        :type showMemoryUsage: bool, optional
        :param memoryLimit: maximum memory in bytes to use when loading an octree dataset.
            If this limit is exceeded then previously loaded nodes will be discarded
            to bring the memory usage back below. Works best in Chrome which exposes
            the memory usage directly, otherwise memory usage is only estimated, 
            defaults to 2e9 
        :type memoryLimit: float, optional
        :param GUIExcludeList: list of string GUI element URLs (e.g. 'main/general/data/decimation') 
            to exclude from the GUI. Case insensitive. If None then an empty list, defaults to None
        :type GUIExcludeList: list, optional
        :param collapseGUIAtStart: flag to collapse the GUI when the app starts up, defaults to True
        :type collapseGUIAtStart: bool, optional

        Settings that affect the position and orientation of the camera

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
        :param cameraUp: set camera orientation (north vector) using a quaternion, defaults to None
        :type cameraUp: np.ndarray of shape (3), optional
        :param quaternion: can set camera rotation using a quaternion of form (w,x,y,z), defaults to None
        :type quaternion: np.ndarray of shape (4), optional

        General settings that affect the state app state

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
            :class:`firefly.data_reader.ParticleGroup`,
            but only _display_ some fraction by setting
            decimate > 1 here).  
            This is a single value (not a dict), defaults to None
        :type decimate: int, optional
        :param start_tween: flag to initialize the Firefly scene in tween mode, 
            requires a valid tweenParams.json file to be present in the datadir,
            defaults to False
        :type start_tween: bool, optional
        :param CDmin: bottom of the renormalization for the experimental column density
            projection mode, defaults to 0
        :type CDmin: float, optional
        :param CDmax: top of the renormalization for the experimental column density
            projection mode, defaults to 1
        :type CDmax: float, optional
        :param CDlognorm: flag for whether renormalization should be done in log (``CDlognorm=1``)
            or linear (``CDlognorm=0``) space, defaults to 0
        :type CDmax: bool, optional
        :param columnDensity: flag for whether the experimental column density projection mode
            should be enabled at startup. Toggle this mode by pressing 'p' on the keyboard, defaults to 0
        :type CDcolumnDensity: bool, optional

        Settings that will define the initial values of the particle UI panes

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

        :param radiusVariable: dict of UIname:int which are indices for
            which variable to scale the radius by (if any have been flagged
            as allowable to be a radius scale). 0 is always 'None' and will
            make all particles the same radius, optional
            defaults to dict([(UIname,0) for UIname in UInames])
        :type radiusVariable: dict of UIname:int, optional
    
        Settings used to define properties of the velocity vector field
            which can also be used to extrapolate new positions using the
            ``animateVel`` kwarg.

        :param showVel: flag to start showing the velocity vectors
            This is a dict with keys of the particle UInames mapped to bools,
            defaults to dict([(UIname,False) for UIname in UInames])
        :type showVel: dict of UIname:bool, optional
        :param velType: type of velocity vectors to plot.  
            This is a dict with keys of the particle UInames mapped to strs that
            must be one of 'line', 'arrow', or 'triangle',
            defaults to dict([(UIname,'line') for UIname in UInames])
        :param velVectorWidth: width of the velocity vectors,
            defaults to dict([(UIname,1) for UIname in UInames])
        :type velVectorWidth: dict of UIname:float, optional
        :param velGradient: flags for whether there should be a gradient
            to white applied along the length of the velocity vector
            to indicate direction, defaults to dict([(UIname,False) for UIname in UInames])
        :type velGradient: dict of UIname:bool, optional
        :param animateVel: flags for whether velocity extrapolation should
            be enabled at startup,
            defaults to dict([(UIname,False) for UIname in UInames])
        :type animateVel: dict of UIname:bool, optional
        :param animateVelDt: DT for which to increment the extrapolation
            defaults to dict([(UIname,0) for UIname in UInames])
        :type animateVelDt: dict of UIname:float, optional
        :param animateVelTmax: maximum time to extrapolate before resetting
            particles to their original positions
            defaults to dict([(UIname,1) for UIname in UInames])
        :type animateVelTmax: dict of UIname:float, optional
    
        Settings that will define the initial values of the filters in the particle UI panes
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
        :param invertFilter: flags for whether filters should _hide_ particles within
            their range (True) or not (False), defaults to UIname:dict of field:False
        :type invertFilter: dict of UIname:dict of field:bool, optional

        Settings that will define the initial values of the colormaps in the particle UI panes.

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
            defined by the grid of colors in firefly/static/textures/colormap.png
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
        :param blendingMode: blending mode for each particle group,
            options are: 'additive','normal','subtractive','multiplicative','none'.
            This is a dict with keys of the particle UInames mapped to strs,
            (e.g. {'Gas':'additive', 'Stars':'additive'}), defaults to 'additive'
        :type blendingMode: dict of UIname:str, optional
        :param depthTest: flags for whether the depth checkbox should 
            be checked at startup. 
            This is a dict with keys of the particle UInames mapped to bools,
            (e.g. {'Gas':False, 'Stars':False}), defaults to False
        :type depthTest: dict of UIname:bool, optional
        """
    
    def __getitem__(self,key):
        """Implementation of builtin function  __getitem__

        :param key: key to read
        :type key: str
        :return: attr, the value from the settings dictionary
        :rtype: object
        """
        self.__validateSettingsKey(key)
        ## set that dictonary's value
        return self.__settings_dict[key]
        
    def __setitem__(self,key,value):
        """Implementation of builtin function __setitem__ 

        :param key: key to set
        :type key: str
        :param value: value to set to key
        :type value: object
        """
        self.__validateSettingsKey(key,value)
        ## set that dictonary's value
        self.__settings_dict[key]=value

    def __validateSettingsKey(self,key,value=None):
        """ Find which sub-dictionary a key belongs to.

        :param key: key to search for
        :type key: str
        :raises KeyError: if no sub-dictionary matches
        :return: attr
        :rtype: private str
        """

        if key not in default_settings.keys():
            closest_key,_ = find_closest_string(key,default_settings.keys()) 
            raise KeyError("Invalid settings key: '%s' (did you mean '%s'?)"%(key,closest_key))
         
        if value is not None:
            if key in default_app_settings: default_value = default_settings[key]
            ## TODO: would be nice to verify default_particle_settings
            else: default_value = {}
            if (default_value is not None) and (type(value) != type(default_value)): raise TypeError(
                f"value type {type(value)} does not match default value type {type(default_value)}")

        return True ## not used but you know one day maybe
        
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

        keys = [key for key in default_settings.keys() if pattern is None or pattern in key]
        if len(keys) == 0: raise KeyError(f"No key matched the pattern {pattern}")

        for key in keys:
            if values: 
                ## print the value the user set or the default value
                if key in self.__settings_dict.keys():
                    value = self.__settings_dict[key]  
                    value_str = ""
                else:
                    value = default_settings[key]
                    value_str = "(default)"
                print(key,value,value_str)
            else: print(key)

    def keys(self):
        """ Returns a list of keys for all the different settings sub-dictionaries """
        this_keys = list(self.__settings_dict.keys())
        return this_keys

    def __init__(self,
        settings_filename='Settings.json',
        **kwargs):
        """Base initialization method for Settings instances. A Settings will store
            the app state and produce firefly compatible :code:`.json` files.

        :param settings_filename: name of settings :code:`.json` file,
            defaults to 'Settings.json'
        :type settings_filename: str, optional
        """

        ## dictionary where settings actually live, private so no one can access it directly
        self.__settings_dict = {}

        ## where should this be saved if it's outputToJSON
        self.settings_filename = settings_filename

        ## apply any passed kwargs but validate them in __setitem__
        for kwarg,value in kwargs.items(): self[kwarg] = value

    def attachSettings(
        self,
        particleGroup):
        """Adds a :class:`~firefly.data_reader.ParticleGroup`'s settings to the
        relevant settings dictionaries.

        :param particleGroup: the :class:`~firefly.data_reader.ParticleGroup`
            that you want to link to this :class:`~firefly.data_reader.Settings`.
        :type particleGroup: :class:`firefly.data_reader.ParticleGroup`
        """

        ## transfer keys from particle group
        for key in [
            'partsColors','partsSizeMultipliers','showParts','plotNmax','radiusVariable',
            'filterVals','filterLims','invertFilter',
            'colormapVals','colormapLims',
            'showVel','velType','velVectorWidth','velGradient',
            'animateVel','animateVelDt','animateVelTmax',
            'colormap','colormapVariable','showColormap']:

            try: 
                if key not in self.__settings_dict.keys(): self[key] = {}
                self[key][particleGroup.UIname] = particleGroup.settings_default[key]
            except: 
                print(key)
                raise
        
        if particleGroup.settings_default['GUIExcludeList'] is not None:
            self['GUIExcludeList'] += [
                f"{particleGroup.UIname}/{key}" if key != '' else f"{particleGroup.UIname}" for key in 
                particleGroup.settings_default['GUIExcludeList']]

        ## replace colormapVariable and radiusVariable values
        ##  with indices of field 
        ##  (if passed as a string) 
        for key,flags in zip(
            ['colormapVariable','radiusVariable'],
            [particleGroup.field_colormap_flags,particleGroup.field_radius_flags]):
            value = particleGroup.settings_default[key]
            if type(value) == str: 
                value = [
                    field_name for field_name,flag in 
                    zip(particleGroup.field_names,flags) if flag].index(value)
                ## offset by 1 if doing radiusVariable because
                ##  0 corresponds to no scaling
                if key == 'radiusVariable': value += 1
                self[key][particleGroup.UIname] = value
        
        ## and link the other way, this Settings instance to the particleGroup
        particleGroup.attached_settings = self

    def outputToDict(
        self):
        """
        :return: all_settings_dict, concatenated settings dictionary
        :rtype: dict
        """

        ## copy the private dictionary to a new dictionary
        all_settings_dict = {**self.__settings_dict}

        if ( 'GUIExcludeList' in all_settings_dict.keys() and
            all_settings_dict['GUIExcludeList'] is not None and 
            len(all_settings_dict['GUIExcludeList']) > 0): 
            self.validateGUIExcludeList(all_settings_dict['GUIExcludeList'])
        
        ## convert colormap strings to texture index
        ##  (if passed as a string) 
        for key,value in all_settings_dict['colormap'].items():
            if type(value) == str: 
                value = (colormaps.index(value)+0.5)/len(colormaps)
            elif type(value)  == int:
                value = (value+0.5)/len(colormaps)

            all_settings_dict['colormap'][key] = value

        return all_settings_dict
    
    def validateGUIExcludeList(self,GUIExcludeList):
        pkey_particleGUIurlss = []
        for pkey in self['sizeMult'].keys():
            pkey_particleGUIurlss += [url.replace('main/particles',pkey).lower() for url in particle_GUIurls]+[pkey]

        for url in GUIExcludeList:
            if url.lower() in GUIurls: continue
            elif url.lower() in pkey_particleGUIurlss: continue
            else: 
                closest_url,_ = find_closest_string(url.lower(),GUIurls+pkey_particleGUIurlss)
                raise KeyError(f"Invalid GUIurl: '{url}' (did you mean '{closest_url}'?)")
            
    def outputToJSON(
        self,
        datadir,
        file_prefix='',
        filename=None,
        loud=True,
        write_to_disk=True,
        not_reader=True):
        """ Saves the current settings to a JSON file.

        :param datadir: the sub-directory that will contain your JSON files, relative
            to your :code:`$HOME directory`. , defaults to :code:`$HOME/<file_prefix>`
        :type datadir: str, optional
        :param file_prefix: Prefix for any :code:`.json` files created, :code:`.json` files will be of the format:
            :code:`<file_prefix><filename>.json`, defaults to 'Data'
        :type file_prefix: str, optional
        :param filename: name of settings :code:`.json` file,
            defaults to self.settings_filename
        :type filename: str, optional
        :param file_prefix: string that is prepended to filename, defaults to ''
        :type file_prefix: str, optional
        :param loud: flag to print status information to the console, defaults to True
        :type loud: bool, optional
        :param write_to_disk: flag that controls whether data is saved to disk (:code:`True`)
            or only converted to a string and returned (:code:`False`), defaults to True
        :type write_to_disk: bool, optional
        :param not_reader: flag for whether to print the Reader :code:`filenames.json` warning, defaults to True
        :type write_to_disk: bool, optional
        :return: filename, JSON(all_settings_dict) (either a filename if
            written to disk or a JSON strs)
        :rtype: str, str
        """
        
        ## determine where we're saving the file
        filename = self.settings_filename if filename is None else filename
        filename = os.path.join(datadir,file_prefix+filename)

        ## export settings to a dictionary
        all_settings_dict = self.outputToDict()

        ## add the "loaded" attribute which is checked to initialize the app
        all_settings_dict['loaded'] = True

        if loud and not_reader:
            print("You will need to add this settings filename to"+
                " filenames.json if this was not called by a Reader instance.")

        ## convert dictionary to a JSON (either write to disk or get back a str)
        return filename,write_to_json(
            all_settings_dict,
            filename if write_to_disk else None) ## None -> string

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
        if os.path.isfile(filename): settings_dict = load_from_json(filename)
        else: raise FileNotFoundError("Settings file: %s doesn't exist."%filename) 

        ## import settings
        for key in settings_dict.keys():
            if key in self.__settings_dict.keys():
                if loud:
                    ## notify user if any setting is being replacing, 
                    ##  but *only* if it's being replaced
                    if np.all(settings_dict[key] != self[key]):
                        print("replacing",key)
                        print(self[key],'-->',settings_dict[key])

            self[key]=settings_dict[key]

def find_closest_string(string,string_list):
    min_dist = 1e10
    closest_key = ''
    dist = min_dist
    for real_string in string_list:
        rkset = set([char for char in real_string.lower()])
        kset = set([char for char in string.lower()])
        dist = max(len(rkset-kset),len(kset-rkset))
        if dist < min_dist: 
            closest_key = real_string
            min_dist = dist
    return closest_key,dist

GUIurls = [
    'main',
    'main/general',

    'main/general/data',
    'main/general/data/decimation',
    'main/general/data/savePreset',
    'main/general/data/reset',
    'main/general/data/loadNewData',

    'main/general/camera',
    'main/general/camera/centerTextBoxes',
    'main/general/camera/cameraTextBoxes',
    'main/general/camera/rotationTextBoxes',
    'main/general/camera/cameraButtons',
    'main/general/camera/fullScreen',
    'main/general/camera/cameraFriction',
    'main/general/camera/stereoSep',

    'main/general/capture',
    'main/general/capture/captureButtons',
    'main/general/capture/captureResolution',
    'main/general/capture/videoDuration',
    'main/general/capture/videoFormat',

    'main/general/projection',
    'main/general/projection/columnDensityCheckBox',
    'main/general/projection/columnDensityLogCheckBox',
    'main/general/projection/columnDensitySelectCmap',
    'main/general/projection/columnDensitySliders',

    'colorbarContainer',
    'FPSContainer',
    'octreeLoadingBarContainer',
    'main/particles']
GUIurls = [url.lower() for url in GUIurls]

particle_GUIurls = [
    'main/particles/onoff', 
    'main/particles/sizeSlider',

    'main/particles/colorPicker', ## hides colorpicker all together
    'main/particles/colorPicker/onclick', ## shows colorpicker but disables onclick

    'main/particles/dropdown',

    'main/particles/dropdown/general',
    'main/particles/dropdown/general/octreeClearMemory',
    'main/particles/dropdown/general/blendingModeSelectors',
    'main/particles/dropdown/general/maxSlider',
    'main/particles/dropdown/general/octreeCameraNorm',
    'main/particles/dropdown/general/radiusVariableSelector',

    'main/particles/dropdown/velocities',
    'main/particles/dropdown/velocities/velocityCheckBox',
    'main/particles/dropdown/velocities/velocityWidthSlider',
    'main/particles/dropdown/velocities/velocityGradientCheckBox',
    'main/particles/dropdown/velocities/velocityAnimatorCheckBox',
    'main/particles/dropdown/velocities/velocityAnimatorTextBoxes',

    'main/particles/dropdown/colormap',
    'main/particles/dropdown/colormap/colormapCheckBox',
    'main/particles/dropdown/colormap/colormapSliders',

    'main/particles/dropdown/filters',
    'main/particles/dropdown/filters/filterSliders',
    'main/particles/dropdown/filters/filterPlayback',
]

particle_GUIurls = [url.lower() for url in particle_GUIurls]


## make individual and joined settings dictionaries
default_app_settings = load_from_json(
    os.path.abspath(os.path.join(
        os.path.dirname(__file__),
        '../static/js/misc/defaultSettings.json')))
default_particle_settings = load_from_json(
    os.path.abspath(os.path.join(
        os.path.dirname(__file__),
        '../static/js/misc/defaultParticleSettings.json')))
default_settings = {**default_app_settings,**default_particle_settings}


colormaps = load_from_json(
    os.path.abspath(os.path.join(
        os.path.dirname(__file__),
        '../static/textures/colormap_names.json')))['names']

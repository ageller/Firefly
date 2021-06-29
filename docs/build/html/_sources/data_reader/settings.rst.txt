Customizing the interface
=========================

## Managing Custom Options
Options in Firefly refer to the different settings for app and come in a few flavors. Once you have an Options instance you can either use its `outputToJSON()` method to save it to file (for use later) or pass it to a Reader instance to link it to a visualization (see the documentation in customReader.ipynb).

* #### Startup Options - These define how the visualization looks at startup
    * `camera=None` - initial position of the camera
    * `center=[0,0,0]` - initial position of the camera focus
    * `cameraRotation=None` - quarternion defining the initial camera orientation
    * `stereoSep=None` - how far should the stereo separation be between 0-1, controls how "3D" it looks when in stereo mode
    * `stereo=False` - flag for whether the app should initialize in side-by-side stereo mode
    * `friction=None` - how much the camera should "slide" after you release the controls, from 0-1 (0 being rotating forever and 1 being stopping immediately).
    * `startFly=0` - flag for whether we should start in "fly controls"
    * `decimate=None` - flag for additional decimation within the app at startup, not to be mixed up with the ParticleGroup's `decimation_factor`!
    * `maxVrange=2000` - dynamic range for velocity when renormalizing velocity vectors
* #### UI Options - These define what parts of the UI will be enabled
    * `UI=True` - flag for whether the UI as a whole should be enabled
    * `UIfullscreen=True` - flag for whether the fullscreen button should be available to the user
    * `UIsnapshot=True` - flag for whether the screenshot button should be available to the user
    * `UIloadNewData=True` - flag for whether the load new dataset button should be available to the user
    * `UIcameraControls=True` - flag for whether the camera controls UI pane should be available to the user
    * `UIsavePreset=True` - flag for whether the save preset button should be available to the user (which outputs a preset JSON that you can load from within the app to get back to your app configuration)
    * `UIreset=True` - flag for whether the reset to preset button should be available to the user
    * `UIdecimation=True` - flag for whether the decimation slider should be available to the user
* #### Window Options - These options refer to the browser window itself
    * `loaded` - should not be adjusted, tells Firefly if it has finished loading data
    * `title` - the title that is displayed in the browser tab
------------------------------------------------------------------------------------------------------------------
Options here are dictionaries for *each particle group* and are easiest to edit by changing a ParticleGroup's `options_default` dictionary and then using the options instance's `addToOptions(particleGroup)` method instead of manipulating them directly through the options. This will make sure the particleGroup's `UIname` matches and that all values are filled in correctly.
* #### Particle UI Options
    * `UIparticle={}` - dictionary containing flags for whether a particle group's UI pane should appear to the user
    * `UIcolorPicker={}` - dictionary containing flags for whether a particle group's color picker should be available to the user
    * `UIdropdown={}` - dictionary containing flags for whether a particle group's advanced options dropdown menu should be available to the user
* #### Particle Filter Options - These should be dictionaries that contain the initial limits of the filters for particle groups with arrays that have been flagged to allow filtering.
    * `filterVals={}` - dictionary, containing dictionaries for each particle group that contain 2 element arrays that designate a filterable array's initial filter settings, these are the positions of the filter slider handles.
    * `filterLims={}` - dictionary, containing dictionaries for each particle group that contain 2 element arrays that designate a filterable array's initial filter limits, these are the bounds of the filter.
* #### Particle Startup Options - These define how an individual particle group is displayed at startup
    * `sizeMult={}` - dictionary containing floats that designate the initial size of the particles (in arbitrary units, unfortunately-- experiment to see what works best!!)
    * `color={}` - dictionary contained 4 element arrays that designate the initial color for a particle group
    * `showParts={}` - dictionary containing flags for whether a particle group should be visible at startup
    * `plotNmax={}` - dictionary containing integers that designate the maximum number of points from a particle group that should be shown
    * `showVel={}` - dictionary containing flags for whether a particle group should be displayed as velocity vectors
    * `velType={}` - dictionary containing integers (indices from 0-2) that designate what type of velocity vector to use (lines, arrows, cones)


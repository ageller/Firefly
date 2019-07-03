### Create a new "reader", that will accept particles and output a properly formatted dict

from firefly_api.reader import Reader
from firefly_api.particlegroup import ParticleGroup
import numpy as np

def simpleReader(name = "foo", coords = [], color=[1,1,1,1], sizeMult=1, colorArray=[None]):
    #create the reader
    my_reader = Reader(
        ## the name of the sub-directory that will contain your JSON files,
        ##  if you are not running python from /path/to/Firefly/data it should be the absolute path
        JSONdir = '/foo/', #this is silly, but required for now
        ## options object, if you have one you can pass it, None will generate default options, see
        ##  below for options arguments/capabilities
        options = None, 
        ## whether a startup.json file should be written, defaults to 'append'
        doValidate = False
    )

    #define a particle group
    my_parts = ParticleGroup(
        name,
        coords,
        ## below here I pass a few option_kwargs to set the size and color of the points
        sizeMult=sizeMult, 
        color = color, 
    )
    
    if (colorArray[0] != None):
        my_parts.tracked_names = ['colorArray']
        my_parts.tracked_arrays = [np.array(colorArray)]
        my_parts.tracked_filter_flags = [False]
        my_parts.tracked_colormap_flags = [False]

        
    ## tell the reader to keep track of this particle group
    my_reader.addParticleGroup(my_parts)

    ## Store this info in dicts with the correct format for Firefly
    outDict = {"parts":{}, "options":None}
    for pg in my_reader.particleGroups:
        outDict['parts'][pg.UIname] = pg.outputToDict()
    outDict['options'] = my_reader.options.outputToDict()
    
    return outDict
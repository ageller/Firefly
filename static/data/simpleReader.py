### Create a new "reader", that will accept particles and output a properly formatted dict

from firefly_api.reader import Reader
from firefly_api.particlegroup import ParticleGroup

def simpleReader(name, coords, color, sizeMult):
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

    ## tell the reader to keep track of this particle group
    my_reader.addParticleGroup(my_parts)

    ## Store this info in dicts with the correct format for Firefly
    outDict = {"parts":{}, "options":None}
    for pg in my_reader.particleGroups:
        outDict['parts'][pg.UIname] = pg.outputToDict()
    outDict['options'] = my_reader.options.outputToDict()
    
    return outDict
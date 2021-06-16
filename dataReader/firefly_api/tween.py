from __future__ import print_function

import numpy as np

import os 

from firefly_api.errors import FireflyError,FireflyWarning,warnings
from firefly_api.json_utils import write_to_json

class TweenParams(object):
    """A class to store tween parameters and make an output file"""
    def __init__(
        self,
        coordss = None,
        durations = None,
        loop = True
        ):
        """ 
        Create a new tween parameter object. 
        Input:  
            coordss - 
            durations - 
            loop -
        """

        if coordss is None:
            coordss = np.array([]).reshape(0,3)
        else:
            coordss = np.array(coordss)

        if durations is None:
            durations = np.array([])
        else:
            durations = np.array(durations)

        if durations.shape[0]!=coordss.shape[0]:
            raise FireflyError(
                "Mismatching coordss and durations shape (%d,%d)"%(
                    coords.shape[0],
                    durations.shape[0]))
        if coordss.shape[-1] != 3:
            raise FireflyError(
                "coordss should be an Nx3 array of x,y,z positions"+
                " currently it has shape: "+str(coordss.shape))

        self.coordss = coordss
        self.durations = durations
        self.loop = bool(loop)

    def addKeyframe(
        self,
        coords,
        duration):
        """ 
        Adds a new keyframe to an existing TweenParams object. 
        Input:  
            coords - array of coordinates, 3 options for type of input:
                * [x,y,z] single keyframe
                * [[x1,y1,z1],[x2,y2,z2],...] multiple keyframes
                * [x1,y1,z1,x2,y2,z2,...] multiple flattened keyframes
            durations - duration to approach keyframe, 3 options for type of input:
                * d single duration
                * [d] single duration in list
                * [d1,d2,...] multiple durations (corresponding to number of keyframes or
                    raises an error)
        """

        try:
            ## cast to numpy array and reorder coords at the same time for 
            ##  convenient input
            coords = np.array(coords).reshape(-1,3)
        except:
            raise FireflyError("coords should either be a 2d Nx3 numpy array or"+
                "a 3N list/array.")

        ## convert duration to a 1d numpy array, however it was passed
        duration = np.array(duration).reshape(-1)

        if duration.shape[0]!=coords.shape[0]:
            raise FireflyError(
                "Mismatching coords and duration shape (%d,%d)"%(
                    coords.shape[0],
                    duration.shape[0]))

        self.coordss = np.append(self.coordss,coords,axis=0)
        self.durations = np.append(self.durations,duration)

    def outputToDict(self):
        xs,ys,zs = self.coordss.T
        keyframe_dicts = [
            {'x':xs[i],'y':ys[i],'z':zs[i]} 
            for i in range(xs.shape[0])]

        tween_params_dict = {
            'loop':self.loop,
            'duration':self.durations,
            'position':keyframe_dicts
        }

        return tween_params_dict

    def outputToJSON(
        self,
        JSONdir,
        filename=None,
        prefix='',
        loud=1,
        write_jsons_to_disk=True):
        if filename is None:
            filename = 'tweenParams.json'
        else:
            ##filename = self.options_filename if filename is None else filename
            raise NotImplementedError("Tween params must be named TweenParams.json")

        tween_params_dict = self.outputToDict()

        filename = os.path.join(JSONdir,prefix+filename)

        return filename,write_to_json(
            tween_params_dict,
            filename if write_jsons_to_disk else None) ## None-> returns a string

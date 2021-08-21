from __future__ import print_function

import numpy as np

import os 

from .json_utils import write_to_json

class TweenParams(object):
    """A class to store tween parameters and make an output file"""
    def __init__(
        self,
        coords=None,
        duration=5,
        loop=True):
        """Create a new tween parameter object, allowing the user to press :code:`t` from within
            the webapp to move between keyframe camera locations smoothly and automatically.

        :param coords: keyframe camera coordinates, list of positions that camera
            will move between. 3 acceptable input formats:
            * [x,y,z] single keyframe
            * [[x1,y1,z1],[x2,y2,z2],...] multiple keyframes
            * [x1,y1,z1,x2,y2,z2,...] multiple flattened keyframes,
            defaults to []
        :type coords: list of float
        :param duration: duration to approach keyframe in seconds. 3 acceptable input formats:
            * d single duration (will be repeated)
            * [d] single duration in list (will be repeated)
            * [d1,d2,...] multiple durations (corresponding to number of keyframes or
                raises an error),
            defaults to 5
        :type duration: float/list of float
        :param loop: flag to loop after reaching the last keyframe, defaults to True
        :type loop: bool, optional
        """

        ## initialize containers
        self.coordss = np.array([]).reshape(0,3)
        try: iter(duration)
        except: duration = np.repeat(duration,np.size(coords)//3)
        self.durations = np.array([])

        ## store loop flag
        self.loop = bool(loop)
        
        ## add keyframes if any were passed
        if coords is not None:
            self.addKeyframe(coords,duration)

    def addKeyframe(
        self,
        coords,
        duration):
        """ 
        Adds a new keyframe to an existing TweenParams object. 

        :param coords: keyframe camera coordinates, list of positions that camera
            will move between 3 acceptable input formats:
                * [x,y,z] single keyframe
                * [[x1,y1,z1],[x2,y2,z2],...] multiple keyframes
                * [x1,y1,z1,x2,y2,z2,...] multiple flattened keyframes
        :type coords: list of float 
        :param duration: duration to approach keyframe, 3 acceptable input formats:
                * d single duration (will be repeated)
                * [d] single duration in list (will be repeated)
                * [d1,d2,...] multiple durations (corresponding to number of keyframes or
                    raises an error)
        :type duration: float/list of float 
        :raises np.AxisError: if len of coords is not divisible by 3
        :raises np.AxisError: if len of durations does not match len of coords
        """

        try:
            ## cast to numpy array and reorder coords at the same time for 
            ##  convenient input
            coords = np.array(coords).reshape(-1,3)
        except:
            raise np.AxisError("coords should either be a 2d Nx3 numpy array or"+
                "a 3N list/array.")

        ## convert duration to a 1d numpy array, however it was passed
        duration = np.array(duration).reshape(-1)
        if duration.shape == 1: duration = np.repeat(duration,coords.shape[0])

        ## ensure there is a duration per keyframe transition
        ##  TODO: shouldn't durations be 1 less than coordss?
        if duration.shape[0]!=coords.shape[0]:
            raise np.AxisError(
                "Mismatching coords and duration shape (%d,%d)"%(
                    coords.shape[0],
                    duration.shape[0]))

        self.coordss = np.append(self.coordss,coords,axis=0)
        self.durations = np.append(self.durations,duration)

    def outputToDict(self):
        """Converts stored data into a single python dictionary.

        :return: tween_params_dict
        :rtype: dict
        """
        xs,ys,zs = self.coordss.T
        keyframe_dicts = [
            {'x':xs[i],'y':ys[i],'z':zs[i]} 
            for i in range(xs.shape[0])]

        rotation_dicts = [
            {'x':0,'y':0,'z':0} 
            for i in range(xs.shape[0])]

        tween_params_dict = {
            'position':keyframe_dicts,
            'rotation':rotation_dicts,
            'duration':self.durations,
            'loop':self.loop
        }

        return tween_params_dict

    def outputToJSON(
        self,
        JSONdir,
        JSON_prefix='',
        filename=None,
        loud=1,
        write_jsons_to_disk=True,
        not_reader=True):
        """ Saves the current tween parameters to a JSON file.

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
        :raises NotImplementedError: if filename is anything but None 
            TODO: need to check on this if the webapp actually requires it have 
            a specific name.
        :return: filename, JSON(tween_params_dict) (either a filename if
            written to disk or a JSON strs)
        :rtype: str, str
        """

        if filename is None:
            filename = 'tweenParams.json'
        else:
            ##filename = self.settings_filename if filename is None else filename
            raise NotImplementedError("Tween params must be named TweenParams.json")

        tween_params_dict = self.outputToDict()

        ## JSON_prefix+
        filename = os.path.join(JSONdir,filename)

        if loud and not_reader:
            print("You will need to add this tween params filename to"+
                " filenames.json if this was not called by a Reader instance.")

        return filename,write_to_json(
            tween_params_dict,
            filename if write_jsons_to_disk else None) ## None-> returns a string

import pandas as pd
import os

def write_to_json(dictionary,path=None):
    """Simple utility function to write a dictionary to a path as :code:`.json` file.
        If path is None then instead a string is returned (thanks pandas!)

    :param dictionary: arbitrary data dictionary that we want to output
    :type dictionary: dict
    :param path: filepath to output to, defaults to None
    :type path: str
    :return: JSON, either a string containing the JSON or the path the JSON was output to.
    :rtype: str
    """
    JSON = pd.Series(dictionary)
    JSON = JSON.to_json(path,orient='index')
    if JSON is None: JSON = path
    return JSON

def load_from_json(path):
    """Generate a python dictionary from a :code:`.json` that lives on disk.

    :param path: filepath to input :code:`.json` file.
    :type path: str
    :return: dictionary
    :rtype: dict
    """
    if os.path.isfile(path):
        with open(path,'r') as handle:
            dictionary=pd.io.json.loads(''.join(handle.readlines()))
    return dictionary

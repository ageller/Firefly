
import numpy as np
import pandas as pd
import os


def write_to_json(dictionary,path):
    return_value = pd.Series(dictionary)
    return_value = return_value.to_json(path,orient='index')
    return return_value

def load_from_json(path):
    if os.path.isfile(path):
        with open(path,'r') as handle:
            dictionary=pd.io.json.loads(''.join(handle.readlines()))
    return dictionary

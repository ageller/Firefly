
# coding: utf-8

# # Convert FIRE data
# 
# This script will convert the FIRE .hdf5 files into a .json data files that can be read into Firefly. 
# 
# FIREreader is the class that will allow you to read in files within a directory, create the dictionary, and write out the json files

# In[1]:

from FIREreader import FIREreader
import numpy as np


# ### Set the defaults and create the .json files

# In[8]:

reader = FIREreader()

reader.directory = "/Users/ageller/Visualizations/Firefly"
reader.snapnum = 50
reader.dataDir = "isolatedGalaxy_s50"


reader.returnParts = ['PartType0', 'PartType4']
reader.names = {'PartType0':'Gas', 
                'PartType1':'HRDM', 
                'PartType2':'LRDM', 
                'PartType4':'Stars'}

#define the defaults; this must be run first if you want to change the defaults below
reader.defineDefaults()

decimate = [10., 100.]

for i,p in enumerate(reader.returnParts):
    reader.decimate[p] = decimate[i]
    reader.returnKeys[p] = ['Coordinates', 'Density','Velocities']
    #Note: you should only try to filter on scalar values (like density).  
    #The magnitude of the Velocities are calculated in Firefly, and you will automatically be allowed to filter on it
    reader.addFilter[p] = [False, True, False]
    reader.dolog[p] = [False, True, False]

    #NOTE: all dictionaries in the "options" reference the swapped names (i.e., reader.names) you define above.  
    #If you don't define reader.names, then you can use the default keys from the hdf5 files 
    #(but then you will see those hdf5 names in the Firefly GUI)
    pp = reader.names[p]
    reader.options['sizeMult'][pp] = 0.3

reader.options['color'] = {'Gas':  [1., 0., 0., 1.],  
                           'HRDM': [1., 1., 0., 0.1],  
                           'LRDM': [1., 1., 0., 0.1],  
                           'Stars':[0., 0., 1., 0.1]} 

reader.options['center'] = np.array([0., 0., 0.])


#make the file
reader.run()





# ### Create a preset file
# 

# In[6]:

#print the options just to check what's there
for k in reader.options.keys():
    print(k,':', reader.options[k])


# In[7]:

#update a few of the options, here to start by only showing the high-velocity outflows in Gas, as vectors

reader.options['center'] = np.array([-0.11233689678565528, -2.3536859975959175, 0.020126853973307934])
reader.options['camera'] = np.array([12.012246024501222, 16.51869122052115, 1.722756246574182])

reader.options['sizeMult']['Gas'] = 0.4
reader.options['showVel']['Gas'] = True
reader.options['velType']['Gas'] = 'arrow'
reader.options['maxVrange'] = 1000

#Note: if you want to define the filterVals or filterLims above 
#(i.e. to define them before executing reader.run() and after definining reader.addFilter), 
#you would first need to execute reader.defineFilterKeys()  
#(reader.defineFilterKeys() is executed within reader.run() )
reader.options['filterVals']['Gas']['magVelocities'] = [500, 35000]

reader.options['showParts']['Stars'] = False

reader.createOptionsJSON(reader.dataDir + "/velocityPreset.json")

#This created a file names velocityPreset.json within the data directory 
#  that can now be loaded as a preset from within Firefly


# In[ ]:




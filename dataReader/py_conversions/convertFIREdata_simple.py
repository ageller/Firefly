
# coding: utf-8

# # Convert FIRE data
# 
# This script will convert the FIRE .hdf5 files into a .json data files that can be read into Firefly. 
# 
# FIREreader is the class that will allow you to read in files within a directory, create the dictionary, and write out the json files
# 

# In[1]:


from FIREreader import FIREreader
import numpy as np


# ### Set the defaults and create the .json files

# In[5]:

reader = FIREreader()

reader.directory = "/Users/ageller/Visualizations/Firefly"
reader.snapnum = 440

reader.names = {'PartType0':'Gas', 
                'PartType1':'HRDM', 
                'PartType2':'LRDM', 
                'PartType4':'Stars' }

#define the defaults; this must be run first if you want to change the defaults below
reader.defineDefaults()

decimate = 100.
for i,p in enumerate(reader.returnParts):
    reader.decimate[p] = decimate
    
    
#make the file
reader.run()





# In[ ]:




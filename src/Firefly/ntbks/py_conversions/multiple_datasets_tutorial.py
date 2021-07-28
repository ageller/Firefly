#!/usr/bin/env python
# coding: utf-8

# `Firefly/ntbks/multiple_datasets_tutorial.ipynb`

# In[1]:


get_ipython().run_line_magic('load_ext', 'autoreload')
get_ipython().run_line_magic('autoreload', '2')
from IPython.display import YouTubeVideo


# A recording of this jupyter notebook in action is available at:

# In[2]:


YouTubeVideo("TMq3IvnxGY8")


# In[3]:


import numpy as np
import os

import sys
sys.path.insert(0,'/Users/agurvich/research/repos/Firefly/src')
from Firefly.data_reader import ArrayReader


# # Tutorial notebook: Managing multiple datasets with Firefly
# There are two ways to manage multiple datasets with Firefly
# 1. listing multiple entries in startup.json
# 2. creating a "standalone" iteration of Firefly
# 
# 1 and 2 can be combined so that visitors to different "standalone" iterations of Firefly can select between different sets of multiple datasets using a dropdown see <a href="https://agurvich.github.io/firefly_versions">this example</a>.

# ## Editing the entries of `startup.json`
# When the Firefly webapp starts up it looks for a `Firefly/static/data/startup.json` file to tell it which dataset to display. If only a single entry is present then it will automatically begin loading that dataset. If multiple entries are listed then it will present the user with a dropdown box to select which dataset to load. See the <a href="https://ageller.github.io/Firefly/docs/build/html/data_reader/multiple_datasets.html">documentation for managing multiple datasets</a> for how to format the `startup.json` file to list multiple entries manually. We provide a method of easily adding datasets to the `startup.json` file using the `write_startup` keyword argument of the `Firefly.data_reader.Reader` (sub-)class(es). 

# In[4]:


## let's create some sample data, a grid of points in a 3d cube
my_coords = np.linspace(-10,10,20)
xs,ys,zs = np.meshgrid(my_coords,my_coords,my_coords)
xs,ys,zs = xs.flatten(),ys.flatten(),zs.flatten()
coords = np.array([xs,ys,zs]).T

## we'll pick some random field values to demonstrate filtering/colormapping
fields = np.random.random(size=xs.size)


# We'll overwrite whatever file is existing with a new `startup.json` with only 1 entry in it. Then we'll append a second entry. Then we'll create a reader and specify that it should not be added to the `startup.json` file. 

# In[5]:


## initialize an ArrayReader
reader = ArrayReader(
    coordinates=[coords[:-1],coords], ## pass in two particle groups as a demonstration (just copies of our sample data)
    fields=[[],[fields,fields]], ## field data for each particle group, 0 fields for 1 and 2 repeated fields for the other.
    write_startup=True) ## overwrite the existing startup.json file

## initialize a second ArrayReader
fake_reader = ArrayReader(
    coordinates=[coords[:-1],coords], ## pass in two particle groups as a demonstration (just copies of our sample data)
    fields=[[],[fields,fields]],## field data for each particle group, 0 fields for 1 and 2 repeated fields for the other.
    JSONdir="FakeData",
    write_startup='append') ## append this entry to the startup.json file if it doesn't already exists

## initialize a THIRD ArrayReader
null_reader = ArrayReader(
    coordinates=[coords[:-1],coords], ## pass in two particle groups as a demonstration (just copies of our sample data)
    fields=[[],[fields,fields]],## field data for each particle group, 0 fields for 1 and 2 repeated fields for the other.
    JSONdir="NullData",
    write_startup=False) ## do not add this reader to the startup.json file


# Let's read the content of the `startup.json` file:

# In[6]:


get_ipython().system('cat /Users/agurvich/research/repos/Firefly/src/Firefly/static/data/startup.json')


# Notice that the "NullData" `JSONdir` is not listed because we set `write_startup=False`. 

# ## Creating a standalone iteration of Firefly
# You can copy the necessary Firefly source files by creating a `Reader` object containing your data and using the `copyFireflySourceToTarget`. 
# We've also included a script that will automatically create a new Github repository and enable GitHub pages so that your data can be visited by users over the internet via URL. 
# For instructions on how to configure this feature and details for copying the Firefly source see the <a href="https://ageller.github.io/Firefly/docs/build/html/data_reader/multiple_datasets.html">documentation for managing multiple datasets</a>.

# In[7]:


reader.copyFireflySourceToTarget(init_gh_pages=False)


# Let's read the contents of the new `my_Firefly` directory:

# In[8]:


get_ipython().system('ls /Users/agurvich/my_Firefly/')


# In[9]:


get_ipython().system('ls /Users/agurvich/my_Firefly/static/data/')


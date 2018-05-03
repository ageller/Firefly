import numpy as np
import pandas as pd
import h5py,os, shutil

class FIREreader(object):
	"""
	#These are the defaults that can be redefined by the user at runtime.  
	#These defaults are only applied after running self.defineDefaults().

		#directory that contains all the hdf5 data files
		self.directory = './' 
		
		#snapshot number to open
		self.snapnum = None

		#particles to return
		self.returnParts = ['PartType0', 'PartType1', 'PartType2', 'PartType4']
 
		#set names for the particle sets (note: these will be used in the UI of Firefly; 4 characters or less is best)
		self.names = {'PartType0':'PartType0', 
					  'PartType1':'PartType1', 
					  'PartType2':'PartType2', 
					  'PartType4':'PartType4' }
		
		#flag to check if user has already defined the default values
		self.defined = False
		
		#amount to decimate the data before creating the json files (==1 means no decimates, >1 factor by which to reduce the amount of data)
		self.decimate = dict()
		
		#keys from the hd5 file to include in the JSON file for Firefly (must at least include Coordinates)
		self.returnKeys = dict()
				
		#set the weight of the particles (to define the alpha value). This is a function that will calculate the weights
		self.weightFunction = dict()
		
		#set the radii of the particles. This is a function that will calculate the radii
		self.radiusFunction = dict()
		
		#decide whether you want to use the key from returnKeys as a filter item in the UI
		#NOTE: each of these must be the same length as self.returnKeys
		self.addFilter = dict()
  
		#should we use the log of these values?  
		#NOTE: this must be the same length as self.returnKeys
		self.dolog = dict()

		#should we use the magnitude of these values?   
		#NOTE: this must be the same length as self.returnKeys
		#NOTE: setting any of these to true will significantly slow down the file creation
		#NOTE: I calculate magnitude of velocity, if Velocities is supplied, in the web app.  No need to do it here for Velocities.
		self.domag = dict()
 
		#should we plot using Alex Gurvich's radial profile fit to the SPH particles (==1), or a simple symmetric radial profile?   
		#NOTE: this must be the same length as self.returnKeys
		self.doSPHrad = dict()
		
		#a dictionary of  for the WebGL app
		self.options = {'title':'Firefly', #set the title of the webpage
						########################
						#these settings are to turn on/off different bits of the user interface
						'UI':True, #do you want to show the UI?
						'UIparticle':dict(), #do you want to show the particles in the user interface (default = True). This is a dict with keys of the particle swapnames (as defined in self.names), and is boolean.
						'UIdropdown':dict(), #do you want to enable the dropdown menus for particles in the user interface (default = True).This is a dict with keys of the particle swapnames (as defined in self.names), and is boolean.
						'UIcolorPicker':dict(), #do you want to allow the user to change the color (default = True).This is a dict with keys of the particle swapnames (as defined in self.names), and is boolean.
						'UIfullscreen':True, #do you want to show the fullscreen button?
						'UIsnapshot':True, #do you want to show the snapshot button?
						'UIreset':True, #do you want to show the reset button?
						'UIsavePreset':True, #do you want to show the save preset button?
						'UIloadNewData':True, #do you want to show the load new data button?
						'UIcameraControls':True, #do you want to show the camera controls
						'UIdecimation':True, #do you want to show the decimation slider
						########################
						#these settings affect how the data are displayed
						'center':None, #do you want to define the initial camera center (if not, the WebGL app will calculate the center as the mean of the coordinates of the first particle set loaded in) (should be an np.array of length 3: x,y,z)
						'camera':None, #initial camera location, NOTE: the magnitude must be >0 (should be an np.array of length 3: x,y,z)
						'cameraRotation':None, #can set camera rotation if you want (should be an np.array of length 3: xrot, yrot, zrot, in radians)
						'maxVrange':2000., #maximum range in velocities to use in deciding the length of the velocity vectors (making maxVrange larger will enhance the difference between small and large velocities)
						'startFly':False, #start in Fly controls? (if False, then start in the default Trackball controls)
						'friction':None, #set the initial friction for the controls (default is 0.1)
						'stereo':False, #start in stereo mode?
						'stereoSep':None, #camera (eye) separation in the stereo mode (default is 0.06, should be < 1)
						'decimate':None, #set the initial decimation (e.g, you could load in all the data, but setting self.decimate to 1 above, but only display some fraction by setting self.options.decimate > 1 here).  This is a single value (not a dict)
						'plotNmax':dict(), #maximum initial number of particles to plot (can be used to decimate on a per particle basis).  This is a dict with keys of the particle swapnames (as defined in self.names)
						'showVel':dict(), #start by showing the velocity vectors?  This is a dict with keys of the particle swapnames (as defined in self.names), and is boolean
						'velType':dict(), #default type of velocity vectors to plot.  This is a dict with keys of the particle swapnames (as defined in self.names), and must be either 'line', 'arrow', or 'triangle'.  (default is 'line')
						'color':dict(), #set the default color, This is a dict with keys of the particle swapnames (as defined in self.names), must contain 4-element lists with rgba. (default is random colors with a = 1)
						'sizeMult':dict(), #set the default point size multiplier. This is a dict with keys of the particle swapnames (as defined in self.names), default for all sizes is 1.
						'showParts':dict(), #show particles by default. This is a dict with keys of the particle swapnames (as defined in self.names), boolean, default is true.
						'filterVals':dict(), #initial filtering selection. This is a dict with initial keys of the particle swapnames (as defined in self.names), then for each filter the [min, max] range (e.g., 'filter':{'Gas':{'log10Density':[0,1],'magVelocities':[20, 100]}} )
						'filterLims':dict(), #initial [min, max] limits to the filters. This is a dict with initial keys of the particle swapnames (as defined in self.names), then for each filter the [min, max] range (e.g., 'filter':{'Gas':{'log10Density':[0,1],'magVelocities':[20, 100]}} )

						########################
						#this should not be modified
						'loaded':True, #used in the web app to check if the options have been read in

					  } 
		
		#the prefix of the the JSON files
		self.JSONfname = 'FIREdata'
		
		#write the startup file?
		self.writeStartup = True

		#remove the data files in the dataDir directory before adding more?
		self.cleanDataDir = False
		
		#set the maximum number of particles per data file
		self.maxppFile = 1e4

		#in case you want to print the available keys to the screen
		self.showkeys = False
		
		#directory to place all the data files in (assumed to be within the current directory)
		self.dataDir = None

	"""


	def __init__(self, *args,**kwargs):
##################################################        
#defaults that can be modified

		#directory that contains all the hdf5 data files
		self.directory = './' 
		
		#snapshot number to open
		self.snapnum = None

		#particles to return
		self.returnParts = ['PartType0', 'PartType1', 'PartType2', 'PartType4']
 
		#set names for the particle sets (note: these will be used in the UI of Firefly; 4 characters or less is best)
		self.names = {'PartType0':'PartType0', 
					  'PartType1':'PartType1', 
					  'PartType2':'PartType2', 
					  'PartType4':'PartType4' }
		
		#flag to check if user has already defined the default values
		self.defined = False
		
		#amount to decimate the data before creating the json files (==1 means no decimates, >1 factor by which to reduce the amount of data)
		self.decimate = dict()
		
		#keys from the hd5 file to include in the JSON file for Firefly (must at least include Coordinates)
		self.returnKeys = dict()
				
		#set the weight of the particles (to define the alpha value). This is a function that will calculate the weights
		self.weightFunction = dict()
		
		#set the radii of the particles. This is a function that will calculate the radii
		self.radiusFunction = dict()
		
		#decide whether you want to use the key from returnKeys as a filter item in the UI
		#NOTE: each of these must be the same length as self.returnKeys
		self.addFilter = dict()
  
		#should we use the log of these values?  
		#NOTE: this must be the same length as self.returnKeys
		self.dolog = dict()

		#should we use the magnitude of these values?   
		#NOTE: this must be the same length as self.returnKeys
		#NOTE: setting any of these to true will significantly slow down the file creation
		#NOTE: I calculate magnitude of velocity, if Velocities is supplied, in the web app.  No need to do it here for Velocities.
		self.domag = dict()
 
		#should we plot using Alex Gurvich's radial profile fit to the SPH particles (==1), or a simple symmetric radial profile?   
		#NOTE: this must be the same length as self.returnKeys
		self.doSPHrad = dict()
		
		#a dictionary of  for the WebGL app
		self.options = {'title':'Firefly', #set the title of the webpage
						########################
						#these settings are to turn on/off different bits of the user interface
						'UI':True, #do you want to show the UI?
						'UIparticle':dict(), #do you want to show the particles in the user interface (default = True). This is a dict with keys of the particle swapnames (as defined in self.names), and is boolean.
						'UIdropdown':dict(), #do you want to enable the dropdown menus for particles in the user interface (default = True).This is a dict with keys of the particle swapnames (as defined in self.names), and is boolean.
						'UIcolorPicker':dict(), #do you want to allow the user to change the color (default = True).This is a dict with keys of the particle swapnames (as defined in self.names), and is boolean.
						'UIfullscreen':True, #do you want to show the fullscreen button?
						'UIsnapshot':True, #do you want to show the snapshot button?
						'UIreset':True, #do you want to show the reset button?
						'UIsavePreset':True, #do you want to show the save preset button?
						'UIloadNewData':True, #do you want to show the load new data button?
						'UIcameraControls':True, #do you want to show the camera controls
						'UIdecimation':True, #do you want to show the decimation slider
						########################
						#these settings affect how the data are displayed
						'center':None, #do you want to define the initial camera center (if not, the WebGL app will calculate the center as the mean of the coordinates of the first particle set loaded in) (should be an np.array of length 3: x,y,z)
						'camera':None, #initial camera location, NOTE: the magnitude must be >0 (should be an np.array of length 3: x,y,z)
						'cameraRotation':None, #can set camera rotation if you want (should be an np.array of length 3: xrot, yrot, zrot, in radians)
						'maxVrange':2000., #maximum range in velocities to use in deciding the length of the velocity vectors (making maxVrange larger will enhance the difference between small and large velocities)
						'startFly':False, #start in Fly controls? (if False, then start in the default Trackball controls)
						'friction':None, #set the initial friction for the controls (default is 0.1)
						'stereo':False, #start in stereo mode?
						'stereoSep':None, #camera (eye) separation in the stereo mode (default is 0.06, should be < 1)
						'decimate':None, #set the initial decimation (e.g, you could load in all the data, but setting self.decimate to 1 above, but only display some fraction by setting self.options.decimate > 1 here).  This is a single value (not a dict)
						'plotNmax':dict(), #maximum initial number of particles to plot (can be used to decimate on a per particle basis).  This is a dict with keys of the particle swapnames (as defined in self.names)
						'showVel':dict(), #start by showing the velocity vectors?  This is a dict with keys of the particle swapnames (as defined in self.names), and is boolean
						'velType':dict(), #default type of velocity vectors to plot.  This is a dict with keys of the particle swapnames (as defined in self.names), and must be either 'line', 'arrow', or 'triangle'.  (default is 'line')
						'color':dict(), #set the default color, This is a dict with keys of the particle swapnames (as defined in self.names), must contain 4-element lists with rgba. (default is random colors with a = 1)
						'sizeMult':dict(), #set the default point size multiplier. This is a dict with keys of the particle swapnames (as defined in self.names), default for all sizes is 1.
						'showParts':dict(), #show particles by default. This is a dict with keys of the particle swapnames (as defined in self.names), boolean, default is true.
						'filterVals':dict(), #initial filtering selection. This is a dict with initial keys of the particle swapnames (as defined in self.names), then for each filter the [min, max] range (e.g., 'filter':{'Gas':{'log10Density':[0,1],'magVelocities':[20, 100]}} )
						'filterLims':dict(), #initial [min, max] limits to the filters. This is a dict with initial keys of the particle swapnames (as defined in self.names), then for each filter the [min, max] range (e.g., 'filter':{'Gas':{'log10Density':[0,1],'magVelocities':[20, 100]}} )

						########################
						#this should not be modified
						'loaded':True, #used in the web app to check if the options have been read in

					  } 
		
		#the prefix of the the JSON files
		self.JSONfname = 'FIREdata'
		
		#write the startup file?
		self.writeStartup = True

		#remove the data files in the dataDir directory before adding more?
		self.cleanDataDir = False
		
		#set the maximum number of particles per data file
		self.maxppFile = 1e4

		#in case you want to print the available keys to the screen
		self.showkeys = False
		
		#directory to place all the data files in (assumed to be within the current directory)
		self.dataDir = None


################################################## 
#don't modify these

		#the data for the JSON file
		self.partsDict = dict()
		
		#keys that shouldn't be shuffled or decimated
		self.nodecimate = ['filterKeys','doSPHrad']
		
		#keys for filtering (will be defined below)
		self.filterKeys = {}
		
		#will store all the file names that are produced (will be defined below in defineFilenames)
		self.filenames = dict()

		#will contain a list of the files in the order they are read
		self.loadedHDF5Files = []


		self.slash = '/'
		if os.name == 'nt':
			self.slash = '\\'


################################################## 
################################################## 
################################################## 
		
	def defineDefaults(self):
		self.defined = True
		for p in self.returnParts:
			#amount to decimate the data (==1 means no decimates, >1 factor by which to reduce the amount of data)
			self.decimate[p] = 1.

			#keys from the hdf5 file to include in the JSON file for Firefly (must at least include Coordinates)
			self.returnKeys[p] = ['Coordinates']      

			#set the weight of the particles (to define the alpha value). This is a function that will calculate the weights
			self.weightFunction[p] = None

			#set the radii of the particles. This is a function that will calculate the radii
			self.radiusFunction[p] = None

			#decide whether you want to use the key from returnKeys as a filter item in the UI
			self.addFilter[p] = [False]   

			#should we use the log of these values?  
			self.dolog[p] = [False]

			#should we use the magnitude of these values?   
			self.domag[p] = [False]

			#should we plot using Alex Gurvich's radial profile fit to the SPH particles (==1), or a simple symmetric radial profile?   
			self.doSPHrad[p] = [0]

			#options
			#dropdown menus
			pp = self.swapnames(p) 
			self.options['UIparticle'][pp] = True
			self.options['UIdropdown'][pp] = True
			self.options['UIcolorPicker'][pp] = True
			self.options['color'][pp] = [np.random.random(), np.random.random(), np.random.random(), 1.] #set the default color = rgba.  
			self.options['sizeMult'][pp] = 1. #set the default point size multiplier 
			self.options['showParts'][pp] = True
			
	#used self.names to swap the dictionary keys
	def swapnames(self, pin):
		return self.names[pin]

	#adds an array to the dict for a given particle set and data file 
	def addtodict(self, d, snap, part, dkey, sendlog, sendmag, usekey = None, mfac = 1., vals = None, filterFlag = False):
		if (usekey is None):
			ukey = dkey
		else:
			ukey = usekey
		
		if (vals is None):
			vals = snap[part + '/' + dkey][...] * mfac
		else:
			self.returnKeys[part].append(ukey)

		if (sendlog):
			ukey = "log10"+ukey
			vals = np.log10(vals)
		if (sendmag):  
			#print "calculating magnitude for ", ukey
			ukey = "mag"+ukey
			vals = [np.linalg.norm(v) for v in vals]
		 
		if ukey in list(d[part].keys()):
			d[part][ukey] = np.append(d[part][ukey], vals,  axis=0)
		else:
			d[part][ukey] = vals

		if (filterFlag):
			if ('filterKeys') not in d[part]:
				d[part]['filterKeys'] = []
			d[part]['filterKeys'].append(ukey)

	def check_if_filename_exists(self,sdir,snum,snapshot_name='snapshot',extension='.hdf5',four_char=0):

		for extension_touse in [extension,'.bin','']:
			fname=sdir+self.slash+snapshot_name+'_'
			ext='00'+str(snum);
			if (snum>=10): ext='0'+str(snum)
			if (snum>=100): ext=str(snum)
			if (four_char==1): ext='0'+ext
			if (snum>=1000): ext=str(snum)
			fname+=ext
			fname_base=fname

			s0=sdir.split(self.slash); snapdir_specific=s0[len(s0)-1];
			if(len(snapdir_specific)<=1): snapdir_specific=s0[len(s0)-2];

			## try several common notations for the directory/filename structure
			fname=fname_base+extension_touse;
			if not os.path.exists(fname): 
				## is it a multi-part file?
				fname=fname_base+'.0'+extension_touse;
			if not os.path.exists(fname): 
				## is the filename 'snap' instead of 'snapshot'?
				fname_base=sdir+self.slash+'snap_'+ext; 
				fname=fname_base+extension_touse;
			if not os.path.exists(fname): 
				## is the filename 'snap' instead of 'snapshot', AND its a multi-part file?
				fname=fname_base+'.0'+extension_touse;
			if not os.path.exists(fname): 
				## is the filename 'snap(snapdir)' instead of 'snapshot'?
				fname_base=sdir+self.slash+'snap_'+snapdir_specific+'_'+ext; 
				fname=fname_base+extension_touse;
			if not os.path.exists(fname): 
				## is the filename 'snap' instead of 'snapshot', AND its a multi-part file?
				fname=fname_base+'.0'+extension_touse;
			if not os.path.exists(fname): 
				## is it in a snapshot sub-directory? (we assume this means multi-part files)
				fname_base=sdir+self.slash+'snapdir_'+ext+self.slash+snapshot_name+'_'+ext; 
				fname=fname_base+'.0'+extension_touse;
			if not os.path.exists(fname): 
				## is it in a snapshot sub-directory AND named 'snap' instead of 'snapshot'?
				fname_base=sdir+self.slash+'snapdir_'+ext+self.slash+'snap_'+ext; 
				fname=fname_base+'.0'+extension_touse;
			if not os.path.exists(fname): 
				## wow, still couldn't find it... ok, i'm going to give up!
				fname_found = 'NULL'
				fname_base_found = 'NULL'
				fname_ext = 'NULL'
				continue;
			fname_found = fname;
			fname_base_found = fname_base;
			fname_ext = extension_touse
			break; # filename does exist! 
		return fname_found, fname_base_found, fname_ext                   

	#populate the dict
	def populate_dict(self):

		if self.snapnum is None:
			for fname in os.listdir(self.directory):
				self.openHDF5File(self.directory+self.slash+fname) 
		else:   
			fname_found,fname_base_found,fname_ext  = self.check_if_filename_exists(self.directory,self.snapnum)
			if (len(fname_found.split(self.slash)) - len(self.directory.split(self.slash)))>1:
				if os.name == 'nt':
					new_directory = fname_found[0:fname_found.rfind(self.slash)]
				else:
					new_directory = self.slash+os.path.join(*fname_found.split(self.slash)[:-1])
				for fname in os.listdir(new_directory):
					self.openHDF5File(new_directory + self.slash + fname)
			else:
			   self.openHDF5File(fname_found) 


		#and on some of the options here
		for p in list(self.partsDict.keys()):
			self.partsDict[p]['filterKeys'] = self.filterKeys[p]
			self.partsDict[p]['doSPHrad'] = self.doSPHrad[p]


	def shuffle_dict(self):
		#should we decimate the data? (NOTE: even if decimate = 1, it is wise to shuffle the data so it doesn't display in blocks)

		for p in list(self.partsDict.keys()):
	
			if (self.decimate[p] > 0): 
				if (self.decimate[p] > 1):
					print("decimating and shuffling ...")
				else:
					print("shuffling ... ")
				N = int(len(self.partsDict[p][self.returnKeys[p][0]]))
				indices = np.arange(N )
				dindices = np.random.choice(indices, size = int(round(N/self.decimate[p])))
				for k in list(self.partsDict[p].keys()):
					if (k not in self.nodecimate):
						self.partsDict[p][k] = self.partsDict[p][k][dindices]

	def swap_dict_names(self):
		#swap the names
		for p in list(self.partsDict.keys()):
			pp = self.swapnames(p)
			self.partsDict[pp] = self.partsDict.pop(p)
			
	def openHDF5File(self,fname):
		print(fname)
		self.loadedHDF5Files.append(fname)
		if (self.dataDir is None):
			self.dataDir = ""
			xx = fname.split(self.slash)
			ntry = 2
			while (len(self.dataDir) == 0 and ntry < len(xx)):
				self.dataDir = xx[-ntry]
				ntry += 1

		with h5py.File(fname,'r') as snap:
			foo = list(snap.keys())
			parts = foo[1:]
			for p in parts:
				if p in self.returnParts:
					if p not in self.partsDict:
						self.partsDict[p] = dict()
					vals = snap[p].keys()
					#This shows the available keys
					if (self.showkeys):
						print(p,self.swapnames(p), vals)
					if (self.radiusFunction[p] != None):
						self.radiusFunction[p](self, self.partsDict, snap, p)
					if (self.weightFunction[p] != None):
						self.weightFunction[p](self, self.partsDict, snap, p)
					for i,k in enumerate(self.returnKeys[p]):
						if (k in vals):
							self.addtodict(
								self.partsDict, snap, p, k, 
								self.dolog[p][i], self.domag[p][i])
			
	#create the JSON file, and then add the name of the variable (parts) that we want in Firefly
	def createJSON(self):
		print("writing JSON files ...")
		if (os.path.exists(self.dataDir) and self.cleanDataDir):
			print("REMOVING FILES FROM data"+self.slash+self.dataDir)	
			shutil.rmtree(self.dataDir)

		if (not os.path.exists(self.dataDir)):
		    os.makedirs(self.dataDir)

		self.defineFilenames()
		for p in self.partsDict:
			nprinted = 0
			print(p)
			for i,f in enumerate(self.filenames[p]):
				#print(f)
				outDict = dict()
				foo = 0
				for k in list(self.partsDict[p].keys()):
					if (isinstance(self.partsDict[p][k], list) or type(self.partsDict[p][k]) == np.ndarray):#len(self.partsDict[p][k]) > self.maxppFile):
						if (len(self.partsDict[p][k]) > nprinted):
							foo = int(np.floor(float(f[1])))
							#print("list", k, len(self.partsDict[p][k]), nprinted, foo)
							outDict[k] = self.partsDict[p][k][int(nprinted):(nprinted + foo)]
					else:
						if (i == 0):
							outDict[k] = self.partsDict[p][k]

				nprinted += foo
				pd.Series(outDict).to_json(f[0], orient='index')
		#for the options
		print(self.filenames['options'][0])
		self.createOptionsJSON()
		#the list of files
		pd.Series(self.filenames).to_json(self.dataDir + self.slash + 'filenames.json', orient='index') 
		#the startup file
		if (self.writeStartup):
			pd.Series({"0":"data" +self.slash+ self.dataDir}).to_json('startup.json', orient='index') 

		
	def defineFilenames(self):
		#first create the dict of file names and write that to a JSON file
		for p in self.partsDict:
			nparts = len(self.partsDict[p]['Coordinates'])
			nused = 0
			i = 0
			while nused < nparts:
				ninfile = min(self.maxppFile, nparts - nused)
				nused += ninfile
				foo = [self.dataDir + self.slash + self.JSONfname+p+str(i).zfill(3)+'.json', ninfile]
				if (i == 0):
					self.filenames[p] = [foo]
				else:
					self.filenames[p].append(foo)
				i += 1
			self.filenames[p] = np.array(self.filenames[p])

		#for the options
		self.filenames['options'] = np.array([self.dataDir + self.slash + self.JSONfname+'Options.json',0])
		
	def createOptionsJSON(self, file = None):
		#separated this out incase user wants to only write the options file
		if (file is None):
			file = self.filenames['options'][0]
		pd.Series(self.options).to_json(file, orient='index') 
 
	
	def defineFilterKeys(self):
		for p in self.returnParts:
			self.filterKeys[p] = []
			pp = self.swapnames(p) 
			self.options['filterVals'][pp] = dict()
			self.options['filterLims'][pp] = dict()
			j = 0

			if (len(self.addFilter[p]) < len(self.returnKeys[p])):
				self.addFilter[p] = np.full(len(self.returnKeys[p]), self.addFilter[p][0])
			if (len(self.dolog[p]) < len(self.returnKeys[p])):
				self.dolog[p] = np.full(len(self.returnKeys[p]), self.dolog[p][0])
			if (len(self.domag[p]) < len(self.returnKeys[p])):
				self.domag[p] = np.full(len(self.returnKeys[p]), self.domag[p][0])

			for i,k in enumerate(self.returnKeys[p]):
				if (self.addFilter[p][i]):
					self.filterKeys[p].append(k)
					if (self.dolog[p][i]):
						self.filterKeys[p][j] = 'log10' + self.filterKeys[p][j]
					if self.domag[p][i]:
						self.filterKeys[p][j] = 'mag' + self.filterKeys[p][j]
					self.options['filterVals'][pp][self.filterKeys[p][j]] = None
					self.options['filterLims'][pp][self.filterKeys[p][j]] = None
					j += 1
				#init.js will automatically add this to the filters if Velocities are provided in the data
				if (k == "Velocities"):
					self.options['filterVals'][pp]['magVelocities'] = None
					self.options['filterLims'][pp]['magVelocities'] = None

	def run(self):
		if (not self.defined):
			self.defineDefaults()
			
		self.defineFilterKeys()
		self.populate_dict()
		self.shuffle_dict()
		self.swap_dict_names()
		self.createJSON()
		print("done")

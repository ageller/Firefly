import numpy as np
import pandas as pd
import h5py,os, shutil

class FIREreader(object):
	"""
	#These are the defaults that can be redefined by the user at runtime.  
	#These defaults are only applied after running self.defineDefaults().

		#directory that contains all the hdf5 data files
		self.directory = './' 

		#particles to return
		self.returnParts = ['PartType0', 'PartType1', 'PartType2', 'PartType4']
 
		#set names for the particle sets (note: these will be used in the UI of Firefly; 4 characters or less is best)
		self.names = {'PartType0':'Gas', 
					  'PartType1':'HRDM', 
					  'PartType2':'LRDM', 
					  'PartType4':'Stars' }
		
		#flag to check if user has already defined the default values
		self.defined = False
		
		#amount to decimate the data (==1 means no decimates, >1 factor by which to reduce the amount of data)
		self.decimate = dict()
		
		#keys from the hd5 file to include in the JSON file for Firefly (must at least include Coordinates)
		self.returnKeys = dict()
		
		#set the default colors = rgba.  The alpha value here becomes a multiplier if weights are provided. 
		self.colors = dict()
		
		#set the weight of the particles (to define the alpha value). This is a function that will calculate the weights
		self.weightFunction = dict()
		
		#set the radii of the particles. This is a function that will calculate the radii
		self.radiusFunction = dict()
		
		#set the default point size multiplier 
		self.sizeMult = dict()

		#set the number of points to plot during each draw (larger numbers will make the visualization run more slowly)
		self.nMaxPlot = dict()
		
		#decide whether you want to use the key from returnKeys as a filter item in the UI
		#NOTE: each of these must be the same length as self.returnKeys
		self.addFilter = dict()
  
		#should we use the log of these values?  
		#NOTE: this must be the same length as self.returnKeys
		self.dolog = dict()

		#should we use the magnitude of these values?   
		#NOTE: this must be the same length as self.returnKeys
		#NOTE: setting any of these to true will significantly slow down the file creation
		self.domag = dict()
 
		#should we plot using Alex Gurvich's radial profile fit to the SPH particles (==1), or a simple symmetric radial profile?   
		#NOTE: this must be the same length as self.returnKeys
		self.doSPHrad = dict()
		
		#a dictionary of  for the WebGL app
		self.options = {'title':'Firefly', #set the title of the webpage
						'UIdropdown':dict(), #do you want to enable the dropdown menus for particles in the user interface (default = True)
						'UIcolorPicker':dict(), #do you want to allow the user to change the color (defulat = True)
						'UIfullscreen':True, #do you want to show the fullscreen button?
						'UIsnapshot':True, #do you want to show the snapshot button?
						'UIreset':True, #do you want to show the reset button?
						'UIcameraControls':True, #do you want to show the camera controls
						'center':None, #do you want to define the initial camera center (if not, the WebGL app will calculate the center as the mean of the coordinates of the first particle set loaded in)
						'camera':np.array([0., 0. -10]), #initial camera location, NOTE: the magnitude must be >0

					  } 
		
		#the name of the JSON file
		self.JSONfname = 'FIREdata'
		

		
		#in case you want to print the available keys to the screen
		self.showkeys = False

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
		self.names = {'PartType0':'Gas', 
					  'PartType1':'HRDM', 
					  'PartType2':'LRDM', 
					  'PartType4':'Stars' }
		
		#flag to check if user has already defined the default values
		self.defined = False
		
		#amount to decimate the data (==1 means no decimates, >1 factor by which to reduce the amount of data)
		self.decimate = dict()
		
		#keys from the hd5 file to include in the JSON file for Firefly (must at least include Coordinates)
		self.returnKeys = dict()
		
		#set the default colors = rgba.  The alpha value here becomes a multiplier if weights are provided. 
		self.colors = dict()
		
		#set the weight of the particles (to define the alpha value). This is a function that will calculate the weights
		self.weightFunction = dict()
		
		#set the radii of the particles. This is a function that will calculate the radii
		self.radiusFunction = dict()
		
		#set the default point size multiplier 
		self.sizeMult = dict()

		#set the number of points to plot during each draw (larger numbers will make the visualization run more slowly)
		self.nMaxPlot = dict()
		
		#decide whether you want to use the key from returnKeys as a filter item in the UI
		#NOTE: each of these must be the same length as self.returnKeys
		self.addFilter = dict()
  
		#should we use the log of these values?  
		#NOTE: this must be the same length as self.returnKeys
		self.dolog = dict()

		#should we use the magnitude of these values?   
		#NOTE: this must be the same length as self.returnKeys
		#NOTE: setting any of these to true will significantly slow down the file creation
		self.domag = dict()
 
		#should we plot using Alex Gurvich's radial profile fit to the SPH particles (==1), or a simple symmetric radial profile?   
		#NOTE: this must be the same length as self.returnKeys
		self.doSPHrad = dict()
		
		#a dictionary of  for the WebGL app
		self.options = {'title':'Firefly', #set the title of the webpage
						'UI':True, #do you want to show the UI?
						'UIparticle':dict(), #do you want to show the particles in the user interface (default = True)
						'UIdropdown':dict(), #do you want to enable the dropdown menus for particles in the user interface (default = True)
						'UIcolorPicker':dict(), #do you want to allow the user to change the color (default = True)
						'UIfullscreen':True, #do you want to show the fullscreen button?
						'UIsnapshot':True, #do you want to show the snapshot button?
						'UIreset':True, #do you want to show the reset button?
						'UIcameraControls':True, #do you want to show the camera controls
						'UIdecimation':True, #do you want to show the decimation slider
						'center':None, #do you want to define the initial camera center (if not, the WebGL app will calculate the center as the mean of the coordinates of the first particle set loaded in)
						'camera':np.array([0., 0., -10]), #initial camera location, NOTE: the magnitude must be >0
						'cameraRotation':None, #can set camera rotation if you want
						'loaded':True, #used in the web app to check if the options have been read in
					  } 
		
		#the name of the JSON file
		self.JSONfname = 'FIREdata'
		
		#remove the data files in the dataDir directory before adding more?
		self.cleanDataDir = False
		
		#set the maximum number of particles per data file
		self.maxppFile = 1e4

		#in case you want to print the available keys to the screen
		self.showkeys = False
		
################################################## 
#don't modify these

		#the data for the JSON file
		self.partsDict = dict()
		
		#keys that shouldn't be shuffled or decimated
		self.nodecimate = ['color','sizeMult','filterKeys','doSPHrad', 'nMaxPlot']
		
		#keys for filtering (will be defined below)
		self.filterKeys = {}
		
		#will store all the file names that are produced (will be defined below in defineFilenames)
		self.filenames = dict()



		#directory to place all the data files in
		self.dataDir = None



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

			#set the default colors = rgba.  The alpha value here becomes a multiplier if weights are provided. 
			self.colors[p] = [np.random.random(), np.random.random(), np.random.random(), 1.]

			#set the weight of the particles (to define the alpha value). This is a function that will calculate the weights
			self.weightFunction[p] = None

			#set the radii of the particles. This is a function that will calculate the radii
			self.radiusFunction[p] = None

			#set the default point size multiplier 
			self.sizeMult[p] = 1.

			#set the number of points to plot during each draw (larger numbers will make the visualization run more slowly)
			self.nMaxPlot[p] = 1e4

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
			
	#used self.names to swap the dictionary keys
	def swapnames(self, pin):
		return self.names[pin]

	#adds an array to the dict for a given particle set and data file 
	def addtodict(self, d, snap, part, dkey, sendlog, sendmag, usekey = None, mfac = 1.):
		if (usekey == None):
			ukey = dkey
		else:
			ukey = usekey
			
		vals = snap[part + '/' + dkey][...] * mfac      
		if (sendlog):
			ukey = "log10"+ukey
			vals = np.log10(vals)
		if (sendmag):  
			#print "calculating magnitude for ", ukey
			ukey = "mag"+ukey
			vals = [np.linalg.norm(v) for v in vals]
		 
		if ukey in list(d[part].keys()):
			d[part][ukey] = np.append(vals, d[part][ukey], axis=0)
		else:
			d[part][ukey] = vals

	def check_if_filename_exists(self,sdir,snum,snapshot_name='snapshot',extension='.hdf5',four_char=0):
		for extension_touse in [extension,'.bin','']:
			fname=sdir+'/'+snapshot_name+'_'
			ext='00'+str(snum);
			if (snum>=10): ext='0'+str(snum)
			if (snum>=100): ext=str(snum)
			if (four_char==1): ext='0'+ext
			if (snum>=1000): ext=str(snum)
			fname+=ext
			fname_base=fname

			s0=sdir.split("/"); snapdir_specific=s0[len(s0)-1];
			if(len(snapdir_specific)<=1): snapdir_specific=s0[len(s0)-2];

			## try several common notations for the directory/filename structure
			fname=fname_base+extension_touse;
			if not os.path.exists(fname): 
				## is it a multi-part file?
				fname=fname_base+'.0'+extension_touse;
			if not os.path.exists(fname): 
				## is the filename 'snap' instead of 'snapshot'?
				fname_base=sdir+'/snap_'+ext; 
				fname=fname_base+extension_touse;
			if not os.path.exists(fname): 
				## is the filename 'snap' instead of 'snapshot', AND its a multi-part file?
				fname=fname_base+'.0'+extension_touse;
			if not os.path.exists(fname): 
				## is the filename 'snap(snapdir)' instead of 'snapshot'?
				fname_base=sdir+'/snap_'+snapdir_specific+'_'+ext; 
				fname=fname_base+extension_touse;
			if not os.path.exists(fname): 
				## is the filename 'snap' instead of 'snapshot', AND its a multi-part file?
				fname=fname_base+'.0'+extension_touse;
			if not os.path.exists(fname): 
				## is it in a snapshot sub-directory? (we assume this means multi-part files)
				fname_base=sdir+'/snapdir_'+ext+'/'+snapshot_name+'_'+ext; 
				fname=fname_base+'.0'+extension_touse;
			if not os.path.exists(fname): 
				## is it in a snapshot sub-directory AND named 'snap' instead of 'snapshot'?
				fname_base=sdir+'/snapdir_'+ext+'/'+'snap_'+ext; 
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
				self.openHDF5File(self.directory+'/'+fname) 
		else:   
			fname_found,fname_base_found,fname_ext  = self.check_if_filename_exists(self.directory,self.snapnum)
			if (len(fname_found.split('/')) - len(self.directory.split('/')))>1:
				new_directory = '/'+os.path.join(*fname_found.split('/')[:-1])
				for fname in os.listdir(new_directory):
					self.openHDF5File(new_directory + '/' + fname)
			else:
			   self.openHDF5File(fname_found) 


		#and add on the colors and point size defaults
		#also calculate the magnitude where necessary
		for p in list(self.partsDict.keys()):
			self.partsDict[p]['color'] = self.colors[p]
			self.partsDict[p]['sizeMult'] = self.sizeMult[p]
			self.partsDict[p]['filterKeys'] = self.filterKeys[p]
			self.partsDict[p]['doSPHrad'] = self.doSPHrad[p]
			self.partsDict[p]['nMaxPlot'] = self.nMaxPlot[p]

					
			#should we decimate the data? (NOTE: even if decimate = 1, it is wise to shuffle the data so it doesn't display in blocks)
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

		#swap the names
		for p in list(self.partsDict.keys()):
			pp = self.swapnames(p)
			self.partsDict[pp] = self.partsDict.pop(p)
			
	def openHDF5File(self,fname):
		print(fname)
		if (self.dataDir == None):
			self.dataDir = ""
			xx = fname.split('/')
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
			print("REMOVING FILES FROM data/"+self.dataDir)	
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
		pd.Series(self.filenames).to_json('filenames.json', orient='index') 

		
	def defineFilenames(self):
		#first create the dict of file names and write that to a JSON file
		for p in self.partsDict:
			nparts = len(self.partsDict[p]['Coordinates'])
			nused = 0
			i = 0
			while nused < nparts:
				ninfile = min(self.maxppFile, nparts - nused)
				nused += ninfile
				foo = [self.dataDir + '/' + self.JSONfname+p+str(i).zfill(3)+'.json', ninfile]
				if (i == 0):
					self.filenames[p] = [foo]
				else:
					self.filenames[p].append(foo)
				i += 1
			self.filenames[p] = np.array(self.filenames[p])

		#for the options
		self.filenames['options'] = np.array([self.dataDir + '/' + self.JSONfname+'Options.json',0])
		
	def createOptionsJSON(self):
		#separated this out incase user wants to only write the options file
		pd.Series(self.options).to_json(self.filenames['options'][0], orient='index') 
 
	
	def defineFilterKeys(self):
		for p in self.returnParts:
			self.filterKeys[p] = []
			j = 0
			for i,k in enumerate(self.returnKeys[p]):
				if (self.addFilter[p][i]):
					self.filterKeys[p].append(k)
					if (self.dolog[p][i]):
						self.filterKeys[p][j] = 'log10' + self.filterKeys[p][j]
					if self.domag[p][i]:
						self.filterKeys[p][j] = 'mag' + self.filterKeys[p][j]
					j += 1
		#print "filters = ", self.filterKeys
		


	def run(self):
		if (not self.defined):
			self.defineDefaults()
			
		self.defineFilterKeys()
		self.populate_dict()
		self.createJSON()
		print("done")

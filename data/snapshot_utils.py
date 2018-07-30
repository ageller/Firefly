import h5py,sys,os
import numpy as np

## physics helper functions
def getTemperature(
	U_code,
	helium_mass_fraction=None,
	ElectronAbundance=None,
	mu = None):
	"""U_code = snapdict['InternalEnergy']
	helium_mass_fraction = snapdict['Metallicity'][:,1]
	ElectronAbundance= snapdict['ElectronAbundance']"""
	U_cgs = U_code*1e10
	gamma=5/3.
	kB=1.38e-16 #erg /K
	m_proton=1.67e-24 # g
	if mu is None:
		## not provided from chimes, hopefully you sent me helium_mass_fraction and
		##	electron abundance!
		try: 
			assert helium_mass_fraction is not None
			assert ElectronAbundance is not None
		except AssertionError:
			raise ValueError(
				"You need to either provide mu or send helium mass fractions and electron abundances to calculate it!")
		y_helium = helium_mass_fraction / (4*(1-helium_mass_fraction))
		mu = (1.0 + 4*y_helium) / (1+y_helium+ElectronAbundance) 
	mean_molecular_weight=mu*m_proton
	return mean_molecular_weight * (gamma-1) * U_cgs / kB

def getAgesGyrs(open_snapshot):
	cosmo_sfts=open_snapshot['StellarFormationTime']
	cur_time = open_snapshot['Time']
	HubbleParam = open_snapshot['HubbleParam']
	Omega0 = open_snapshot['Omega0']
	return convertStellarAges(HubbleParam,Omega0,cosmo_sfts,cur_time)

def convertStellarAges(HubbleParam,Omega0,stellar_tform,Time):
	""" Assumes a flat cosmology"""
	km_per_kpc = 3.086e16
	UnitTime_in_seconds = km_per_kpc / HubbleParam #/ 1 kms suppressed
	UnitTime_in_Megayears = UnitTime_in_seconds/3.1536e13
	Hubble_H0_CodeUnits = 3.2407789e-18 * UnitTime_in_seconds 
	a0 = stellar_tform
	a2 = Time
	x0 = (Omega0/(1-Omega0))/(a0*a0*a0)
	x2 = (Omega0/(1-Omega0))/(a2*a2*a2)
	age = (2./(3.*np.sqrt(1-Omega0)))*np.log(np.sqrt(x0*x2)/((np.sqrt(1+x2)-1)*(np.sqrt(1+x0)+1)))
	age *= 1./Hubble_H0_CodeUnits
	age *= 0.001*UnitTime_in_Megayears/HubbleParam
	return age

def get_fnames(snapdir,snapnum):
	fnames = [os.path.join(snapdir,fname) for fname in os.listdir(snapdir) if "_%03d"%snapnum in fname]
	if len(fnames) > 1:
		raise Exception("Too many files found for that snapnum!",fnames)

	try:
		if os.path.isdir(fnames[0]):
			fnames = [os.path.join(fnames[0],fname) for fname in os.listdir(fnames[0])]
	except IndexError:
		raise IOError("Snapshot %d not found in %s"%(snapnum,snapdir))
	
	return fnames

def fillHeader(dictionary,handle):
	for hkey in handle['Header'].attrs.keys():
		dictionary[hkey] = handle['Header'].attrs[hkey]

def get_unit_conversion(new_dictionary,pkey,cosmological):
	unit_fact = 1
	hinv = new_dictionary['HubbleParam']**-1
	if pkey in ['SmoothingLength','Masses','Coordinates']:
		unit_fact*=hinv
	if cosmological:
		ascale = 1/(1+new_dictionary['Redshift'])
		if pkey in ['SmoothingLength','Coordinates']:
			unit_fact*=ascale
		if pkey in ['Density']:
			unit_fact*=(hinv/((ascale*hinv)**3))
		if pkey in ['Velocity']:
			unit_fact*=ascale**0.5
	return unit_fact

def openSnapshot(
	snapdir,snapnum,ptype,
	snapshot_name='snapshot', extension='.hdf5',
	cosmological=0,header_only=0,
	keys_to_extract = None,
	fnames = None,
	chimes_keys = []):
	"""
	A straightforward function that concatenates snapshots by particle type and stores
	it all into a dictionary, inspired by Phil Hopkins' readsnap.py. It's
	flexible enough to be memory efficient, as well, if you'd like using the 
	`keys_to_extract` argument, just pass a list of snapshot keys you want to 
	keep and the rest will be ignored. You can have it automagically detect
	whether the snapshot lives in a snapdir or not (and is blind to your
	naming scheme, as long as it includes "_%03d"%snapnum-- which might get
	confused if you've got snapshots 100 and 1000, say) or you can just pass
	the list of filenames you want explicitly using the `fnames` argument.
	Input:
	snapdir - output directory that .hdf5 or snapdir/.hdf5 files live in
	snapnum - the snapshot number
	ptype - the particle type
	cosmological=False - flag for whether the snapshot is in comoving units,
		if HubbleParam in the Header != 1 then it is assumed to be cosmological
		and your choice is **OVERWRITTEN**, there's a friendly print statement
		telling you when this happens, so I accept no liability for bugs this 
		might induce...
	header_only=False - flag for retrieving the header information only
	keys_to_extract=None - list of snapshot keys to put in the final dictionary
		along with the header keys. If None, extracts all of them!
	fnames=None - list of (full) filepaths to open, if None goes and looks for the files
		inside snapdir.
	chimes_keys=[] - List of chemical abundances to extract from the snapshot, see 
		`chimes_dict` below. If you put a key that matches `chimes_dict`'s into 
		keys_to_extract it will be removed and automatically added to chimes_keys.
	"""

	## get filenames of the snapshot in question
	fnames = get_fnames(snapdir,snapnum) if fnames is None else fnames

	## split off chimes keys, if necessary
	if keys_to_extract is not None:
		popped = 0
	for i,key in enumerate(keys_to_extract):
		## if the key was put into keys_to_extract instead of chimes_key
		##	which is a uSER ERROR(!!)
		if key in chimes_dict or 'Abundance' in key:
		## transfer the key to the chimes_keys, WHERE IT BELONGS
			ckey = keys_to_extract.pop(i-popped)
			if 'Abundance' in ckey:
				ckey = ckey[:-len('Abundance')]
			chimes_keys+=[ckey]
			popped+=1
	
	new_dictionary = {}

	## save the ordering of the files if necessary
	new_dictionary['fnames']=fnames
	
	## need these keys to calculate the temperature
	##	create this list IFF I want temperature but NOT these keys in the dictionary
	temperature_keys = [
	'InternalEnergy',
	'Metallicity',
	'ElectronAbundance',
	'ChimesMu']*((keys_to_extract is not None) and ('Temperature' in keys_to_extract))
	age_keys = ['StellarFormationTime']*((keys_to_extract is not None) and ('AgeGyr' in keys_to_extract))


	for i,fname in enumerate(sorted(fnames)):
	## let the user know what snapshot file we're trying to open
		print(fname)
		with h5py.File(fname,'r') as handle:
			if i == 0:
				## read header once
				fillHeader(new_dictionary,handle)
				if new_dictionary['HubbleParam']!=1 and not cosmological:
					print('This is a cosmological snapshot... converting to physical units')
					cosmological=1
				if not header_only:
					## decide if the coordinates are in double precision, by default they are not
					if 'Flag_DoublePrecision' in new_dictionary and new_dictionary['Flag_DoublePrecision']:
						coord_dtype = np.float64
					else:
						coord_dtype = np.float32

					## initialize particle arrays
					for pkey in handle['PartType%d'%ptype].keys():
						if (keys_to_extract is None or pkey in keys_to_extract or pkey in temperature_keys or pkey in age_keys):
							unit_fact = get_unit_conversion(new_dictionary,pkey,cosmological)
							## handle potentially double precision coordinates
							if pkey == 'Coordinates':
								value = np.array(handle['PartType%d/%s'%(ptype,pkey)],dtype=coord_dtype)*unit_fact
							else:
								value = np.array(handle['PartType%d/%s'%(ptype,pkey)])*unit_fact
							new_dictionary[pkey] = value

				if ( (ptype == 0) and ('ChimesAbundances' in handle['PartType0'].keys())):
					for chimes_species in chimes_keys:
						chimes_index = chimes_dict[chimes_species] 
						new_dictionary[chimes_species+'Abundance']=np.array(handle['PartType0/ChimesAbundances'][:,chimes_index])
			else:
				if not header_only:
					## append particle array for each file
					for pkey in handle['PartType%d'%ptype].keys():
						if (keys_to_extract is None or pkey in keys_to_extract or pkey in temperature_keys or pkey in age_keys):
							unit_fact = get_unit_conversion(new_dictionary,pkey,cosmological)
							## handle potentially double precision coordinates
							if pkey == 'Coordinates':
								value = np.array(handle['PartType%d/%s'%(ptype,pkey)],dtype=coord_dtype)*unit_fact
							else:
								value = np.array(handle['PartType%d/%s'%(ptype,pkey)])*unit_fact
							new_dictionary[pkey] = np.append(new_dictionary[pkey],value,axis=0) 

	## get temperatures if this is a gas particle dataset
	if ( (ptype == 0) and 
	 (not header_only) and 
		 (keys_to_extract is None or 'Temperature' in keys_to_extract)):

		if 'ChimesMu' in new_dictionary:
			new_dictionary['Temperature']=getTemperature(
				new_dictionary['InternalEnergy'],
				mu = new_dictionary['ChimesMu'])
		else:
			new_dictionary['Temperature']=getTemperature(
				new_dictionary['InternalEnergy'],
				new_dictionary['Metallicity'][:,1],
				new_dictionary['ElectronAbundance'])

		## remove the keys in temperature keys that are not in keys_to_extract, if it is not None
		##  in case we wanted the metallicity and the temperature, but not the electron abundance 
		##  and internal energy, for instance
		subtract_set = set(temperature_keys) if keys_to_extract is None else set(keys_to_extract)
		for key in (set(temperature_keys) - subtract_set):
			try:
				new_dictionary.pop(key)
			except KeyError:
				## well it wasn't in there anyway!
				pass
	
	## get stellar ages if this is a star particle dataset
	if ( (ptype == 4) and 
	 ('StellarFormationTime' in new_dictionary.keys()) and
	 (keys_to_extract is None or 'AgeGyr' in keys_to_extract) ): 
		if cosmological:
			## cosmological galaxy -> SFT is in scale factor, need to convert to age
			new_dictionary['AgeGyr']=getAgesGyrs(new_dictionary)
		else:
			## isolated galaxy -> SFT is in Gyr, just need the age then
			new_dictionary['AgeGyr']=(new_dictionary['Time']-new_dictionary['StellarFormationTime'])/0.978 #Gyr

		## remove the keys in temperature keys that are not in keys_to_extract, if it is not None
		subtract_set = set(age_keys) if keys_to_extract is None else set(keys_to_extract)
		for key in (set(age_keys) - subtract_set):
			new_dictionary.pop(key)
	
	return new_dictionary

## thanks Alex Richings!
def read_chimes(filename, chimes_species): 
	''' filename - string containing the name of the HDF5 file to read in. 
		chimes_species - string giving the name of the ion/molecule to extract.''' 

	h5file = h5py.File(filename, "r") 

	try: 
		chimes_index = chimes_dict[chimes_species] 
	except KeyError: 
		print("Error: species %s is not recognised in the CHIMES abundance array. Aborting." % (chimes_species, ) )
		return 

	output_array = h5file["PartType0/ChimesAbundances"][:, chimes_index] 
	h5file.close() 

	return output_array 

chimes_dict = {"elec": 0,
			   "HI": 1,"HII": 2,"Hm": 3,"HeI": 4,
			   "HeII": 5,"HeIII": 6,"CI": 7,"CII": 8,
			   "CIII": 9,"CIV": 10,"CV": 11,"CVI": 12,
			   "CVII": 13,"Cm": 14,"NI": 15,"NII": 16,
			   "NIII": 17,"NIV": 18,"NV": 19,"NVI": 20,
			   "NVII": 21,"NVIII": 22,"OI": 23,"OII": 24,
			   "OIII": 25,"OIV": 26,"OV": 27,"OVI": 28,
			   "OVII": 29,"OVIII": 30,"OIX": 31,"Om": 32,
			   "NeI": 33,"NeII": 34,"NeIII": 35,"NeIV": 36,
			   "NeV": 37,"NeVI": 38,"NeVII": 39,"NeVIII": 40,
			   "NeIX": 41,"NeX": 42,"NeXI": 43,"MgI": 44,
			   "MgII": 45,"MgIII": 46,"MgIV": 47,"MgV": 48,
			   "MgVI": 49,"MgVII": 50,"MgVIII": 51,"MgIX": 52,
			   "MgX": 53,"MgXI": 54,"MgXII": 55,"MgXIII": 56,
			   "SiI": 57,"SiII": 58,"SiIII": 59,"SiIV": 60,
			   "SiV": 61,"SiVI": 62,"SiVII": 63,"SiVIII": 64,
			   "SiIX": 65,"SiX": 66,"SiXI": 67,"SiXII": 68,
			   "SiXIII": 69,"SiXIV": 70,"SiXV": 71,"SI": 72,
			   "SII": 73,"SIII": 74,"SIV": 75,"SV": 76,
			   "SVI": 77,"SVII": 78,"SVIII": 79,"SIX": 80,
			   "SX": 81,"SXI": 82,"SXII": 83,"SXIII": 84,
			   "SXIV": 85,"SXV": 86,"SXVI": 87,"SXVII": 88,
			   "CaI": 89,"CaII": 90,"CaIII": 91,"CaIV": 92,
			   "CaV": 93,"CaVI": 94,"CaVII": 95,"CaVIII": 96,
			   "CaIX": 97,"CaX": 98,"CaXI": 99,"CaXII": 100,
			   "CaXIII": 101,"CaXIV": 102,"CaXV": 103,"CaXVI": 104,
			   "CaXVII": 105,"CaXVIII": 106,"CaXIX": 107,"CaXX": 108,
			   "CaXXI": 109,"FeI": 110,"FeII": 111,"FeIII": 112,
			   "FeIV": 113,"FeV": 114,"FeVI": 115,"FeVII": 116,
			   "FeVIII": 117,"FeIX": 118,"FeX": 119,"FeXI": 120,
			   "FeXII": 121,"FeXIII": 122,"FeXIV": 123,"FeXV": 124,
			   "FeXVI": 125,"FeXVII": 126,"FeXVIII": 127,"FeXIX": 128,
			   "FeXX": 129,"FeXXI": 130,"FeXXII": 131,"FeXXIII": 132,
			   "FeXXIV": 133,"FeXXV": 134,"FeXXVI": 135,"FeXXVII": 136,
			   "H2": 137,"H2p": 138,"H3p": 139,"OH": 140,
			   "H2O": 141,"C2": 142,"O2": 143,"HCOp": 144,
			   "CH": 145,"CH2": 146,"CH3p": 147,"CO": 148,
			   "CHp": 149,"CH2p": 150,"OHp": 151,"H2Op": 152,
			   "H3Op": 153,"COp": 154,"HOCp": 155,"O2p": 156}

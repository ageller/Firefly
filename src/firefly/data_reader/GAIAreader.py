import os
import time
import multiprocessing
import h5py
import itertools

import numpy as np
import pandas as pd

from scipy.interpolate import interp1d

from abg_python.system_utils import printProgressBar

from .octree import init_octree_root_node
from .json_utils import load_from_json,write_to_json

from .particlegroup import OctreeParticleGroup
from .reader import Reader

try:
    from astropy.table import Table, Column
    import astropy.units as u
    from astropy.coordinates import SkyCoord, ICRS
    from astropy.io import ascii
except ImportError:
    raise ImportError("astropy, which is required to use Gaia reader, is not installed.")


class GaiaReader(Reader):
    def __init__(
        self,
        gaiadir=None,
        limiting_mag=None,
        nthreads=1,
        use_mps=True,
        min_to_refine=10**5,
        nrecurse=0,
        **kwargs):

        self.particleGroups = []

        if gaiadir is None: gaiadir = os.path.join(os.environ['HOME'],'projects','gaia','GaiaSource')

        ## bind input
        self.gaiadir = gaiadir
        self.limiting_mag = limiting_mag
        self.nthreads = nthreads
        self.use_mps = use_mps

        ## load the no RV data
        target_directory = os.path.join(os.path.dirname(gaiadir),os.path.dirname(gaiadir),'DR3-noRV')
        if not os.path.isfile(os.path.join(target_directory,'octree.json')):
            self.initOctree(target_directory,radial_velocity=False)

        ## creating the pg will trigger the octree build (which will pick up where 
        ##  it left off if it didn't finish)
        no_rv_pg = OctreeParticleGroup(
            'DR3-noRV',
            target_directory,
            nthreads=nthreads,
            min_to_refine=min_to_refine*10,
            nrecurse=nrecurse,
            ## purple
            color=(120/256, 41/256, 173/256,1),
            radiusVariable='phot_g_mean_mag',
            colormapVariable='bp_rp',
            showColormap=True,
            colormap='coolwarm',
            sizeMult=1,
            use_mps=use_mps,
            field_radius_flags=[False,True,False])

        ## load the RV data
        target_directory = os.path.join(os.path.dirname(gaiadir),os.path.dirname(gaiadir),'DR3-RV')
        if not os.path.isfile(os.path.join(target_directory,'octree.json')):
            self.initOctree(target_directory,radial_velocity=True)
        ## creating the pg will trigger the octree build (which will pick up where 
        ##  it left off if it didn't finish)
        rv_pg = OctreeParticleGroup(
            'DR3-RV',
            target_directory,
            nthreads=nthreads,
            min_to_refine=min_to_refine,
            nrecurse=nrecurse,
            ## green
            color=(61/256, 248/256, 116/256,1),
            radiusVariable='phot_g_mean_mag',
            colormapVariable='bp_rp',
            showColormap=True,
            colormap='coolwarm',
            sizeMult=1,
            use_mps=use_mps,
            field_radius_flags=[False,True,False]
            )

        super().__init__(
            datadir=os.path.dirname(gaiadir), 
            file_prefix='GaiaData',
            **kwargs)
        
        ## track the two particle groups
        self.addParticleGroup(no_rv_pg)
        self.addParticleGroup(rv_pg)

        for pg in self.particleGroups:
            self.settings['sizeMult'][pg.UIname] = 0.1
            self.settings['depthTest'][pg.UIname] = True
            self.settings['blendingMode'][pg.UIname] = 'normal'
            self.settings['colormapVals'][pg.UIname]['bp_rp'] = [0.5,3.4]
            self.settings['colormapLims'][pg.UIname]['bp_rp'] = [0.5,3.4]
            
        #self.settings['GUIExcludeList'] += ['colorbarcontainer']
        #self.settings['showParts']['DR3-RV'] = False
        self.settings['collapseGUIAtStart'] = False
        self.settings['camera'] = [0,0,0]
        self.settings['cameraRotation'] = [-1.5,0,-1.5]
        self.settings['startFly'] = True

    def initOctree(
        self,
        target_directory,
        radial_velocity=True):

        print(f"Initializing octree... for {self}")
        octree_dicts = self.retrieve_gaia_data(radial_velocity,target_directory,return_arrays=False)
        
        ## undo averaging in first chunk
        root_node_dict = octree_dicts[0]['nodes']['']

        ## determine which keys were averaged
        accumulator_keys = (['center_of_mass'] +
                ['com_velocity']*octree_dicts[0]['has_velocities'] + 
                ['rgba_color']*octree_dicts[0]['has_colors'])
        
        ## determine how averaging was performed
        if octree_dicts[0]['weight_index'] is None: weight_key = 'nparts'
        else: weight_key = octree_dicts[0]['field_names'][octree_dicts[0]['weight_index']]

        ## undo averaging for accumulated fields
        for key in accumulator_keys: root_node_dict[key] *= root_node_dict[weight_key]

        ## undo averaging for radius
        root_node_dict['radius'] = root_node_dict['radius']**2*root_node_dict[weight_key]

        widths = np.zeros(self.nthreads)
        widths[0] = root_node_dict['width']

        ## merge chunks that follow the first
        printProgressBar(0,self.nthreads-1)
        for i,sub_root_dict in enumerate(octree_dicts[1:]):
            printProgressBar(i+1,self.nthreads-1)

            this_node_dict = sub_root_dict['nodes']['']
            widths[i+1] = this_node_dict['width']

            ## straight addition only
            for key in ['files','nparts','buffer_size']:
                root_node_dict[key] += this_node_dict[key]
            
            ## undo averaging
            for key in accumulator_keys: 
                root_node_dict[key] += this_node_dict[key]*this_node_dict[weight_key]
            
            ## radius needs to be squared and then have the average undone
            root_node_dict['radius'] += this_node_dict[key]**2*this_node_dict[weight_key]

        printProgressBar(i+1,self.nthreads-1)

        ## re-apply the averaging denominator
        for key in accumulator_keys: root_node_dict[key] /= root_node_dict[weight_key]
        root_node_dict['radius'] = np.sqrt(root_node_dict['radius']/this_node_dict[weight_key])

        ## overwrite the width to be the max of the chunks
        root_node_dict['width'] = np.max(widths)
        
        print(f"Final width: {root_node_dict['width']:0.2f}")

        ## overwrite the octree.json file
        write_to_json(octree_dicts[0],os.path.join(target_directory,'octree.json'))

    def retrieve_gaia_data(
        self,
        radial_velocity=False,
        target_directory=None,
        return_arrays=True,
        max_radial_percentile=99,
        max_fnames=None):

        init_time = time.time()
        
        fnames = os.listdir(self.gaiadir)
        if max_fnames is not None: fnames = fnames[:max_fnames]

        ## prepend the full path to the gaia files
        fnames = [f'{self.gaiadir}/%s'%fname for fname in fnames]

        nthreads = min(len(fnames),self.nthreads)

        argss = zip(
            np.array_split(fnames,nthreads),
            itertools.repeat(target_directory),
            itertools.repeat(radial_velocity),
            itertools.repeat(self.limiting_mag),
            itertools.repeat(nthreads),
            np.arange(nthreads,dtype=int),
            itertools.repeat(max_radial_percentile),
            itertools.repeat(return_arrays), ## <-- signals to not write anything to disk and instead
            itertools.repeat(eval(multiprocessing.Process().name.split('-')[1])),
            itertools.repeat(int(len(fnames)//nthreads)+1)
        )

        ## initialize each chunk of the root node
        if not self.use_mps or nthreads <= 1: octree_dicts = [MPSwrapper(*args) for args in argss]
        else: 
            with multiprocessing.Pool(min(len(fnames),multiprocessing.cpu_count())) as my_pool:
                octree_dicts = my_pool.starmap(MPSwrapper,argss)
        
        print(f"\n{time.time()-init_time} s elapsed")
    
        return octree_dicts
 
def MPSwrapper(
    filenames,
    target_directory,
    radial_velocity,
    limiting_mag=None,
    nthreads=1,
    thread_id=0,
    percentile=99,
    return_arrays=False,
    parent_pid=None,
    niters=None
    ):

    all_arrays = np.concatenate(
        [fetchGaiaData(
            fname,
            limiting_mag=limiting_mag,
            has_RV=radial_velocity) for fname in filenames],
        axis=1)

    coord_index = 3 if radial_velocity else 0
    rs = np.sqrt(np.sum(all_arrays[coord_index:coord_index+3]**2,axis=0))
    if percentile is not None: 
        rmask = rs <= np.percentile(rs,percentile)
        all_arrays = all_arrays[:,rmask]
        #print(f' {np.sum(~rmask)} excluded on r %ile {float(percentile):0.2f}')

    ## take the arrays and put them into a dictionary
    keys = ['vx','vy','vz','x','y','z','bp_rp','phot_g_mean_mag']
    data_dict = dict(zip(keys[-all_arrays.shape[0]:],all_arrays)) 

    ## add the effective temperature to the dictionary
    add_temperature(data_dict)

    if parent_pid is not None:
        name = multiprocessing.Process().name.split('-')[1].split(':')
        if len(name) == 2:
            name,niter=eval(name[0]),eval(name[1])
            name = name-parent_pid-1
            if name == 0:
                printProgressBar(niter,niters)

    if not return_arrays: 
        root_dict = init_octree_root_node(
            data_dict,
            target_directory, ## <-- this will write the root-node data
            thread_id)

        return root_dict
    else: return data_dict
   
def fetchGaiaData(
    path,
    loud=False,
    limiting_mag=None,
    has_RV=True):

    outdfRV = readGaiaFile(path,limiting_mag,loud=loud,has_RV = has_RV)
    keys = list(outdfRV.keys())
    
    ## apply filter
    if loud: print(outdfRV[keys[0]].size,'before')
    for key in keys:

        mask = np.isfinite(outdfRV[key])
        if loud: print(key,np.sum(mask)/mask.size)
        for sub_key in keys:
            outdfRV[sub_key] = outdfRV[sub_key][mask]
    if loud: print(outdfRV[keys[0]].size,'after')

    return_value = np.array([outdfRV[key] for key in keys])

    return return_value

def readGaiaFile(path,limiting_mag,extra_keys=None,loud=False,has_RV=True):
    useGaiaData = {}
    
    if extra_keys is None: extra_keys  = []
    
    keys = ['dec','ra','parallax','pmdec','pmra','radial_velocity','bp_rp','phot_g_mean_mag'] + extra_keys
    
    with h5py.File(path,'r') as handle:
    
        for key in keys: 
            try:
                unit_strs = handle[key].attrs['unit'].decode('utf-8').split('.')
                units = 1
                for unit_str in unit_strs:
                    if '**-1' in unit_str: units/=getattr(u,unit_str[:-4])
                    else: units*=getattr(u,unit_str)
            except:
                print(unit_str)
                raise
            useGaiaData[key] = handle[key][()]*units
            nans = np.isnan(useGaiaData[key])
            #if loud: print(key,':',f"{np.sum(nans)/nans.size*100:.1f} %")
        #if loud: print(nans.size,'stars')

    mask = np.isfinite(useGaiaData['radial_velocity'])
    
    if not has_RV: mask = ~mask
    
    mask = np.logical_and(mask, useGaiaData['parallax'] > 0)
    
    outdict = {}
    
    if has_RV:
        astropy_coords = ICRS(
            ra = useGaiaData['ra'][mask], 
            dec = useGaiaData['dec'][mask], 
            distance = useGaiaData['parallax'][mask].to(u.parsec,equivalencies=u.parallax()),
            pm_ra_cosdec = useGaiaData['pmra'][mask],
            pm_dec = useGaiaData['pmdec'][mask],
            radial_velocity = useGaiaData['radial_velocity'][mask])

        ## store velocity data only if we have radial velocity
        outdict['vx'] = astropy_coords.velocity.d_x.value
        outdict['vy'] = astropy_coords.velocity.d_y.value
        outdict['vz'] = astropy_coords.velocity.d_z.value
    else:
        astropy_coords = ICRS(
            ra = useGaiaData['ra'][mask], 
            dec = useGaiaData['dec'][mask], 
            distance = useGaiaData['parallax'][mask].to(u.parsec,equivalencies=u.parallax()))
        
    outdict['x'] = astropy_coords.cartesian.x.value
    outdict['y'] = astropy_coords.cartesian.y.value
    outdict['z'] = astropy_coords.cartesian.z.value
 
    outdict['bp_rp'] = np.array(useGaiaData['bp_rp'])[mask]
    outdict['phot_g_mean_mag'] = np.array(useGaiaData['phot_g_mean_mag'])[mask]
    
    if limiting_mag is not None:
        key = 'phot_g_mean_mag'
        mask = outdict[key] <= limiting_mag
        for sub_key in keys: outdict[sub_key] = outdict[sub_key][mask]
            
    return outdict

def add_temperature(
    data_dict,
    bp_rp_interval=None,
    logT_interval=None):

    if bp_rp_interval is None: bp_rp_interval = (0,4)
    if logT_interval is None: logT_interval = (np.log10(2e3),5)

    data_dict['teff_bprp'] = remap_nonparametrically(
        data_dict['bp_rp'],
        bp_rp_interval,
        logT_interval)

def remap_nonparametrically(values,old_interval,new_interval):
    h,_ = np.histogram(values,bins=np.linspace(*old_interval))
    new_edges = np.linspace(*new_interval)
    probs = np.cumsum(h)/np.sum(h)
    probs[0] = 0
    inverter = interp1d(probs,new_edges[1:])
    new_values = inverter(np.random.uniform(0,1,values.shape[0]))
    
    sort_indices = np.argsort(values)
    new_values = np.sort(new_values)[np.argsort(sort_indices)]
    return new_values
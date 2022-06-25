import os
import time
import multiprocessing
import h5py
import itertools

import numpy as np
import pandas as pd

from scipy.interpolate import interp1d

from abg_python.system_utils import printProgressBar

from .octree_stream import init_octree_root_node
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

        if gaiadir is None: gaiadir = os.path.join(os.environ['HOME'],'projects','gaia','GaiaSource')

        ## load the no RV data
        target_directory = os.path.join(os.path.dirname(gaiadir),os.path.dirname(gaiadir),'DR3-noRV')
        if not os.path.isfile(os.path.join(target_directory,'octree.json')):
            self.initOctree(
                gaiadir,
                target_directory,
                radial_velocity=False,
                limiting_mag=limiting_mag,
                nthreads=nthreads,
                use_mps=use_mps)

        ## creating the pg will trigger the octree build (which will pick up where 
        ##  it left off if it didn't finish)
        no_rv_pg = OctreeParticleGroup(
            'DR3-noRV',
            target_directory,
            nthreads=nthreads,
            min_to_refine=1e6,
            nrecurse=nrecurse)

        ## load the RV data
        target_directory = os.path.join(os.path.dirname(gaiadir),os.path.dirname(gaiadir),'DR3-RV')
        if not os.path.isfile(os.path.join(target_directory,'octree.json')):
            print("no octree file detected, initializing...")
            self.initOctree(
                gaiadir,
                target_directory,
                radial_velocity=True,
                limiting_mag=limiting_mag,
                nthreads=nthreads,
                use_mps=use_mps)
            print('done!')
        ## creating the pg will trigger the octree build (which will pick up where 
        ##  it left off if it didn't finish)
        rv_pg = OctreeParticleGroup(
            'DR3-RV',
            target_directory,
            nthreads=nthreads,
            min_to_refine=min_to_refine,
            nrecurse=nrecurse)

        super().__init__(
            datadir=os.path.dirname(gaiadir), 
            file_prefix='GaiaData',
            **kwargs)
        
        ## track the two particle groups
        self.addParticleGroup(no_rv_pg)
        self.addParticleGroup(rv_pg)

    def initOctree(
        self,
        gaiadir,
        target_directory,
        radial_velocity=True,
        limiting_mag=None,
        nthreads=1,
        use_mps=False):

        init_time = time.time()
        
        fnames = os.listdir(gaiadir)
        ## prepend the full path to the gaia files
        fnames = [f'{gaiadir}/%s'%fname for fname in fnames]

        argss = zip(
            np.array_split(fnames,nthreads),
            itertools.repeat(target_directory),
            itertools.repeat(radial_velocity),
            itertools.repeat(limiting_mag),
            itertools.repeat(nthreads),
            np.arange(nthreads,dtype=int),
        )

        ## initialize each chunk of the root node
        if not use_mps or nthreads <= 1: octree_dicts = [MPSwrapper(*args) for args in argss]
        else: 
            with multiprocessing.Pool(min(len(fnames),multiprocessing.cpu_count())) as my_pool:
                octree_dicts = my_pool.starmap(MPSwrapper,argss)
        

        axis_mins = np.zeros((len(octree_dicts),3))
        axis_maxs = np.zeros((len(octree_dicts),3))

        ## undo averaging in first chunk
        root_node_dict = octree_dicts[0]['nodes']['']

        axis_mins[0] = octree_dicts[0]['axis_mins']
        axis_maxs[0] = octree_dicts[0]['axis_maxs']

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

        ## merge chunks that follow the first
        printProgressBar(0,nthreads-1)
        for i,sub_root_dict in enumerate(octree_dicts[1:]):
            printProgressBar(i+1,nthreads-1)

            ## fill this entry in the min/max arrays to calculate width below
            axis_mins[i+1] = sub_root_dict['axis_mins']
            axis_maxs[i+1] = sub_root_dict['axis_maxs']

            this_node_dict = sub_root_dict['nodes']['']

            ## straight addition only
            for key in ['files','nparts','buffer_size']:
                root_node_dict[key] += this_node_dict[key]
            
            ## undo averaging
            for key in accumulator_keys: 
                root_node_dict[key] += this_node_dict[key]*this_node_dict[weight_key]
            
            ## radius needs to be squared and then have the average undone
            root_node_dict['radius'] += this_node_dict[key]**2*this_node_dict[weight_key]

        printProgressBar(i+1,nthreads-1)

        ## re-apply the averaging denominator
        for key in accumulator_keys: root_node_dict[key] /= root_node_dict[weight_key]
        root_node_dict['radius'] = np.sqrt(root_node_dict['radius']/this_node_dict[weight_key])

        ## overwrite the width to be the maximum separation including all chunks
        root_node_dict['width'] = axis_maxs.max()-axis_mins.min()

        ## overwrite the octree.json file
        write_to_json(octree_dicts[0],os.path.join(target_directory,'octree.json'))

        print(time.time()-init_time,'s elapsed')
 
def MPSwrapper(
    filenames,
    target_directory,
    radial_velocity,
    limiting_mag=None,
    nthreads=1,
    thread_id=0,
    ):

    all_arrays = np.concatenate(
        [fetchGaiaData(
            fname,
            limiting_mag=limiting_mag,
            has_RV=radial_velocity) for fname in filenames],
        axis=1)

    ## take the arrays and put them into a dictionary
    keys = ['vx','vy','vz','x','y','z','bp_rp','phot_g_mean_mag']
    data_dict = dict(zip(keys[-all_arrays.shape[0]:],all_arrays)) 

    ## add the effective temperature to the dictionary
    add_temperature(data_dict)

    root_dict = init_octree_root_node(
        data_dict,
        target_directory, ## <-- this will write the root-node data
        thread_id)

    return root_dict
   
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
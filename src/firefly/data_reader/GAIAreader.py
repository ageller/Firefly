import os
import time
import multiprocessing
import h5py

import numpy as np
import pandas as pd

from scipy.interpolate import interp1d

from .octree_stream import OctNodeStream,OctreeStream
from .json_utils import load_from_json,write_to_json

try:
    from astropy.table import Table, Column
    import astropy.units as u
    from astropy.coordinates import SkyCoord, ICRS
    from astropy.io import ascii
except ImportError:
    raise ImportError("astropy, which is required to use Gaia reader, is not installed.")


class GaiaReader(object):
    def __init__(self):
        pass

    def initOctree(
        self,
        gaiadir=None,
        radial_velocity=True,
        nthreads=1,
        use_mps=False):

        if gaiadir is None: gaiadir = os.path.join(os.environ['HOME'],'projects','gaia','GaiaSource')
        init_time = time.time()
        gaiadir = os.path.join(os.environ['HOME'],'projects','gaia','GaiaSource')
        fnames = os.listdir(gaiadir)[:nfiles_max]
        fnames = [f'{gaiadir}/%s'%fname for fname in fnames]

        use_mps = True
        fn = getNoRV

        if not use_mps: 
            for args in argss: 
                fn(*args)
        else: 
            with multiprocessing.Pool(min(len(fnames),multiprocessing.cpu_count())) as my_pool:
                my_pool.starmap(fn,argss)

        print(time.time()-init_time,'s elapsed')
    
    def buildOctree(self):

        stream = OctreeStream(output_dir)

class GaiaPrepper(object):
    def __init__(self):
        pass
 
    def formatGaiaData(self,nthreads,thread_id):

        all_arrays = self.fetchGaiaData()

        keys = ['vx','vy','vz','x','y','z','bp_rp','phot_g_mean_mag']
        self.data_dict = dict(zip(keys[-all_arrays.shape[0]:],all_arrays)) 

        output_dir = os.path.join(os.path.dirname(gaiadir),os.path.dirname(gaiadir),'octree_full')

    def fetchGaiaData(
        self,
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

        return np.array([outdfRV[key] for key in keys])

    def add_temperature(
        self,
        bp_rp_interval=None,
        logT_interval=None):

        if bp_rp_interval is None: bp_rp_interval = (0,4)
        if logT_interval is None: logT_interval = (np.log10(2e3),5)

        self.data_dict['teff_bprp'] = remap_nonparametrically(
            self.data_dict['bp_rp'],
            bp_rp_interval,
            logT_interval)

def MPSwrapper(
    top_level_directory,
    nthreads=1,
    thread_id=None):

    if thread_id is None and nthreads == 1: thread_id = 0

    foo = GaiaPrepper()
    foo.formatGaiaData(nthreads,thread_id)
    foo.add_temperature()

    root = OctNodeStream(None,None,[]) 
    root_dict = root.set_buffers_from_dict(foo.data_dict)

    if top_level_directory is not None:
        output_dir = os.path.join(top_level_directory,f'output_{thread_id:02d}.0')
        root_dict['nodes'][root.name] = root.write(output_dir)
        write_to_json(root_dict,os.path.join(top_level_directory,'octree.json'))

    return root_dict

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
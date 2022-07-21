import numpy as np
import os

from .reader import Reader,ParticleGroup

from abg_python.snapshot_utils import openSnapshot,iterativeCoM
from abg_python.cosmo_utils import load_rockstar

class FIREreader(Reader):
    """This is an example of a "custom" Reader that has been tuned to 
    open data from the `FIRE galaxy formation collaboration <https://fire.northwestern.edu>`_.
    """
    
    def __init__(self,
        snapdir,
        snapnum, 
        ptypes=None,
        UInames=None,
        decimation_factors=None,
        fields=None, 
        filterFlags=None, 
        colormapFlags=None,
        radiusFlags=None,
        logFlags=None, 
        **kwargs):
        """Base initialization method for FIREreader instances.
            A FIREreader will conveniently read `FIRE collaboration <http://fire.northwestern.edu>`_ 
            data and produce firefly compatible :code:`.json` files.

        :param snapdir: directory that contains all the hdf5 data files
        :type snapdir: str
        :param snapnum: which snapshot to open
        :type snapnum: int 
        :param ptypes: which particle types to extract (e.g. :code:`'PartType%d'`),
            defaults to []
        :type ptypes: list of int, optional
        :param UInames: what should the particle groups be called in the webapp UI,
            defaults to :code:`['PartType%d for in in ptypes]`
        :type UInames: list of str, optional
        :param decimation_factors: factor by which to reduce the data randomly 
            i.e. :code:`data=data[::decimation_factor]`,
            defaults to :code:`[1 for i in ptypes]`
        :type decimation_factors: list of int, optional
        :param fields: names of fields to open from snapshot data
            (e.g. Temperature, AgeGyr, Density). Shared between 
            particle types but if a particle type does not have a field 
            (e.g. PartType4 does not have Temperature, PartType0 does not have AgeGyr)
            then that field is skipped for that particle type.
            defaults to []
        :type fields: list of str, optional
        :param filterFlags: flags to signal whether field should be in filter dropdown,
            defaults to [True for i in fields]
        :type filterFlags: list of bool, optional
        :param colormapFlags: flags to signal whether field should be in colormap dropdown,
            defaults to [True for i in fields]
        :type colormapFlags: list of bool, optional
        :param radiusFlags: flags to signal whether field should be in radius dropdown,
            defaults to [False for i in fields]
        :type radiusFlags: list of bool, optional
        :param logFlags: flags to signal whether the log of the field should be taken,
            defaults to [False for i in fields]
        :type logFlags: list of bool, optional
        :raises ValueError: if the length of ptypes, UInames, and decimation factors
            does not match.
        :raises ValueError: if the length of fields, filterFlags,
            colormapFlags, radiusFlags, and logFlags does not match.
        :raises FileNotFoundError: if snapdir cannot be found
        """

        ## handle default input for particle groups
        if ptypes is None: ptypes = [] 
        if UInames is None: UInames = ["PartType%d" % i for i in ptypes]
        if decimation_factors is None: decimation_factors = [1 for i in ptypes]

        ## handle default input for fields
        if fields is None: fields = []
        if filterFlags is None: filterFlags = [True for i in fields]
        if colormapFlags is None: colormapFlags = [True for i in fields]
        if radiusFlags is None: radiusFlags = [False for i in fields]
        if logFlags is None: logFlags = [False for i in fields]

        ## input validation
        ##  ptypes
        lists = [decimation_factors,UInames]
        names = ['decimation_factors','UInames']
        for name,llist in zip(names,lists):
            if len(llist) != len(ptypes):
                raise ValueError(
                    "%s is not the same length as ptypes (%d,%d)"%(
                    name,len(llist),len(ptypes)))

        ##  fields
        lists = [filterFlags,colormapFlags,radiusFlags,logFlags]
        names = ['filterFlags','colormapFlags','radiusFlags','logFlags']
        for name,llist in zip(names,lists):
            if len(llist) != len(fields):
                raise ValueError(
                    "%s is not the same length as fields (%d,%d)"%(
                    name,len(llist),len(fields)))
    
        ##  IO/snapshots
        if not os.path.isdir(snapdir):
            raise FileNotFoundError("Cannot find %s"%snapdir)

        ##  this I handle separately 
        if 'Coordinates' in fields:
            print("Do not put Coordinates in fields, removing it... (and its corresponding flags)")
            fields = list(fields)
            filterFlags = list(filterFlags)
            colormapFlags = list(colormapFlags)
            radiusFlags = list(radiusFlags)
            logFlags = list(logFlags)

            index = fields.index('Coordinates')

            for llist in [fields,filterFlags,logFlags]:
                llist.pop(index)

        ## where to find the HDF5 files
        self.snapdir = snapdir
        self.snapnum = snapnum

        ## which particles we want to extract
        self.ptypes = ptypes

        ## what do we want to call those particles in the UI
        self.UInames = UInames
        
        ## do we want to decimate the arrays at all?
        self.decimation_factors = decimation_factors

        ## what attributes do we want to load of that particle type?
        self.fields = fields
        
        ## do we want to filter on that attribute?
        self.filterFlags = filterFlags

        ## do we want to color by that attribute?
        self.colormapFlags = colormapFlags

        ## do we want to scale particle size by that attribute?
        self.radiusFlags = radiusFlags
        
        ## do we need to take the log of it 
        self.logFlags = logFlags

        ####### execute generic Reader __init__ below #######
        super().__init__(**kwargs)

    def loadData(
        self,
        com = None,
        vcom = None,
        ):
        """Loads FIRE snapshot data using Alex Gurvich's
        :func:`firefly.data_reader.snapshot_utils.openSnapshot`.
        (reproduced from https://github.com/agurvich/abg_python) and binds it to a 
        corresponding :class:`firefly.data_reader.ParticleGroup` instance.

        :param com: position to offset all coordinates by if None, 
            will calculate the CoM, defaults to None
        :type com: np.ndarray, optional
        """

        for ptype,UIname,dec_factor in list(
            zip(self.ptypes,self.UInames,self.decimation_factors))[::-1]:
            print("Loading ptype %d"%ptype)

            ## load each particle type's snapshot data
            snapdict = openSnapshot(
                self.snapdir,
                self.snapnum,
                int(ptype), ## ptype should be 1,2,3,4,etc...
                keys_to_extract = ['Coordinates']+self.fields+['Masses']*(com is None)+['Velocities']
            )

            if com is None:
                if os.path.isdir(os.path.join(self.snapdir,'..','halo','rockstar_dm')):
                    com,rvir,vcom = load_rockstar(
                        self.snapdir,
                        self.snapnum,
                        extra_names_to_read=['velocity'])
                else:
                    com,vcom = iterativeCoM(
                        snapdict['Coordinates'],
                        snapdict['Masses'],
                        snapdict['Velocities'])

            if vcom is None: vcom = 0

            snapdict['Coordinates']-=com
            snapdict['Velocities'] -=vcom

            ## initialize output arrays for fields
            field_names = []
            field_arrays = []
            field_filter_flags = []
            field_colormap_flags = []
            field_radius_flags = []

            for field,filterFlag,colormapFlag,radiusFlag,logFlag in list(zip(
                self.fields,
                self.filterFlags,
                self.colormapFlags,
                self.radiusFlags,
                self.logFlags)):

                ## easypeasy, just read from the snapdict
                if field in snapdict:
                    arr = snapdict[field]

                ## if asked to compute galactocentric radius from the coordinates
                elif field == 'GCRadius':
                    arr = np.sqrt(np.sum(snapdict['Coordinates']**2,axis=1))
                ## elif field == ' ':
                ## NOTE: define custom shortcut field here
                else:
                    continue

                ## take the log and/or magnitude if requested
                if logFlag:
                    arr = np.log10(arr)
                    field = 'log10%s'%field
                
                ## append this field into the arrays
                field_names = np.append(
                    field_names,
                    [field],axis=0)

                field_filter_flags = np.append(
                    field_filter_flags,
                    [filterFlag],axis=0)

                field_colormap_flags = np.append(
                    field_colormap_flags,
                    [colormapFlag],axis=0)

                field_radius_flags = np.append(
                    field_radius_flags,
                    [radiusFlag],axis=0)

                field_arrays.append(arr)
                
            ## initialize a particleGroup instance
            ##  for this particle type
            self.particleGroups = np.append(
                self.particleGroups,
                [ParticleGroup(
                    UIname,
                    snapdict['Coordinates'],
                    snapdict['Velocities'],
                    field_names=field_names,
                    field_arrays=np.array(field_arrays).reshape(-1,snapdict['Coordinates'].shape[0]),
                    decimation_factor=dec_factor,
                    field_filter_flags=field_filter_flags,
                    field_colormap_flags=field_colormap_flags,
                    field_radius_flags=field_radius_flags)],
                axis=0)


        ## reverse the order to match specified ptypes order
        self.particleGroups = self.particleGroups[::-1]

        ## save the filenames that were opened 
        ##  so you can re-open them yourself in that order if you need to
        for particleGroup in self.particleGroups:
            particleGroup.filenames_opened = snapdict['fnames']

            ## add this particle group to the reader's settings file
            self.settings.attachSettings(particleGroup)

        return self.particleGroups

class SimpleFIREreader(FIREreader):    
    def __init__(
        self,
        path_to_snapshot,
        decimation_factor=10,
        JSONdir=None,
        write_to_disk=True,
        com=False, 
        **kwargs):
        """ A wrapper to :class:`firefly.data_reader.FIREreader` that will open 
            FIRE collaboration formatted data with minimal interaction from the user 
            and use a "standard" firefly setup with:
                :code:`ptypes = [0,4]`

                :code:`UInames = ['gas','stars']`

                :code:`fields = ['AgeGyr','Temperature','GCRadius']`

            along  with some "standard" settings with:
                :code:`settings['color']['gas'] = [1,0,0,1]`

                :code:`settings['color']['stars'] = [0,0,1,1]`

                :code:`settings['sizeMult']['gas'] = 1`

                :code:`settings['sizeMult']['stars'] = 1`

                :code:`settings['camera'] = [0,0,-15]`

        :param path_to_snapshot: path to .hdf5 file(s; can be a directory)
        :type path_to_snapshot: str 
        :param decimation_factor: factor by which to reduce the data randomly 
            i.e. :code:`data=data[::decimation_factor]`, defaults to 10
        :type decimation_factor: int, optional
        :param JSONdir: the sub-directory that will contain your JSON files, relative
            to your :code:`$HOME directory`. , defaults to :code:`$HOME/<JSON_prefix>`
        :type JSONdir: str, optional
        :param write_to_disk: flag that controls whether data is saved to disk (:code:`True`) 
            or only converted to a string and stored in :code:`self.JSON` (:code:`False`), defaults to True
        :type write_to_disk: bool, optional
        :param com: flag to offset all coordinates by the COM of the 
            snapshot, defaults to False 
        :type com: bool, optional
        :raises ValueError: if a snapnum cannot be inferred from the path_to_snapshot
        """

        ## strip off a trailing / if it's there
        if path_to_snapshot[-1:] == os.sep:
            path_to_snapshot = path_to_snapshot[:-1]

        if '.hdf5' not in path_to_snapshot:
            snapdir = os.path.dirname(path_to_snapshot)
            try:
                snapnum = int(path_to_snapshot.split('_')[-1])
            except:
                raise ValueError(
                    "%s should be formatted as 'path/to/output/snapdir_xxx'"%path_to_snapshot+
                    " where xxx is an integer")
        else:
            snapdir = os.path.dirname(path_to_snapshot)
            try: snapnum = int(path_to_snapshot.split('_')[-1][:-len('.hdf5')])
            except:
                raise ValueError(
                    "%s should be formatted as 'path/to/output/snapshot_xxx.hdf5'"%path_to_snapshot+
                    " where xxx is an integer")


        ## relative path -> symbolic link
        if JSONdir is None: JSONdir="FIREData_%d"%snapnum

        ## initialize the reader object
        super().__init__(
            snapdir,
            snapnum,
            ptypes=[0,4], 
            UInames=['Gas','Stars'],
            decimation_factors=[decimation_factor,decimation_factor],
            fields=['AgeGyr','Temperature','GCRadius'],
            logFlags=[False,True,False], 
            JSON_prefix='Data',
            JSONdir=JSONdir,
            **kwargs)

        ## load the data
        self.loadData(com=com)

        self.settings['color']['Gas'] = [1,0,0,1]
        self.settings['color']['Stars'] = [0,0,1,1]

        self.settings['sizeMult']['Gas'] = 1
        self.settings['sizeMult']['Stars'] = 1

        self.settings['camera'] = [0,0,-15]

        ## dump the data files to disk
        self.writeToDisk(loud=True,write_to_disk=write_to_disk,extension='.ffly')

class STARFORGEreader(FIREreader):
    def __init__(
        self,
        path_to_snapshot,
        decimation_factor=10,
        JSONdir=None,
        write_to_disk=True,
        com=False, 
        **kwargs):
        """ A wrapper to :class:`firefly.data_reader.FIREreader` that will open 
            `STARFORGE collaboration <http://starforge.space>`_ formatted data with minimal interaction from the user 
            and use a "standard" firefly setup with:
                :code:`ptypes = [0,5]`

                :code:`UInames = ['gas','stars']`

                :code:`fields = ['AgeGyr','Temperature','GCRadius']`

            along  with some "standard" settings with:
                :code:`settings['color']['gas'] = [1,0,0,1]`

                :code:`settings['color']['stars'] = [0,0,1,1]`

                :code:`settings['sizeMult']['gas'] = 1`

                :code:`settings['sizeMult']['stars'] = 1`

                :code:`settings['camera'] = [0,0,-15]`

        :param path_to_snapshot: path to .hdf5 file(s; can be a directory)
        :type path_to_snapshot: str 
        :param decimation_factor: factor by which to reduce the data randomly 
            i.e. :code:`data=data[::decimation_factor]`, defaults to 10
        :type decimation_factor: int, optional
        :param JSONdir: the sub-directory that will contain your JSON files, relative
            to your :code:`$HOME directory`. , defaults to :code:`$HOME/<JSON_prefix>`
        :type JSONdir: str, optional
        :param write_to_disk: flag that controls whether data is saved to disk (:code:`True`) 
            or only converted to a string and stored in :code:`self.JSON` (:code:`False`), defaults to True
        :type write_to_disk: bool, optional
        :param com: flag to offset all coordinates by the COM of the 
            snapshot, defaults to False 
        :type com: bool, optional
        :raises ValueError: if a snapnum cannot be inferred from the path_to_snapshot
        """

        ## strip off a trailing / if it's there
        if path_to_snapshot[-1:] == os.sep:
            path_to_snapshot = path_to_snapshot[:-1]

        snapdir = os.path.dirname(path_to_snapshot)
        try:
            snapnum = int(path_to_snapshot.split('_')[-1])
        except:
            raise ValueError(
                "%s should be formatted as 'path/to/output/snapdir_xxx'"%path_to_snapshot+
                " where xxx is an integer")

        ## relative path -> symbolic link
        if JSONdir is None: JSONdir="STARFORGEData_%d"%snapnum

        ## initialize the reader object
        super().__init__(
            snapdir,
            snapnum,
            ptypes=[0,5], 
            UInames=['Gas','Stars'],
            decimation_factors=[decimation_factor,decimation_factor],
            fields=['AgeGyr','Temperature','GCRadius'],
            logFlags=[False,True,False,False], 
            JSON_prefix='Data',
            JSONdir=JSONdir,
            **kwargs)

        ## load the data
        self.loadData(com=com)

        self.settings['color']['Gas'] = [1,0,0,1]
        self.settings['color']['Stars'] = [0,0,1,1]

        self.settings['sizeMult']['Gas'] = 1
        self.settings['sizeMult']['Stars'] = 1

        self.settings['camera'] = [0,0,-15]

        ## dump the JSON files
        self.writeToDisk(loud=True,write_to_disk=write_to_disk)

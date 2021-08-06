import numpy as np
import os

from .reader import Reader,ParticleGroup

from abg_python.snapshot_utils import openSnapshot

class FIREreader(Reader):
    """This is an example of a "custom" Reader that has been tuned to 
    open data from the FIRE galaxy formation collaboration 
    (https://fire.northwestern.edu).
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
        magFlags=None, 
        logFlags=None, 
        **kwargs):
        """Base initialization method for FIREreader instances.
            A FIREreader will conveniently read FIRE collaboration data and produce
            Firefly compatible :code:`.json` files.

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
            (e.g. Temperature, AgeGyr, Velocities, Density). Shared between 
            particle types but if a particle type does not have a field 
            (e.g. PartType4 does not have Temperature, PartType0 does not have AgeGyr)
            then that field is skipped for that particle type.
            defaults to ['Velocities']
        :type fields: list of str, optional
        :param filterFlags: flags to signal whether field should be in filter dropdown,
            defaults to [True for i in fields]
        :type filterFlags: list of bool, optional
        :param colormapFlags: flags to signal whether field should be in colormap dropdown,
            defaults to [True for i in fields]
        :type colormapFlags: list of bool, optional
        :param magFlags: flags to signal whether the magnitude of the field should be taken,
            rather than the field itself (e.g. for vector quantities),
            defaults to [False for i in fields]
        :type magFlags: list of bool, optional
        :param logFlags: flags to signal whether the log of the field should be taken,
            defaults to [False for i in fields]
        :type logFlags: list of bool, optional
        :raises ValueError: if the length of ptypes, UInames, and decimation factors
            does not match.
        :raises ValueError: if the length of fields, filterFlags,
            colormapFlags, magFlags, and logFlags does not match.
        :raises FileNotFoundError: if snapdir cannot be found
        """

        ## handle default input for particle groups
        if ptypes is None: ptypes = [] 
        if UInames is None: UInames = ["PartType%d" % i for i in ptypes]
        if decimation_factors is None: decimation_factors = [1 for i in ptypes]

        ## handle default input for fields
        if fields is None: fields = ['Velocities']
        if filterFlags is None: filterFlags = [True for i in fields]
        if colormapFlags is None: colormapFlags = [True for i in fields]
        if magFlags is None: magFlags = [False for i in fields]
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
        lists = [filterFlags,colormapFlags,magFlags,logFlags]
        names = ['filterFlags','colormapFlags','magFlags','logFlags']
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
            magFlags = list(magFlags)
            logFlags = list(logFlags)

            index = fields.index('Coordinates')

            for llist in [fields,filterFlags,magFlags,logFlags]:
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
        
        ## do we need to take the magnitude of it? (velocity? typically not..)
        self.magFlags = magFlags
        
        ## do we need to take the log of it 
        self.logFlags = logFlags

        ####### execute generic Reader __init__ below #######
        super().__init__(**kwargs)

    def loadData(self,com_offset=False):
        """Loads FIRE snapshot data using Alex Gurvich's
        :func:`Firefly.data_reader.snapshot_utils.openSnapshot`.
        (reproduced from https://github.com/agurvich/abg_python) and binds it to a 
        corresponding :class:`Firefly.data_reader.ParticleGroup` instance.

        :param com_offset: flag to offset all coordinates by the COM of the 
            snapshot, defaults to False 
        :type com_offset: bool, optional
        """

        com = None

        for ptype,UIname,dec_factor in list(
            zip(self.ptypes,self.UInames,self.decimation_factors))[::-1]:
            print("Loading ptype %d"%ptype)

            ## load each particle type's snapshot data
            snapdict = openSnapshot(
                self.snapdir,
                self.snapnum,
                int(ptype), ## ptype should be 1,2,3,4,etc...
                keys_to_extract = ['Coordinates']+self.fields+['Masses']*com_offset
            )

            if com_offset and com is None:
                com = np.zeros(3)
                ## use concentric shells to find an estimate
                ##  for the center of mass
                for i in range(4):
                    rs = np.sqrt(np.sum(snapdict['Coordinates']**2,axis=1))
                    rmax = np.nanmax(rs)/10**i


                    rmask = rs <= rmax

                    if np.sum(rmask) == 0:
                        break

                    print("Centering on particles within %.2f kpc"%rmax)

                    ## compute the center of mass of the particles within this shell
                    this_com = (np.sum(snapdict['Coordinates'][rmask] *
                        snapdict['Masses'][rmask][:,None],axis=0) / 
                        np.sum(snapdict['Masses'][rmask]))


                    snapdict['Coordinates']-=this_com

                    ## keep track of total com
                    com += this_com

                vcom = (np.sum(snapdict['Velocities'][rmask] *
                    snapdict['Masses'][rmask][:,None],axis=0) /
                    np.sum(snapdict['Masses'][rmask]))

                snapdict['Velocities']-=vcom

            elif com is not None: 
                snapdict['Coordinates']-=com
                snapdict['Velocities']-=vcom


            ## initialize output arrays for fields
            tracked_names = []
            tracked_arrays = []
            tracked_filter_flags = []
            tracked_colormap_flags = []

            for field,filterFlag,colormapFlag,magFlag,logFlag in list(zip(
                self.fields,
                self.filterFlags,
                self.colormapFlags,
                self.magFlags,
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
                if magFlag:
                    arr = np.linalg.norm(arr,axis=1)
                    field = 'mag%s'%field
                if logFlag:
                    arr = np.log10(arr)
                    field = 'log10%s'%field
                

                ## append this field into the arrays
                tracked_names = np.append(
                    tracked_names,
                    [field],axis=0)

                tracked_filter_flags = np.append(
                    tracked_filter_flags,
                    [filterFlag],axis=0)

                tracked_colormap_flags = np.append(
                    tracked_colormap_flags,
                    [colormapFlag],axis=0)

                tracked_arrays.append(arr)
                
            ## initialize a particleGroup instance
            ##  for this particle type
            self.particleGroups = np.append(
                self.particleGroups,
                [ParticleGroup(
                    UIname,
                    snapdict['Coordinates'],
                    tracked_names=tracked_names,
                    tracked_arrays=tracked_arrays,
                    decimation_factor=dec_factor,
                    tracked_filter_flags=tracked_filter_flags,
                    tracked_colormap_flags=tracked_colormap_flags,
                    doSPHrad = 'SmoothingLength' in tracked_names)],
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
        write_jsons_to_disk=True,
        com_offset=False,
        **kwargs):
        """ A wrapper to :class:`Firefly.data_reader.FIREreader` that will open 
            FIRE collaboration formatted data with minimal interaction from the user 
            and use a "standard" Firefly setup with:
                :code:`ptypes = [0,4]`

                :code:`UInames = ['gas','stars']`

                :code:`fields = ['Velocities','AgeGyr','Temperature','GCRadius']`

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
        :param write_jsons_to_disk: flag that controls whether data is saved to disk (:code:`True`) 
            or only converted to a string and stored in :code:`self.JSON` (:code:`False`), defaults to True
        :type write_jsons_to_disk: bool, optional
        :param com_offset: flag to offset all coordinates by the COM of the 
            snapshot, defaults to False 
        :type com_offset: bool, optional
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
        if JSONdir is None: JSONdir="FIREData_%d"%snapnum

        ## initialize the reader object
        super().__init__(
            snapdir,
            snapnum,
            ptypes=[0,4], 
            UInames=['Gas','Stars'],
            decimation_factors=[decimation_factor,decimation_factor],
            fields=['AgeGyr','Temperature','Velocities','GCRadius'],
            magFlags=[False,False,False,False], 
            logFlags=[False,True,False,False], 
            JSON_prefix='Data',
            JSONdir=JSONdir,
            **kwargs)

        ## load the data
        self.loadData(com_offset=com_offset)

        self.settings['color']['Gas'] = [1,0,0,1]
        self.settings['color']['Stars'] = [0,0,1,1]

        self.settings['sizeMult']['Gas'] = 1
        self.settings['sizeMult']['Stars'] = 1

        self.settings['camera'] = [0,0,-15]

        ## dump the JSON files
        self.dumpToJSON(loud=True,write_jsons_to_disk=write_jsons_to_disk)

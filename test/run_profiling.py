from sys import prefix
import time
import os

from subprocess import Popen,PIPE

from firefly.data_reader import ArrayReader,FIREreader

from abg_python.galaxy.gal_utils import Galaxy

class ProfilingSetup():
    def __init__(
        self,
        filename,
        JSONdir='FIRE_profiling',
        dataset='m12b_res57000'):

        self.stdout = None
        self.filename = filename
        self.JSONdir = JSONdir
        self.dataset = dataset

        ## append vals to csv file
        with open(self.filename,'w+') as handle: handle.write(dataset+'\n')

    def run_profile(self):

        stdout = PIPE if self.stdout is None else self.stdout
        ## run the puppeteer subprocess
        handle = Popen(["node","firefly-puppet.js"],stdout=stdout)
        handle.wait()

        ## extract the console.log messages
        lines = handle.stdout.read().decode('utf-8').split('\n')

        ## find the line I tagged for profiling
        for line in lines: 
            if "(PROFILE)" in line: break

        ## extract the values we care about [npart,t_startup,memory_usage,psize,FPS]
        vals = line.split(' ')[3:]
        if len(vals) != 5: raise ValueError(f"Profile line was misidentified {vals}")

        ## convert from strings to appropriate datatype
        #vals[0] = int(vals[0])
        #for i in range(len(vals)-1): vals[i+1] = float(vals[i+1])
 
        ## append the size on disk
        handle = Popen(["du","-sk",os.path.join(os.environ['HOME'],self.JSONdir)],stdout=stdout)
        handle.wait()
        vals += [handle.stdout.read().decode('utf-8').split('\t')[0]]

        ## append a new-line for this setup
        vals += ['\n']

        ## append vals to csv file
        with open(self.filename,'a+') as handle: handle.write(','.join(vals))

        return vals
    
    def init_FIRE_reader(self):
        reader = FIREreader(os.path.join(
            os.environ['HOME'],
            'snaps',
            'metal_diffusion',
            self.dataset,
            'output'),
            600,
            [0],
            ['Gas'],None,
            fields=['Log10Temperature','Log10Density','GCRadius'],
            JSONdir=self.JSONdir,
            ## overwrite the existing startup.json file
            write_startup=True,
            clean_JSONdir=True)
                

        galaxy = Galaxy(self.dataset,600)
        galaxy.extractMainHalo(use_saved_subsnapshots=False)

        ## fetch data from .hdf5 files
        reader.loadData(
            com=galaxy.scom,
            vcom=galaxy.sub_snap['vscom'])
        
        ##
        reader.settings['camera'] = [0,0,-1e4]

        return reader

class NParticlesSetup(ProfilingSetup):
    def __init__(
        self,
        extension='.ffly',
        dec_factors=None,
        **kwargs):

        super().__init__(**kwargs)

        default_dec_factors = [1e5,1e4]#,1e3,1e2,1e1,1]

        self.dec_factors = default_dec_factors if dec_factors is None else dec_factors
        self.extension = extension
    
    def run(self,reader:FIREreader=None):

        init_time = time.time()

        if reader is None: reader = self.init_FIRE_reader()
        
        for dec_factor in self.dec_factors:
            for pg in reader.particleGroups:
                pg.decimation_factor = int(dec_factor)
                pg.getDecimationIndexArray()

            reader.writeToDisk(extension=self.extension,loud=False)

            ## append this setup to the filenames.csv file
            self.run_profile()

        print("%.2f"%((time.time()-init_time)/60),'min elapsed')
        return reader


def run_all(dataset='m12b_res57000'): 
    init_time = time.time()

    ## run .ffly for different decimation factors
    ffly_startup_memory = NParticlesSetup(
        '.ffly',
        filename='ffly_startup_memory.csv',
        dataset=dataset)
    reader = ffly_startup_memory.run()

    ## run .json for different decimation factors
    json_startup_memory = NParticlesSetup(
        '.json',
        filename='json_startup_memory.csv',
        dataset=dataset)
    json_startup_memory.run(reader=reader)

    #run_FPS_profiling()

    print("%.2f"%((time.time()-init_time)/60),'min elapsed')

if __name__ == '__main__': run_all()
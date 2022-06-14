from sys import prefix
import time
import os

import numpy as np
from mpl_toolkits.axes_grid1.inset_locator import zoomed_inset_axes,mark_inset

from subprocess import Popen,PIPE

from firefly.data_reader import ArrayReader,FIREreader

from abg_python.galaxy.gal_utils import Galaxy

from abg_python.fitting_utils import fitAXb

from abg_python.plot_utils import plt,clean_savefig,bufferAxesLabels,nameAxes,latex_columnwidth
from abg_python.color_utils import get_distinct

colors = get_distinct(3)

class ProfilingPlotter():
    def __init__(self,ffly_fname,json_fname):

        self.ffly_data = np.genfromtxt(ffly_fname,skip_header=1,delimiter=',')[...,:-1]
        self.json_data = np.genfromtxt(json_fname,skip_header=1,delimiter=',')[...,:-1]

    def make_plots(self):
        fig,axs = plt.subplots(nrows=3,ncols=1,sharex=True)
        fig.subplots_adjust(wspace=0,hspace=0)
        fig.set_size_inches(latex_columnwidth,2*latex_columnwidth)
        fig.set_dpi(120)
        fig.set_facecolor('white')

        self.plot_filesize_on_disk(axs[0])
        self.plot_browser_ram(axs[1])
        self.plot_time_to_load(axs[2])

        fig.set_facecolor('white')
        fig.set_size_inches(latex_columnwidth,latex_columnwidth*3)
        bufferAxesLabels(axs,3,1)
        clean_savefig(fig,'Desktop/performance.pdf',latex_columnwidth,latex_columnwidth*1.75,plotdir=os.environ['HOME'])

    def plot_filesize_on_disk(self,ax):

        print(self.ffly_data[:,0].astype(int))
        ax.plot(self.ffly_data[:,0],self.ffly_data[:,-1]/1024*3.125,label='$3\times$.ffly',lw=4,c='pink',alpha=1,ls='--')
        ax.plot(self.json_data[:,0],self.json_data[:,-1]/1024,label='.json',lw=3,c=colors[1],marker='.',markeredgewidth=3)
        ax.plot(self.ffly_data[:,0],self.ffly_data[:,-1]/1024,label='.ffly',lw=3,c=colors[0],marker='.',markeredgewidth=3)

        xs,ys = self.ffly_data[:,0],self.ffly_data[:,-1]/1024
        #a,b = fitAXb(xs,ys,None,fixed_b=0)

        ax.plot(xs,40e-6*xs,ls='--',c='k')
        #ax.text(xs[2]*0.98*0.9,ys[2]*0.999*0.6,r'10 floats/particle',va='top',ha='left',c='k')
        ax.text(xs[2]*0.9,ys[2]*0.6,r'10 floats/particle',va='top',ha='left')
        #ax.text(xs[2]*1.5,ys[2]*0.2,'$=3$ coords +\n    3 vels +\n    4 scalars',va='top',ha='left',fontsize=10)

        ax.text(self.ffly_data[-2,0],self.ffly_data[-2,-1]/1024/6,'.ffly',va='top',ha='center',c=colors[0])
        ax.text(self.json_data[-3,0],self.json_data[-3,-1]/1024*3,'.json',va='bottom',ha='right',c=colors[1])


        ax.text(self.ffly_data[2,0]*3*0.99,self.ffly_data[2,-1]/1024*3.125*3*0.99,r'$3\times\mathrm{.ffly}$',va='bottom',ha='right',c='k')
        ax.text(self.ffly_data[2,0]*3,self.ffly_data[2,-1]/1024*3.125*3,r'$3\times\mathrm{.ffly}$',va='bottom',ha='right',c='pink')
        nameAxes(
            ax,
            None,
            '$N_\mathrm{particles}$',
            'filesize on disk [MB]',
            logflag=(1,1),
            ylow=0.01) 
        ax.set_xticks(10**np.array([2,3,4,5,6,7]))
        ax.set_xticklabels(["$10^{%d}$"%power for power in [2,3,4,5,6,7]])
        ax.set_yticks([0.01,0.1,1,10,100,1000])
        ax.set_ylim(0.008,3000)
        ax.tick_params(top=True,labeltop=False)
        ax.tick_params(right=True,labelright=False,direction='in')

    def plot_browser_ram(self,ax):
        ax.plot(self.ffly_data[:,0],self.ffly_data[:,2]*1024,lw=3,c=colors[0],marker='.',markeredgewidth=3)
        ax.plot(self.json_data[:,0],self.json_data[:,2]*1024,lw=3,c=colors[1],marker='.',markeredgewidth=3)
        #ax.text(self.ffly_data[0,0],self.ffly_data[0,2]*1024,'.ffly',va='top')
        #ax.text(self.json_data[0,0],self.json_data[0,2]*1024+3,'.json',va='bottom',ha='left')

        xs = self.ffly_data[:,0]
        ys = self.ffly_data[:,2]*1024
        
        power = 1
        slope = 1
        offset = ys[0]-slope*xs[0]**power
        slope = (ys[-1]-offset)/(xs[-1]-xs[0])
        offset = ys[0]-slope*xs[0]**power
        (ys[-1]-offset)**(1/power)


        a,b = fitAXb(xs,ys,None,fixed_b=ys[0])
        ax.plot(xs,slope*xs**power+b,ls='--',c='k')

        ax.text(xs[2]*2,slope*xs[2]+offset/1.3,
        f'              {b:.0f} MB +\n {a*1e6/4:.0f} floats/particle',va='bottom',ha='left')

        nameAxes(ax,None,'$N_\mathrm{particles}$','browser RAM [MB]',
                logflag=(1,1))
        ax.set_yticks([10,100,1000])
        ax.set_xticks(10**np.array([2,3,4,5,6,7]))
        ax.set_xticklabels(["$10^{%d}$"%power for power in [2,3,4,5,6,7]])
        ax.tick_params(top=True,labeltop=False)
        ax.tick_params(right=True,labelright=False,direction='in')

    def plot_time_to_load(self,ax):
        axins = zoomed_inset_axes(ax, zoom=2,bbox_to_anchor=(0.15,0.5,0.5,.5),bbox_transform=ax.transAxes)
        axins.plot(self.ffly_data[:,0],self.ffly_data[:,1],lw=3,c=colors[0],marker='.',markeredgewidth=3)
        axins.plot(self.json_data[:,0],self.json_data[:,1],lw=3,c=colors[1],marker='.',markeredgewidth=3)

        axins.set_xlim(2e6,1.5e7)
        axins.set_ylim(20,100)
        axins.tick_params(labelleft=False,labelbottom=True)
        nameAxes(axins,None,None,None,logflag=(1,1))
        mark_inset(ax, axins, loc1=2, loc2=4, fc="none", ec="0.5")

        xs,ys = self.ffly_data[:,0],self.ffly_data[:,1]


        ax.plot(self.ffly_data[:,0],self.ffly_data[:,1],lw=3,c=colors[0],marker='.',markeredgewidth=3)
        ax.plot(self.json_data[:,0],self.json_data[:,1],lw=3,c=colors[1],marker='.',markeredgewidth=3)
        a,b = fitAXb(xs,ys,None,fixed_b=(self.ffly_data[0,1] + self.json_data[0,1])/2)

        a = 1/np.round(1/a,-5)
        axins.plot(xs,a*xs+b,ls='--',c='k')
        ax.plot(xs,a*xs+b,ls='--',c='k')
        ax.text(xs[3]*0.65,(a*xs[3]+b)*0.6,
        r'$\left('+
        f'{b:.2f} +'+
        r'\frac{N_\mathrm{particles}}{'+
        f'{np.round(1/a,-1):0.0f}'+
        r'}'+
        r'\right)$ s',
        va='top',ha='left',fontsize=10)


        ax.set_yticks([0,20,40,60])
        nameAxes(ax,None,'$N_\mathrm{particles}$','time to load [s]',logflag=(1,1))
        ax.tick_params(top=True,labeltop=False)
        ax.tick_params(right=True,labelright=False,direction='in')
        axins.axhline(60,ls='--',alpha=0.5,c='gray')
        axins.text(2.3e6,57,'60 s',va='top',fontsize=10)
        axins.axhline(30,ls='--',alpha=0.5,c='gray')
        axins.text(2.3e6,30,'30 s',va='bottom',fontsize=10)
        ax.set_xticks(10**np.array([2,3,4,5,6,7]))
        ax.set_xticklabels(["$10^{%d}$"%power for power in [2,3,4,5,6,7]])

class ProfilingSetup():
    def __init__(
        self,
        filename,
        JSONdir='FIRE_profiling',
        dataset='m12b_res57000',
        overwrite=True):

        self.stdout = None
        self.filename = filename
        self.JSONdir = JSONdir
        self.dataset = dataset

        ## append vals to csv file
        if overwrite:
            with open(self.filename,'w+') as handle:
                handle.write(dataset+'\n')

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
            #fields=['Log10Temperature','Log10Density','GCRadius'],
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

        default_dec_factors = [1e6,1e5,1e4,1e3,1e2,1e1]

        self.dec_factors = default_dec_factors if dec_factors is None else dec_factors
        self.extension = extension
    
    def run(self,reader:FIREreader=None,do_run=True):

        init_time = time.time()

        if reader is None: reader = self.init_FIRE_reader()
        
        for dec_factor in self.dec_factors:
            for pg in reader.particleGroups:
                pg.decimation_factor = int(dec_factor)
                pg.getDecimationIndexArray()

            reader.writeToDisk(extension=self.extension,loud=False)

            ## append this setup to the filenames.csv file
            if do_run: self.run_profile()

        print("%.2f"%((time.time()-init_time)/60),'min elapsed')
        return reader

def run_plots():

    plotter = ProfilingPlotter('ffly_startup_memory.csv','json_startup_memory.csv')
    plotter.make_plots()

def run_all(dataset='m12b_res7100',clear_memory=False): 
    init_time = time.time()

    reader = None

    ## run different decimation factors in both formats
    for fmt in ['ffly']: #,'json'
        if clear_memory:
            for dec_factor in [5]:
                foo = NParticlesSetup(
                    f'.{fmt}',
                    filename=f'{fmt}_startup_memory_nofields.csv',
                    dataset=dataset,
                    dec_factors=[dec_factor],
                    overwrite=False)
                foo.run(do_run=False)
                foo.run_profile()
        else:
            reader = NParticlesSetup(
                f'.{fmt}',
                filename=f'{fmt}_startup_memory_nofields.csv',
                dataset=dataset,
                overwrite=True).run(reader=reader)

    #run_FPS_profiling()

    print("%.2f"%((time.time()-init_time)/60),'min elapsed')

if __name__ == '__main__': run_all()
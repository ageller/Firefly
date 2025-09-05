# for PyInstaller

# to prep:
# conda create --name firefly-pyinstaller-wsl python=3.12
# conda activate firefly-pyinstaller-wsl
# pip install firefly jupyter pyOpenSSL pyinstaller


# to run:
# pyinstaller firefly.spec --clean -y

from PyInstaller.utils.hooks import collect_all, collect_submodules


a = Analysis(
    ['../../src/firefly/bin/firefly'],
    pathex=['../../src'],
    datas=[
        ('../../src/firefly', 'firefly'),
        ('../../src/firefly/data_reader', 'firefly/data_reader'),
        ('../../src/firefly/static', 'firefly/static'),
        ('../../src/firefly/templates', 'firefly/templates'),
    ],
    hiddenimports=( 
        collect_submodules('firefly') + 
        collect_submodules('jupyter') + 
        collect_submodules('numpy') + 
        collect_submodules('h5py') + 
        collect_submodules('pandas') + 
        collect_submodules('eventlet') + 
        collect_submodules('eventlet.green') + 
        collect_submodules('eventlet.hubs') + 
        collect_submodules('dns') + 
        collect_submodules('OpenSSL') +
        collect_submodules('engineio') +
        collect_submodules('socketio') +
        collect_submodules('flask_socketio') + 
        collect_submodules('flask') + 
        collect_submodules('requests') + 
        collect_submodules('abg_python')
    ),
)

# ensure everything is included for eventlet (which appears to be very hard to link properly!)
# it seems like there should be way to avoid doing this and the collect_submodules above, but... I can't find it
for pkg in ['eventlet', 'OpenSSL', 'dns', 'engineio', 'socketio', 'greenlet']:
    datas, binaries, hiddenimports = collect_all(pkg)

    # Fix datas and binaries to include typecode
    datas = [(src, 'firefly/' + dest, 'DATA') for dest, src in datas]
    binaries = [(src, 'firefly/' + dest, 'BINARY') for dest, src in binaries]
    
    a.datas += datas
    a.binaries += binaries
    a.hiddenimports += hiddenimports

a.hiddenimports = list(set(a.hiddenimports))

pyz = PYZ(a.pure, a.zipped_data)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='firefly',
    console=False,  
)


coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    name='firefly'
)

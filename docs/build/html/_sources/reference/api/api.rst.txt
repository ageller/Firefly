.. _api:

API Reference
=============

.. _field names:

Special field names
-------------------

Velocities
++++++++++

Allows one to visualize vector field data by checking the 
"Show Velocity Vectors" checkbox in a particle group UI sub-panel.
This checkbox will only appear if one of the fields is named
*specifically* "Velocities."

SmoothingLength
+++++++++++++++

If a field is named *specifically* "SmoothingLength" and the
:code:`doSPHrad` flag in the settings file is set to :code:`True`
then the particles in that group will be scaled by their smoothing
lengths and have opacities that vary across their face according to 
a cubic spline. 

.. warning:: 

    This feature is :ref:`experimental <experimental features>`.

.. _frontend api:

Base classes
------------
.. autosummary::
    :toctree: classes
    :recursive:

    firefly.data_reader.Reader
    firefly.data_reader.ParticleGroup
    firefly.data_reader.Settings
    firefly.data_reader.TweenParams


Pre-built Readers
-----------------

.. autosummary::
    :toctree: readers
    :recursive:

    firefly.data_reader.SimpleReader
    firefly.data_reader.ArrayReader
    firefly.data_reader.FIREreader
    firefly.data_reader.SimpleFIREreader


.. _server api:

Server Utitities
----------------

.. autosummary::
    :toctree: server
    :recursive:

    firefly.server.startFireflyServer
    firefly.server.spawnFireflyServer
    firefly.server.killAllFireflyServers

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

    Firefly.data_reader.Reader
    Firefly.data_reader.ParticleGroup
    Firefly.data_reader.Settings
    Firefly.data_reader.TweenParams


Pre-built Readers
-----------------

.. autosummary::
    :toctree: readers
    :recursive:

    Firefly.data_reader.SimpleReader
    Firefly.data_reader.ArrayReader
    Firefly.data_reader.FIREreader
    Firefly.data_reader.SimpleFIREreader


.. _server api:

Server Utitities
----------------

.. autosummary::
    :toctree: server
    :recursive:

    Firefly.server.startFireflyServer
    Firefly.server.spawnFireflyServer
    Firefly.server.killAllFireflyServers

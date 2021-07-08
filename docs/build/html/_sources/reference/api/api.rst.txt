.. _api:

API Reference
=============

.. _special field names:

 Special field names
 -------------------

 there are some special field names:

 * Velocities

 * SPH radius

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

.. _api:

API Reference
=============

.. _field names:

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

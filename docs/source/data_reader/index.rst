.. _viz-creation:
Creating your own instance of Firefly 
=====================================

Quickstart
----------

Starting with some particle data, for example:

.. code-block:: python

    # Some random particle data, including locations and a property
    import numpy as np
    coords = np.random.random(size=(10000,3))
    fields = np.random.random(size=coords[:,0].size)

.. note::
    If you are using FIRE data, check out :ref:`the FIRE quickstart<fire-viz-creation>`!

**To format your data for Firefly** (after :ref:`installing<install>`):

.. code-block:: python

    # Import Firefly API
    from Firefly.data_reader import ArrayReader

    # Output it to a Firefly-compatible JSON!
    my_arrayReader = ArrayReader(
        coords,
        fields = fields,
        JSONdir = JSONdir,
        write_jsons_to_disk = True
    )

**To view the Firefly visualization** of your formatted data:

.. code-block:: python

    # Spawn a server to host the visualization
    from Firefly.server import spawnFireflyServer
    process = spawnFireflyServer()

    # Create a window to view the data
    from IPython.display import IFrame
    IFrame("http://localhost:5000", width=1000, height=500)

    # Send the data to the visualization!
    my_arrayReader.sendDataViaFlask()

* The above assumes you are executing the code in a `Python notebook <https://jupyter.org>`_.
* A more in-depth example of formatting data :ref:`is available here<producing-files>`.
* A more in-depth example of viewing your data in a Python notebook :ref:`is available here.<flask>`
* For additional ways to view your Firefly visualization :ref:`see here<servers>`.
* To understand how to fly through and manipulate your visualization, :ref:`see here<viz-navigation>`.

Advanced
--------

.. toctree::
    :titlesonly:
    :maxdepth: 2

    files
    reader
    multiple_datasets
    flask

.. Using with yt
++++++++++++++++
If you are using [yt](https://yt-project.org) you will be able to call :code:`region.outputToFirefly`. See the :ref:`API reference<api>`.
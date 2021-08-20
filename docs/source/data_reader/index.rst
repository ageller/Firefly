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

To format your data for Firefly
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
After following the :ref:`install instructions<install>`:

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

To view the Firefly visualization
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: python

    # Spawn a server to host the visualization
    from Firefly.server import spawnFireflyServer
    process = spawnFireflyServer()

Now navigate to `http://localhost:5000 <http://localhost:5000>`_ in your web browser.
Alternatively, if you're using a `Jupyter notebook <https://jupyter.org>`_, you can setup an IFrame:

.. code-block:: python

    # Jupyter notebook alternative:
    # Create a window to view the data
    from IPython.display import IFrame
    IFrame("http://localhost:5000", width=1000, height=500)

Regardless of browser or notebook, the final step is to send the data to the visualization!
This will update your web prowser or IFrame.

.. code-block:: python

    my_arrayReader.sendDataViaFlask()

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
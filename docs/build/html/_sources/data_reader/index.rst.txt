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
    If you are using FIRE data, check out :ref:`the FIRE quickstart page<fire-viz-creation>`
    which demonstrates how to create a Firefly visualization with only the path to a FIRE
    snapshot.

To format your data for Firefly
+++++++++++++++++++++++++++++++
After following the :ref:`install instructions<install>`:

.. code-block:: python

    # Import Firefly API
    from firefly.data_reader import ArrayReader

    # Output it to a Firefly-compatible JSON!
    my_arrayReader = ArrayReader(
        coords,
        fields = fields,
        JSONdir = JSONdir,
        write_jsons_to_disk = True
    )

To view the Firefly visualization
+++++++++++++++++++++++++++++++++

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

Regardless of browser or notebook, the final step is to send the data to the visualization.
This will update your web browser or IFrame.

.. code-block:: python

    my_arrayReader.sendDataViaFlask()

Next steps
----------

.. toctree::
    :titlesonly:
    :maxdepth: 2

    files
    reader
    multiple_datasets
    flask

.. toctree::
    :hidden:

    fire_quickstart

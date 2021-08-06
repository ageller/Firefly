.. _fire-viz-creation:
Using Firefly to view FIRE data
===============================

Quickstart
----------

**To easily create a Firefly visualization of FIRE data**:

.. code-block:: python

    # Import Firefly API
    from Firefly.data_reader import SimpleFIREreader

    # The simple reader only needs the snapshot location
    # Here we're using the shared Stampede2 directory as an example
    reader = SimpleFIREreader(
	'/scratch/projects/xsede/GalaxiesOnFIRE/core/m12i_res7100/output/snapdir_600',
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
    reader.sendDataViaFlask()


* A more in-depth example of formatting **FIRE** data `is available here <https://github.com/ageller/Firefly/blob/main/src/Firefly/ntbks/convert_FIRE_data.ipynb>`_.
* If you're running Firefly on an external computer, `don't forget to create an SSH tunnel to the port the server is on <https://docs.anaconda.com/anaconda/user-guide/tasks/remote-jupyter-notebook/>`_ (5000 in the above example).
* The above assumes you are executing the code in a `Python notebook <https://jupyter.org>`_.
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
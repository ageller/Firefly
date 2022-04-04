.. _fire-viz-creation:
Using Firefly to view FIRE data
===============================

Quickstart
----------

To easily create a FIRE Firefly visualization
+++++++++++++++++++++++++++++++++++++++++++++

After following the :ref:`installation instructions<install>`:

.. code-block:: python

    # Import Firefly API
    from firefly.data_reader import SimpleFIREreader

    # The simple reader only needs the snapshot location
    # Here we're using the shared Stampede2 directory as an example
    reader = SimpleFIREreader(
	'/scratch/projects/xsede/GalaxiesOnFIRE/core/m12i_res7100/output/snapdir_600',
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

.. seealso:: 
    A more in-depth example of formatting **FIRE** data `is available here <https://ageller.github.io/Firefly/docs/build/html/data_reader/convert_FIRE_data.html>`_.

.. _viz-creation:
Creating your own instance of Firefly 
=====================================

Quickstart
----------

Saving your own Firefly-compatible data is as simple as:

.. code-block:: python

    # Import Firefly API
    from Firefly.data_reader import Reader,ParticleGroup

    # Load your data. Here we're creating random data.
    coords = np.random.random(size=(20,3))
    fields = np.random.random(size=coords[:,0].size)

    # Insert your data into a Firefly class
    my_particleGroup = ParticleGroup(
        'testdata',
        coords,
        tracked_arrays=[fields],
        tracked_names=['testfield']
    ) 

    # Output it to a Firefly-compatible JSON!
    my_reader = Reader(JSONdir='./where/you/want/to/save/output')
    my_reader.addParticleGroup(my_particleGroup)
    my_reader.dumpToJSON(loud=True)

:ref:`An in-depth walkthrough is available here.<producing-files>`

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
+++++++++++++
If you are using [yt](https://yt-project.org) you will be able to call :code:`region.outputToFirefly`. See the :ref:`API reference<api>`.
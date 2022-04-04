.. _files:

Understanding Firefly's input requirements
==========================================

Firefly uses JSON to load data into a web browser's javascript interpreter.
The :code:`.json` file required to run an individual instance of Firefly
are collected into :code:`JSONdir`s.

There are four classes of :code:`.json` file that Firefly requires:

.. _docsstartup:

The startup file, :code:`startup.json`
++++++++++++++++++++++++++++++++++++++

This is a configuration file that specifies which :code:`JSONdir` Firefly 
should attempt to open at startup. It should be formatted as a dictionary
mapping between strings of integers sequential integers mapped to the location
of the :code:`JSONdir` relative to the :code:`firefly/static` directory.


For example, the default :code:`startup.json` that ships with Firefly looks like:

.. code-block:: 

    {"0":"data\/FIREData_50"}

If it contains multiple entries, Firefly will allow the user to
select the dataset from a dropdown when the webapp is initialized.

.. code-block:: 

    {"0":"data\/FIREData_50","1":"data/tutorial"}

.. note:: 

    :code:`startup.json` must reside within :code:`firefly/static/data`.

The settings file, :code:`<settings>.json` 
++++++++++++++++++++++++++++++++++++++++++

This is a :code:`.json` file that contains the default settings for
various aspects of Firefly's UI.

as well as default filter settings for each of the particle groups.
It should be created using a :class:`firefly.data_reader.Settings` instance
and its corresponding :func:`~firefly.data_reader.Settings.outputToJSON()` method.
This lives in the :code:`JSONdir` sub-directory described above.
It can be named whatever you'd like as long as it is linked to correctly
within :code:`filenames.json`, described below.

The particle group files, :code:`<prefix><particleGroup><fileNumber>.json`
+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

These are the main data files, and contain the particle coordinates and their
corresponding field values. They should exclusively be created using a
:class:`firefly.data_reader.ParticleGroup`
instance's :func:`~firefly.data_reader.Particle_group.outputToJSON` method.
These files live in the :code:`JSONdir` sub-directory described above.
They can be named whatever you'd like as long as they are linked to correctly within
:code:`filenames.json`, described below.

.. warning::

    Datasets are chunked into multiple files to improve performance at startup and
    to enable a loading bar to give feedback to you, the user!
    You should not purposefully circumvent this feature by setting the :code:`nparts_per_file`
    keyword argument of :func:`firefly.data_reader.ParticleGroup.outputToJSON`
    to a very large value.

.. _docsfilename:

The manifest file, :code:`filenames.json`
+++++++++++++++++++++++++++++++++++++++++

This is a :code:`.json` file that identifies
the different files within the selected 
dataset Firefly needs to open.

It should map particle group names to lists of files and the number
of particles in each file along with the default settings file to use. 

.. code-block::

    {"<particleGroup1>" : [[<this_filename>,<npart_this_file>] for file in particleGroup1Files],
    "<particleGroup2>" : [[<this_filename>,<npart_this_file>] for file in particleGroup2Files],
    "options" : [["<JSONdir>/<settings_filename>.json",0]]}

The easiest way to create this file is to use the 
:func:`firefly.data_reader.Reader.dumpToJSON` method of a 
:class:`firefly.data_reader.Reader` instance containing 
:class:`firefly.data_reader.Options` and 
:class:`firefly.data_reader.ParticleGroup` instances.

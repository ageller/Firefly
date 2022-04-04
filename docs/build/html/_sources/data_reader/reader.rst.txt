.. _producing-files:
Producing Firefly formatted :code:`.json` files using the :ref:`Python API <api>` 
================================================================================= 

Firefly reads formatted JSON files.
While it is certainly possible to produce Firefly formatted :code:`.json` files 
manually (with say, a text editor) we have instead provided a convenient Python frontend
for users to take advantage of.


.. _docsreader:

The :class:`~firefly.data_reader.Reader` class
----------------------------------------------

A :class:`~firefly.data_reader.Reader` instance serves to link instances of
each of the below classes. 
Its :func:`~firefly.data_reader.dumpToJSON` method will take the data from each of the 
attached instances and collect it into a single :code:`JSONdir`, producing each of the 
necessary files listed in :ref:`files` automatically.

.. toctree::
	
	reader_tutorial

To quickly open your own data, you can sub-class :class:`~firefly.data_reader.Reader`
(e.g. :class:`firefly.data_reader.SimpleReader`) to parse and re-format your
data while maintaining all of the inherited functionality that the 
:class:`~firefly.data_reader.Reader` class offers.
Example sub-classes customized for FIRE simulation data ship with Firefly 
(:class:`firefly.data_reader.FIREreader` and :class:`firefly.data_reader.SimpleFIREreader`)
and are demonstrated in the corresponding example notebook.

.. toctree::
	
    convert_FIRE_data


Using with yt
+++++++++++++

If you are using `yt <https://yt-project.org>`_ can use the :code:`dataset.create_firefly_object`
method to create a :class:`~firefly.data_reader.Reader` instance.
For more information see the `Firefly page in the yt documentation <https://yt-project.org/docs/dev/visualizing/visualizing_particle_datasets_with_firefly.html>`_.
    

.. _docsparticlegroup:

The :class:`~firefly.data_reader.ParticleGroup` class
-----------------------------------------------------

:class:`~firefly.data_reader.ParticleGroup` instances organize coordinate array data
alongside any corresponding field array data. 
They also contain lists of boolean flags to signal to the Firefly webapp whether 
someone who visits the webapp should be allowed to filter and/or colormap by a 
particular field.

Each :class:`~firefly.data_reader.ParticleGroup` instance gets its own sub-panel in the UI,
the contents of which can be customized using a :code:`Settings.json` file (described below).
Filters and colormaps only apply to the particle groups to which they are attached, there are no 
global filter options. 

.. _docssettings:

The :class:`~firefly.data_reader.Settings` class
------------------------------------------------

:class:`~firefly.data_reader.Settings` instances allow users to customize the 
appearance of the webapp's UI. 
Every element of the UI is toggleable and has a corresponding boolean flag.

In this way, custom instances of Firefly can be created to catered to different audiences
without having to change any of the Firefly source code. 

.. note:: 

	The appropriate settings can either be passed at the initialization of a
	:class:`firefly.data_reader.Reader` or :class:`firefly.data_reader.ParticleGroup`
	instance OR can be updated after the fact by accessing the :code:`reader.settings`
	or :code:`particleGroup.attached_settings` attributes.

The :class:`firefly.data_reader.Settings` documentation provides 
a comprehensive list of the relevant boolean flags and the UI elements they control.

.. toctree::

	settings_tutorial


.. _docstween:

The :class:`~firefly.data_reader.TweenParams` class
---------------------------------------------------

A :class:`~firefly.data_reader.TweenParams` instance allows the user to 
pre-define interpolated camera paths (tweening; from in-betweening) that visitors to the Firefly
webapp can activate by pressing the **T** key on the keyboard. 
Keyframe camera locations are specified and are linearly interpolated to produce a smoothly 
varying camera path within the webapp. 
This feature is available whenever a :code:`JSONdir` contains a 
:code:`TweenParams.json` file.
This file will be produced if a :class:`~firefly.data_reader.Reader` has a 
:class:`~firefly.data_reader.TweenParams` attached to it
when the :func:`~firefly.data_reader.Reader.dumpToJSON` method is called.

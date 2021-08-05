.. _producing-files:
Producing Firefly formatted :code:`.json` files using the :ref:`Python API <api>` 
==================================================================================

Firefly reads formatted JSON files.
While it is certainly possible to produce Firefly formatted :code:`.json` files 
manually (with say, a text editor) we have instead provided a convenient Python frontend
for users to take advantage of.
Below is a tutorial that will allow you to jump right in.

.. toctree::
	
	reader_tutorial


.. _docsreader:

The :class:`~Firefly.data_reader.Reader` class
----------------------------------------------

A :class:`~Firefly.data_reader.Reader` instance serves to link instances of
each of the below classes. 
Its :func:`~Firefly.data_reader.dumpToJSON` method will take the data from each of the 
attached instances and collect it into a single :code:`JSONdir`, producing each of the 
necessary files listed in :ref:`files` automatically.


.. _docsparticlegroup:

The :class:`~Firefly.data_reader.ParticleGroup` class
-----------------------------------------------------

:class:`~Firefly.data_reader.ParticleGroup` instances organize coordinate array data
alongside any corresponding field array data. 
They also contain lists of boolean flags to signal to the Firefly webapp whether 
someone who visits the webapp should be allowed to filter and/or colormap by a 
particular field.

Each :class:`~Firefly.data_reader.ParticleGroup` instance gets its own sub-panel in the UI,
the contents of which can be customized using a :code:`Settings.json` file (described below).
Filters and colormaps only apply to the particle groups to which they are attached, there are no 
global filter options. 

.. _docssettings:

The :class:`~Firefly.data_reader.Settings` class
------------------------------------------------

:class:`~Firefly.data_reader.Settings` instances allow users to customize the 
appearance of the webapp's UI. 
Every element of the UI is toggleable and has a corresponding boolean flag.

In this way, custom instances of Firefly can be created to catered to different audiences
without having to change any of the Firefly source code. 

.. note:: 

	The appropriate settings can either be passed at the initialization of a
	:class:`Firefly.data_reader.Reader` or :class:`Firefly.data_reader.ParticleGroup`
	instance OR can be updated after the fact by accessing the :code:`reader.settings`
	or :code:`particleGroup.attached_settings` attributes.

The :class:`Firefly.data_reader.Settings` documentation provides 
a comprehensive list of the relevant boolean flags and the UI elements they control.

.. toctree::

	settings_tutorial


.. _docstween:

The :class:`~Firefly.data_reader.TweenParams` class
---------------------------------------------------

A :class:`~Firefly.data_reader.TweenParams` instance allows the user to 
pre-define interpolated camera paths (tweening; from in-betweening) that visitors to the Firefly
webapp can activate by pressing the **T** key on the keyboard. 
Keyframe camera locations are specified and are linearly interpolated to produce a smoothly 
varying camera path within the webapp. 
This feature is available whenever a :code:`JSONdir` contains a 
:code:`TweenParams.json` file.
This file will be produced if a :class:`~Firefly.data_reader.Reader` has a 
:class:`~Firefly.data_reader.TweenParams` attached to it
when the :func:`~Firefly.data_reader.Reader.dumpToJSON` method is called.

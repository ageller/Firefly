Quickstart
==========

Requirements
------------

To use an existing copy of Firefly you will need:

* An internet browser; we recommend Firefox or Google Chrome

To visualize your own data with Firefly you will need:

*  A working Python installation; we recommend installing `Anaconda <https://www.anaconda.com/download/>`_ Python version 3.x, with the following packages:

    * numpy

    * h5py
    
    * pandas
    
    * eventlet
    
    * flask-socketio
    
    * flask

    * requests

.. _install: 

Installation
------------

Download the latest stable release
++++++++++++++++++++++++++++++++++

To install the latest stable release you can :code:`pip install` Firefly 


.. code-block:: bash

    pip install firefly-vis

This is the preferred way to install Firefly as it will
automatically install the necessary requirements and put Firefly
into your :code:`${PYTHONPATH}` environment variable so you can 
import it.

Build from source
+++++++++++++++++

Build the latest version directly from the most up-to-date version
of the source-code by cloning/forking the GitHub repository 

.. code-block:: bash

    git clone https://github.com/ageller/Firefly.git

or manually download the zip file and unpack it 
(though this is not recommended as the development version is
inherently unstable and you would not be able to update without
repeating this step).

Once you have the source, you can build Firefly (and add it to your environment)
by executing:

.. code-block:: bash

    python setup.py install

in the top level directory. The required Python packages will automatically be 
installed as well.

You can test your installation by looking for the Firefly 
executable built by the installation

.. code-block:: bash

    which Firefly

and by importing the Firefly Python frontend

.. code-block:: python

    import Firefly


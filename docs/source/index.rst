.. Firefly documentation master file, created by
   sphinx-quickstart on Thu Jun 24 09:37:39 2021.
   You can adapt this file completely to your liking, but it should at least
   contain the root `toctree` directive.

Firefly: a browser-based interactive data visualization platform
================================================================

Installation
____________

You will also require an internet browser; we recommend Firefox or Google Chrome. To import your own data into Firefly, you will also require python; we recommend installing `Anaconda <https://www.anaconda.com/download/>`_ Python version 3.x .

Stable release
++++++++++++++

To install the latest stable release you can :code:`pip install` Firefly 


.. code-block:: bash

    pip install firefly-vis

Build from source
+++++++++++++++++

Build the latest version from source by cloning/forking this repository 

.. code-block:: bash

    git clone https://github.com/ageller/Firefly.git

.. code-block:: bash

    git fork https://github.com/ageller/Firefly.git


or download the zip file and unpack it. Once you have the source you can build Firefly and add it to your environment.

.. code-block:: bash

    python setup.py install

Using with yt
+++++++++++++

If you are using [yt](https://yt-project.org) you will be able to call :code:`region.outputToFirefly`. See the :ref:`API reference<api>`. 


Table of Contents
-----------------

.. toctree::

    webapp/index
    server/index
    data_reader/index
    networking
    experimental/index
    reference/api/api

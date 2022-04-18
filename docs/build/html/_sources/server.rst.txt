.. _servers:
Hosting a Firefly webserver
===========================

Because Firefly is fundamentally a web application it must be served
to your browser from a web server. 
That server can either be located on the internet or can be hosted
locally (and accessed through the :code:`localhost` url). 

.. _local:

Hosting Firefly locally
-----------------------

.. note:: 

    For the :ref:`load new data button` button to work Firefly 
    must be hosted locally (vs. :ref:`hosted on the internet <internet host>`).

Using :code:`python -m http.server` to host :code:`index.html`
++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

.. warning:: 

    :ref:`Features that require Flask <flask>`
    will not work if Firefly is hosted this way.

From within the the :code:`Firefly/src/firefly` directory (or from within 
the corresponding sub-directory in your site-packages directory) execute

.. code-block:: bash

    python -m http.server

This launches a Python :code:`SimpleHTTPServer` that will serve the 
:code:`index.html` file located in the directory where the command is
executed. 
This will host a version of Firefly identical to the one hosted on 
:ref:`the internet <internet host>` with the exception that you can 
use the :ref:`load new data button` button.

.. _flask host:

Using :code:`run_server.py` to launch Flask
+++++++++++++++++++++++++++++++++++++++++++
From within the the :code:`Firefly/src/firefly` directory (or from within 
the corresponding sub-directory in your site-packages directory) execute

.. code-block:: bash 

    python run_server.py

Using the :code:`Firefly` executable to launch Flask
++++++++++++++++++++++++++++++++++++++++++++++++++++

The Firefly bash executable is a wrapper to 
:code:`run_server.py` so that it can be initialized without having to 
be in :code:`Firefly/src/firefly` directory.

It is distributed along with the Firefly source
files and Python API and is located in :code:`Firefly/src/firefly/bin`
(or the corresponding sub-directory in your site-packages directory).
When Firefly is :ref:`correctly installed <install>` then this directory
will be added to your :code:`${PATH}$` variable. 

You should then be able to execute

.. code-block:: bash

    Firefly

from any directory to launch a Firefly Flask server.

Using Firefly from within a Jupyter notebook
--------------------------------------------

Jupyter notebooks are powerful analysis tools that allow you to
interactively explore your data, much like Firefly!

Because Firefly is built as a webpage it can easily be displayed,
with its full functionality, within a Jupyter notebook using an iframe.

.. image:: _static/jupyter_embed.png
    :align: center

Embedding within an iframe
++++++++++++++++++++++++++

With a Firefly server hosted at `localhost:xxxx` you can access it
by creating an iframe with the command:

.. code-block::

    from IPython.display import IFrame

    url = "http://localhost:xxxx/"
    IFrame(url, width=700, height=700)

Hosting a Firefly server within a notebook
++++++++++++++++++++++++++++++++++++++++++

You can even host a Firefly Flask server without going back to the
command line from within a Jupyter notebook as well. 

.. code-block:: 

    from firefly.server import spawnFireflyServer

    ## optionally accepts port as positional argument
    spawnFireflyServer()

Where `xxxx` is the 4 digit port number that you'd like to host the server on.

When you would like to kill this server when you are done with it,
use the command:

.. code-block:: 

    from firefly.server import killAllFireflyServers

    ## optionally accepts a single process id to kill
    killAllFireflyServers()

Note that the pid is accessible from the original :func:`~firefly.server.spawnFireflyServer`
call but that processes in general do not like to be killed and may sometimes
survive the targeted attempt on their life. It's more reliable to indiscriminately 
kill any process that has a Firefly server process name (the default).

For the details of the usage of these functions,
consult the :ref:`server API documentation <server api>`.

.. _internet host:

Hosting a static version on the internet
----------------------------------------

To make Firefly accessible via the internet, the 

.. code-block:: 
    
    reader.copyFireflySourceToTarget("my_Firefly")


.. seealso:: 

    :func:`~firefly.data_reader.Reader.copyFireflySourceToTarget` takes an optional boolean
    keyword argument :code:`init_gh_pages` that will attempt to 
    create a new repository and enable GitHub pages automatically.
    See :ref:`multiple datasets` for details.



.. _port forwarding:

Accessing remote Firefly servers via port forwarding
----------------------------------------------------

Firefly can easily be hosted on a cluster environment for
two main benefits:

1. Data that is stored on the cluster can be rendered
without having to transfer them to ones local machine

2. Firefly can be embedded into an iframe within a Jupyter notebook
hosted on the cluster

.. note:: 

    The polite thing to do is to host your Firefly server from within an
    interactive session on a compute node, but a login node will work
    as well. The server will only serve the files, it won't actually
    do any of the rendering, so the actual load on the login node 
    could be small.

.. note::
    This is an identical process to hosting a Jupyter notebook
    remotely on a cluster and accessing it through your local machine, 
    so if you know how to do that you're already set!

Once the server is hosted following one of the procedures listed in 
:ref:`the section above <local>` the port the server is hosted on must 
be forwarded to your local machine.
This can be done with a simple ssh command:

.. code-block:: 

    ssh -L xxxx:localhost:xxxx UNAME@stampede2.tacc.xsede.org ssh -L xxxx:localhost:xxxx

.. note:: 

    This command can be stored in an alias in ones' :code:`.bashrc`
    as something like: :code:`alias s2firefly='...'`
    Which is executed like:

    .. code-block::  
    
        s2firefly YYY

    Where `YYY` is the hostname of the compute node.
    This command will open a pseudo-terminal once you login,
    it is not necessary to do anything once the connection is established
    but closing the pseudo-terminal window will terminate the
    port-forwarding.

Once the port is forwarded, simply navigate to `localhost:xxxx <http://localhost:xxxx>`_
on your computer's browser and enjoy Firefly!

.. note:: 

    This same principle can be applied to expose a locally hosted version 
    of Firefly to users over the internet, visitable by anyone with your 
    ip address (which one could share). The procedure for forwarding
    the port is different and requires going into ones' router settings. 

    .. warning:: 
        
        Doing this could expose your home computer system,
        proceed with caution! We do not share the details of 
        how to accomplish this because only those who understand 
        the consequences should attempt this!

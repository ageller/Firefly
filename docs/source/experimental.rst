.. _experimental features: 

Experimental features
=====================

.. warning:: 

    These features are not finalized, their functionality, API, and
    existence may be subject to change. 

Streaming the Firefly view
--------------------------

A Firefly server hosted via Flask can be rendered remotely and streamed
by visiting the :code:`localhost:xxxx/stream` URL. 
For security reasons, this currently does not work if the host is not the current machine 
(which defeats the purpose of streaming the view in the first place, 
we're working on getting around this limitation). 

The FPS of the stream can be specified when starting the Flask server
see the :ref:`documentation <server api>` for :func:`firefly.server.startFireflyServer`
for details.
The stream quality will degrade to ensure the target FPS  is achieved.

VR support
----------

There is limited Google cardboard support for VR. 
If a Flask server is being hosted on a computer, then visit 
`<local ip address>:xxxx/cardboard <http://localhost:xxxx/cardboard>`_ from 
a mobile phone connected on the same network and you should be 
able to look and move around. 

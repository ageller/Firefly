.. _experimental features: 

Experimental features
=====================

.. warning:: 

    These features are not finalized, their functionality, API, and
    existence may be subject to change. 

Scaling particle sizes according to SmoothingLength
---------------------------------------------------

If a field is named *specifically* "SmoothingLength" and the
:code:`doSPHrad` flag in the settings file is set to :code:`True`
then the particles in that group will be scaled by their smoothing
lengths and have opacities that vary across their face according to 
a cubic spline.

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

Volume rendering with 2d projection
-----------------------------------

When the **p** key is pressed on the keyboard a 2d histogram will be
projected and colormapped. 
The colorbar limits for this projection are currently hardcoded
such that the brightest pixel is the top of the colormap and the dimmest
pixel are at the bottom of the colormap. 

Even still, as a proof of concept it demonstrates that Firefly can 
interactively volume render! We will be dilligently working to
appropriately resize points according to their SPH smoothing lengths
and blend according to a user specified kernel. Be on the lookout for 
this exciting new feature!

VR support
----------

There is limited Google cardboard support for VR. 
If a Flask server is being hosted on a computer, then visit 
`<local ip address>:xxxx/cardboard <http://localhost:xxxx/cardboard>`_ from 
a mobile phone connected on the same network and you should be 
able to look and move around. 

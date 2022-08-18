.. Firefly documentation master file, created by
   sphinx-quickstart on Thu Jun 24 09:37:39 2021.
   You can adapt this file completely to your liking, but it should at least
   contain the root `toctree` directive.

Firefly: a browser-based interactive particle data visualization platform
=========================================================================

.. image:: _static/screenGrab.png

.. warning::  WebGL performance is severely degraded in Google Chrome
   by default on the new Apple Silicon M1 processor. 
   If you're using an M1 processor
   see `this github issue <https://github.com/ageller/Firefly/issues/84>`_
   for instructions on how to enable hardware acceleration using 
   Chrome's internal flags. 

Firefly is an interactive application for visualizing particle-based data 
from within the web browser.
Firefly can also be run from entirely within a Jupyter notebook using the
Python frontend.

Learn how to fly through a Firefly visualization :ref:`here <viz-navigation>`
or :ref:`quickly create your own <viz-creation>`.


Contents
--------

.. toctree::
    :maxdepth: 1

    installation
    webapp/index
    data_reader/index
    server
    experimental
    reference/api/api

Using Firefly
=============


## Flying with the mouse or keyboard

When you launch Firefly in the default configuration, you can use the mouse to rotate your view and zoom in and out.  To rotate the view, left click and drag.  To zoom, use the mouse wheel (or two-finger scroll).  The default view uses the "Trackball controls" from the three.js library.  Within this Trackball mode, your center is fixed, but can be moved with a right-click and drag.  You are always looking toward that center. And you can rotate your view around that center.

Similar intuitive controls should work on a mobile device, though this has not been fully tested.

If you press the space bar, or use the user interface (see below) to uncheck the center "Lock" button, or you provide your own initial camera rotation using the python tool (see [here](https://github.com/ageller/Firefly/wiki/Python-Data-Converter)).  You will switch to the "Fly controls" from the three.js library.  Fly controls utilize the keyboard:

* **WASD** move
* **R|F** up|down
* **shift** reduces your speed by a factor of 10 (hold shift while pressing another key)

<!---
The three controls below are possible, but I commented them out in this version so that we can have a seamless transition between Fly and Trackball controls:
* **Q|E** roll
* **up|down** pitch
* **left|right** yaw
-->

Fly mode gives you more freedom to move about.  You are not constrained to a center position as you are in Trackball mode.  (If you are in Fly mode, pressing the space bar will switch you to Trackball mode, and vice versa.)

One workflow could be to switch to Fly controls.  Fly around to a region of interest.  Then press the space bar (or click the "Lock" button on the user interface, see below).  This switches you to Trackball mode and locks the center on your region of interest.  Within Trackball mode, you can now view that region of interest from any angle, while always facing it.

## User Interface

![User Interface](https://github.com/ageller/Firefly/blob/master/src/docs/UI.png)

Firefly also contains a user interface (pictured above) that enables further control over what data is displayed.  (This Controls interface is fully customizable, from within the python data converter; see [here](https://github.com/ageller/Firefly/wiki/Python-Data-Converter)).

Within these Controls, you will find various sections that can be expanded by dropdown arrows, and within these sections you will have buttons, sliders and/or input boxes.  For all input boxes, you must hit ``enter" on your keyboard for the value to be recorded by Firefly.
 The various sections of these Controls include the following:


.. toctree::

    data_controls
    camera_controls
    particle_controls


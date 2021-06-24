Particle controls
=================

### Particles

Each particle type will receive it's own control sub-panel.  In the example above, we show two different particle types: Gas and Stars.  Initially these sub-panels will be collapsed (as shown for Stars above).  Within this collapsed view, from left to right, you have a switch to turn the particles on or off, a slider and text box to change the particle size, and a colored box to change the change the particle's color.

If you click on the downward facing triangle on the right side of the sub-panel, you can expand the sub-panel to review additional controls (as shown for Gas above). Within this expanded sub-panel the first item is a slider and text box for "N", which controls the number of particles that will be drawn. (The default is to draw all, and you can slide this to lower values to draw less.) This is analogous to the global Decimation slider, but works on each particle separately.

If you provide velocities to Firefly, you will get controls to "Plot Velocity Vectors", which a checkbox and a dropdown menu.  If you click the checkbox, the points will be converted to lines (by default), where the forward direction is whiter, and the backward direction becomes more transparent.  You may need to increase the particle size to see the vectors.  You can also change the velocity vector plotting style to be either lines, arrows or triangles.  (The pointed side of the triangles or arrows point in the direction of the velocity vector.)

If you choose to define Filters within the python script (see [here](https://github.com/ageller/Firefly/wiki/Python-Data-Converter)), you will also see a dropdown, slider and text entry boxes for each of the filters you indicated.  These filters define what data should be drawn on the screen.  The dropdown menu allows you to choose between different filters.  The slider and text entry boxes define the limits of the filters.  Only particles that have parameters within the black region of the slider will be drawn.  If you enter text in the text boxes, the filter slider limits will be redefined.



* If you choose to define Filters, you will see a dropdown within the particle group's UI pane. There will be a slider and text entry boxes for each of the filters you indicated. These filters define what data should be drawn on the screen. The dropdown menu allows you to choose between different filters. Filters are applied additively, so you can layer different filters together.

* The slider and text entry boxes define the limits of the filters. Only particles that have parameters within the black region of the slider will be drawn. There is an invert filter checkbox that will do the opposite, only showing the particles that fall outside the black bar's extent. If you enter text in the text boxes, the filter slider limits will be redefined.

* There is also a playback checkbox which will slide the black bar along the filter limits and update the view accordingly. Currently it is not possible for the user to redefine the playback speed (but you can change the size of the black bar) and it is discouraged from layering different playbacks (it _probably_ works but it might also break something).

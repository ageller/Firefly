.. _flask: 

Sending data to a Firefly server via Flask
==========================================

.. warning:: 

	To send data to an active Firefly webserver you will
	need to launch Firefly
	:ref:`using a method involving Flask <flask host>`.

When Firefly is hosted with a Flask webserver a 
`localhost:xxxx/data_input <http://localhost:xxxx/data_input>`_
endpoint is exposed through which new particle data, settings, and
tween params can passed to an active Firefly visualization. 

Using this endpoint, it is possible to circumvent the need to output
data to :code:`.json` files entirely, instead creating a Python
string (formatted to contain the :code:`.json` data that *would've* been 
written to disk) that is :code:`POST`'d to the data input
endpoint using the :code:`requests` Python module. 

To facilitate this, we provide the
:func:`firefly.data_reader.Reader.sendDataViaFlask` method, 
which will output the data contained in a
:class:`~firefly.data_reader.Reader` instance to a :code:`JSON`
*string* and then :code:`POST` it to the data input endpoint of
the specified localhost port.

.. toctree::

	flask_tutorial

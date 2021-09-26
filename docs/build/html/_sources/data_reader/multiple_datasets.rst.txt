.. _multiple datasets:

Managing multiple datasets
==========================

.. toctree::

	multiple_datasets_tutorial


With :code:`startup.json`
-------------------------

When Firefly first opens it searches for :ref:`the startup file <docsstartup>`, :code:`startup.json`, 
in :code:`firefly/static/data`. If :code:`startup.json` does not exist,
Firefly will display a button that will allow you to
select the directory containing the files you want to
load (the directory must contain a :ref:`manifest file <docsfilename>`, :code:`filenames.json`).

This interface can also be accessed if you already have a dataset loaded 
and displayed in Firefly from within the UI by clicking on
the :ref:`load new data button` button.

.. note::

	Some browsers may show a default warning message that you
	are about to upload many files to the site and
	to only do so if you trust the site. 
	Please allow Firefly to upload these files--
	you are not uploading them to the internet,
	only to your browser.

.. warning::

	For most browsers, you will only be able to select a
	directory that is a sub-directory of :code:`firefly/static/data`. 
	You must keep your :code:`.json` files there or
	could use symbolic links within
	the data directory pointing to elsewhere on your local
	disk, e.g.,

	.. code-block:: bash

		ln -s /home/mydirectory/snapdir_XXX
	
	:func:`firefly.data_reader.Reader.dumpToJSON` will automatically
	create a symbolic link if it detects that the :code:`JSONdir` you
	specified is not a sub-directory of :code:`firefly/static/data`.

If you have multiple data sets available on your computer
and prefer to have a menu of these data files to choose
from at the start of Firefly, you can append entries to the
:code:`startup.json` file to create a list of directories
.  For instance, a :class:`~firefly.data_reader.Reader` may create a
:code:`startup.json` file that contains the following:

.. code-block:: 

	{"0":"data\/snapdir_001"}

You could manually append this to contain the following:

.. code-block:: 

	{"0":"data\/snapdir_001",
	"1":"data\/snapdir_002",
	"2":"data\/snapdir_003",
	"3":"data\/snapdir_004"}

Or use the :code:`write_startup=append` 
keyword argument of :func:`~firefly.data_reader.Reader.__init__` 
when initializing your second dataset.


With this :code:`startup.json`, you would see a button when
Firefly loads that, when clicked, will allow you to choose
which data set to display. 
In general, this method may be useful if the Firefly webserver
you are accessing is not :ref:`hosted locally <local>` and is instead 
being :ref:`port forwarded <port forwarding>`
to your local browser (which can only see your local file system).

With separate Firefly source directories
----------------------------------------

Alternatively, one could make many copies of the Firefly source directory, 
each with their own :code:`startup.json`. 

To facilitate this, we provide the 
:func:`firefly.data_reader.Reader.copyFireflySourceToTarget`
method which will create a new directory and copy the necessary source
files to run Firefly within it (without the Python frontend API). 

You can optionally specify to also copy the necessary Flask files to 
run a flask local server by keyword argument but this is disabled by default.
Instead, this feature is envisioned to enable users to quickly create instances of 
Firefly that :ref:`they can host on the internet <internet host>`. 

To streamline this process even further, we provide an optional 
:code:`init_gh_pages` keyword argument that will even attempt to make
a new GitHub repository with GitHub pages, a free webhosting service offered
by GitHub, enabled.

.. note::
	
	To use the :code:`init_gh_pages` keyword argument you must have created
	a GitHub OAUTH token somewhere on your system and passed it to 
	:func:`~firefly.data_reader.Reader.copyFireflySourceToTarget`
	using the :code:`GHOAUTHTOKENPATH` keyword argument (which defaults
	to :code:`$HOME/.github.token`.
	Attempting to use the :code:`init_gh_pages` flag without doing so 
	will raise an error message with instructions for how to generate
	a GitHub OAUTH token. 

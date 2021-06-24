Accessing remote Firefly servers via port forwarding
====================================================

Firefly can easily be hosted on a cluster environment for two main benefits:
* Snapshots that are stored on the cluster can be rendered without having to transfer them
* Firefly can be embedded into an iframe within a Jupyter notebook hosted on the cluster

The polite thing to do is to host from within an interactive session on a compute node, but a login node will work as well (and since calculations occur within the browser it is mostly inoffensive).

Note that this is the identical process to hosting a Jupyter notebook remotely on a cluster and accessing it through your local machine.
## Host the server
Identically to how you would host a `SimpleHTTPServer` using Python in order to run Firefly on Chrome, navigate to the Firefly directory where `index.html` is on the cluster and execute:
```
$ python -m SimpleHTTPServer xxxx
```
Where `xxxx` is a 4 digit port of your choosing, omitting the port will default to 8000.

The server can also be hosted within a Jupyter notebook, as [described here](https://github.com/ageller/Firefly/wiki/Using-Firefly-Within-a-Jupyter-Notebook).
## Port-forward the localhost port you chose
Next, you must connect `localhost:xxxx` on the cluster to your local machine's `localhost:xxxx`. This can be done from the terminal using `ssh -L` in two parts, first from the local machine to the login node and then from the login node to the compute node. With a simple alias in your `.bashrc` this can be combined into a single command:
```
alias s2firefly='ssh -L xxxx:localhost:xxxx UNAME@stampede2.tacc.xsede.org ssh -L xxxx:localhost:xxxx'
```
Which is executed like:
```
$ s2firefly YYY
```
Where `YYY` is the hostname of the compute node. This command will open a pseudo-terminal once you login, it is not necessary to do anything once the connection is established but closing the terminal window will terminate the port-forwarding.

## Visit the port on your local computer
Navigate to
`
localhost:xxxx
`
on your computer's browser and enjoy Firefly!


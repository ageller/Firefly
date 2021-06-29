Using Firefly from within a Jupyter notebook
============================================

Jupyter notebooks are powerful analysis tools that allow you to interactively explore your data, much like Firefly!

Because Firefly is built as a webpage it can easily be displayed, with its full functionality, within a Jupyter notebook using an iframe.

![Jupyter Embed](https://github.com/ageller/Firefly/blob/master/src/docs/jupyter_embed.png)

## Embedding within an iframe
With a `SimpleHTTPServer` Firefly server hosted at `localhost:xxxx` you can access it by creating an iframe with the command:

```python
from IPython.display import IFrame

url = "http://localhost:xxxx/"
IFrame(url, width=700, height=700)
```
Piece of trivia: this is how youtube videos are embedded into webpages as well!

## Hosting a Firefly server within a notebook
You can host a Firefly `SimpleHTTPServer` without going back to the command line from within a Jupyter notebook as well using the command:
```python
import os
import signal
import subprocess
directory = "/Path/To/Firefly"

cmd = "pushd " + directory + " ; python -m SimpleHTTPServer xxxx; popd"
pro = subprocess.Popen(cmd, stdout = subprocess.PIPE, shell = True, preexec_fn = os.setsid)
```
Where `xxxx` is the 4 digit port number that you'd like to host the server on. When you would like to kill this server when you are done with it, use the command:
```python
os.killpg(os.getpgid(pro.pid), signal.SIGTERM)  # Send the signal to all the process groups
```


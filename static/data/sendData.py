#I'm testing to see if I can send data dynamically to the flask app
# in this way, maybe we could have the app running in the background, 
# then access it through a jupyter notebook and send data when ready

import sys
import json
import requests

conv = {'input': 'hi', 'topic': 'Greeting'}
s = json.dumps(conv)
res = requests.post("http://localhost:5000/data_input/", json=s).json()
print(res['escalate'])
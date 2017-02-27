#!/usr/bin/env python
'''
Flask server for Cesium map module
Samuel Dudley
Jan 2016
'''

from config import SERVER_INTERFACE, SERVER_PORT, FLASK_SECRET_KEY, WEBSOCKET, BING_API_KEY
                
import os, sys, json, uuid

from flask import (
    Flask,
    render_template,
    request,
)

try: # try to use pkg_resources to allow for zipped python eggs
    import pkg_resources
    APP_ROOT = pkg_resources.resource_filename('MAVProxy.modules.mavproxy_cesium','app')
    APP_STATIC = pkg_resources.resource_filename('MAVProxy.modules.mavproxy_cesium.app','static')
    APP_TEMPLATES = pkg_resources.resource_filename('MAVProxy.modules.mavproxy_cesium.app','templates')
except: # otherwise fall back to the standard file system
    APP_ROOT = os.path.dirname(os.path.abspath(__file__))
    APP_STATIC = os.path.join(APP_ROOT, 'static')
    APP_TEMPLATES = os.path.join(APP_ROOT, 'templates')

app = Flask(__name__, root_path=APP_ROOT, template_folder=APP_TEMPLATES, static_folder=APP_STATIC)
app.secret_key = FLASK_SECRET_KEY


@app.route('/')
def index():
    return render_template('index.html', bing_api_key=BING_API_KEY, websocket=WEBSOCKET)

@app.route('/context/', methods=['POST'])
def get_current_context():
    markers = [str(request.values.get('markers')).lstrip('"').rstrip('"')]
    if 'null' in markers:
        markers = False
    return render_template('context_menu.html', markers=markers)
    
def start_server(debug = False):
  
    if not debug:
        import logging
        log = logging.getLogger('werkzeug')
        log.setLevel(logging.ERROR)
     
    app.run(host=SERVER_INTERFACE ,port=SERVER_PORT)
     
if __name__ == '__main__':
    start_server()
     
    
#!/usr/bin/env python
'''
Flask server for Cesium map module
Samuel Dudley
Jan 2016
'''
                             
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
app.secret_key = str(uuid.uuid4())

with open(os.path.join(APP_ROOT, 'api_keys.txt', )) as fid:    
    api_keys = json.load(fid)

@app.route('/')
def index():
    return render_template('index.html', bing_api_key=api_keys['bing'])

@app.route('/context/', methods=['POST'])
def get_current_context():
    markers = [str(request.values.get('markers')).lstrip('"').rstrip('"')]
    if 'null' in markers:
        markers = False
    return render_template('context_menu.html', markers=markers)
    
@app.route('/exit', methods=["GET"])
def exit():
    shutdown_server()
    return "web server shutting down..."
    
def shutdown_server():
    shutdown_func = request.environ.get('werkzeug.server.shutdown')
    shutdown_func()

def start_server(debug = False):
    
    if not debug:
        import logging
        log = logging.getLogger('werkzeug')
        log.setLevel(logging.ERROR)
    
    app.run(host='0.0.0.0',port=5000)
    
if __name__ == '__main__':
    start_server()
    
    
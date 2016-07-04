#!/usr/bin/env python



async_mode = 'eventlet'

import eventlet
eventlet.monkey_patch()


import time, os, binascii, datetime, subprocess, sys
from os import environ


import json
import glob
from uuid import uuid4

from flask import (
    Flask,
    session,
    redirect,
    render_template,
    request,
    url_for,
    send_from_directory,
    Response,
)

from flask_socketio import (
    SocketIO,
    emit,
    join_room,
    leave_room,
    close_room,
    rooms,
    disconnect,
)



app = Flask(__name__)
app.secret_key = str(uuid4())

APP_ROOT = os.path.dirname(os.path.abspath(__file__))
APP_STATIC = os.path.join(APP_ROOT, 'static')
with open(os.path.join(APP_ROOT, 'api_keys.txt', )) as fid:    
    api_keys = json.load(fid)

socketio = SocketIO(app, async_mode=async_mode)


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
    sys.exit()
    return "setting exit flag"
    

def start_server():

    socketio.run(app, host='0.0.0.0',port=5000)
    
    
if __name__ == '__main__':
    start_server()
    
    
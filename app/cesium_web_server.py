#!/usr/bin/env python
'''
Tornado server for Cesium map module
Samuel Dudley
Jan 2016
'''
import tornado.ioloop
import tornado.web
import tornado.websocket
import tornado.httpserver
import time, os, json, logging
import base64

from config import SERVER_INTERFACE, SERVER_PORT, FLASK_SECRET_KEY, WEBSOCKET, BING_API_KEY
                
import os, sys, json, uuid

live_web_sockets = set()

try: # try to use pkg_resources to allow for zipped python eggs
    import pkg_resources
    APP_ROOT = pkg_resources.resource_filename('MAVProxy.modules.mavproxy_cesium','app')
    APP_STATIC = pkg_resources.resource_filename('MAVProxy.modules.mavproxy_cesium.app','static')
    APP_TEMPLATES = pkg_resources.resource_filename('MAVProxy.modules.mavproxy_cesium.app','templates')
except: # otherwise fall back to the standard file system
    APP_ROOT = os.path.dirname(os.path.abspath(__file__))
    APP_STATIC = os.path.join(APP_ROOT, 'static')
    APP_TEMPLATES = os.path.join(APP_ROOT, 'templates')

class MainHandler(tornado.web.RequestHandler):
    def get(self):
        self.render("index.html", bing_api_key=BING_API_KEY, websocket=WEBSOCKET)
        
class ContextHandler(tornado.web.RequestHandler):
    def post(self):

#     markers = [str(request.values.get('markers')).lstrip('"').rstrip('"')]
#     if 'null' in markers:
        markers = False
        self.render("context_menu.html", markers=markers)

class DefaultWebSocket(tornado.websocket.WebSocketHandler):
    def initialize(self, callback):
        self.callback = callback
        
    def open(self):
        print("websocket opened!")
        self.set_nodelay(True)
        live_web_sockets.add(self)
        self.write_message('you have been connected!')
     
    def on_message(self, message):
        print("received websocket message: {0}".format(message))
        message = json.loads(message)
        self.callback(message) # this sends it to the module.send_out_queue_data for further processing.

    def on_close(self):
        print("websocket closed")

class Application(tornado.web.Application):
    def __init__(self, module):
        handlers = [
            (r"/", MainHandler),
            (r"/context/", ContextHandler),
            (r"/websocket/", DefaultWebSocket, dict(callback=module.websocket_out_callback)),
        ]
        settings = dict(
            cookie_secret=FLASK_SECRET_KEY,
            template_path=APP_TEMPLATES,
            static_path=APP_STATIC,
            xsrf_cookies=True,
        )
        super(Application, self).__init__(handlers, **settings)

def start_app(module):
    logging.getLogger("tornado").setLevel(logging.WARNING)
    application = Application(module)
    server = tornado.httpserver.HTTPServer(application)
    print(SERVER_INTERFACE, SERVER_PORT)
    server.listen(int(SERVER_PORT))
    print("Starting Tornado on port {0}".format(SERVER_INTERFACE+":"+SERVER_PORT))
    return server

def close_all_websockets():
    removable = set()
    for ws in live_web_sockets:
        removable.add(ws)
    for ws in removable:
        live_web_sockets.remove(ws)
            
def stop_tornado():
    close_all_websockets()
    ioloop = tornado.ioloop.IOLoop.current()
    ioloop.add_callback(ioloop.stop)
    print("Asked Tornado to exit")

def websocket_send_message(message):
    removable = set()
    for ws in live_web_sockets:
        if not ws.ws_connection or not ws.ws_connection.stream.socket:
            removable.add(ws)
        else:
            ws.write_message(message)
    for ws in removable:
        live_web_sockets.remove(ws)

def main(module):
    server = start_app(module=module)
    tornado.ioloop.IOLoop.current().start()
    print("Tornado finished")
    server.stop()
     
if __name__ == '__main__':
    main(module=None)
     
    
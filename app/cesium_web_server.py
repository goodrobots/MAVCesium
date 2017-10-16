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
import logging

from config import SERVER_INTERFACE, SERVER_PORT, APP_SECRET_KEY, WEBSOCKET, BING_API_KEY, APP_DEBUG, APP_PREFIX
                
import os, json, sys, select
import Queue, threading

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
        self.render("index.html", bing_api_key=BING_API_KEY, websocket=WEBSOCKET, markers=False, app_prefix = APP_PREFIX)
        
class ContextHandler(tornado.web.RequestHandler):
    def post(self):
        markers = [self.get_argument("markers", default=False, strip=True).lstrip('"').rstrip('"')]
        if 'null' in markers:
            markers = False
        self.render("context_menu.html", markers=markers)

class DefaultWebSocket(tornado.websocket.WebSocketHandler):
    def initialize(self, callback):
        self.callback = callback
    
    def check_origin(self, origin):
        return True
        
    def open(self):
        if APP_DEBUG:
            print("websocket opened!")
        self.set_nodelay(True)
        live_web_sockets.add(self)
        if APP_DEBUG:
            self.write_message('you have been connected!')
     
    def on_message(self, message):
        if APP_DEBUG:
            print("received websocket message: {0}".format(message))
        message = json.loads(message)
        if self.callback:
            self.callback(message) # this sends it to the module.send_out_queue_data for further processing.
        else:
            print("no callback for message: {0}".format(message))

    def on_close(self):
        if APP_DEBUG:
            print("websocket closed")

class Application(tornado.web.Application):
    def __init__(self, module):
        handlers = [
            (r"/"+APP_PREFIX, MainHandler),
            (r"/"+APP_PREFIX+"context/", ContextHandler),
        ]
        if module:
            cb = dict(callback=module.callback)
        else:
            cb = dict(callback=None)
        handlers.append((r"/"+APP_PREFIX+"websocket/", DefaultWebSocket, cb))

        settings = dict(
            cookie_secret = APP_SECRET_KEY,
            template_path = APP_TEMPLATES,
            static_path = APP_STATIC,
            static_url_prefix = "/"+APP_PREFIX+"static/",
            xsrf_cookies = False,
        )
        super(Application, self).__init__(handlers, **settings)

def start_app(module):
    logging.getLogger("tornado").setLevel(logging.WARNING)
    application = Application(module)
    server = tornado.httpserver.HTTPServer(application)
    server.listen(port = int(SERVER_PORT), address = str(SERVER_INTERFACE))
    if APP_DEBUG:
        print("Starting Tornado server: {0}".format(SERVER_INTERFACE+":"+SERVER_PORT+"/"+APP_PREFIX))
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
    if APP_DEBUG:
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
    if APP_DEBUG:
        print("Tornado finished")
    server.stop()
    
class Connection(object):
    def __init__(self, connection):
        self.control_connection = connection # a MAVLink connection
        self.control_link = mavutil.mavlink.MAVLink(self.control_connection)
        self.control_link.srcSystem = 11
        self.control_link.srcComponent = 220 #195
        
    def set_component(self, val):
        self.control_link.srcComponent = val
    
    def set_system(self, val):
        self.control_link.srcSystem = val
     
class module(object):
    def __init__(self, optsargs):
        (self.opts, self.args) = optsargs
        self.message_queue = Queue.Queue()
        self.pos_target = {}
        self.data_stream = ['NAV_CONTROLLER_OUTPUT', 'VFR_HUD',
                            'ATTITUDE', 'GLOBAL_POSITION_INT',
                            'SYS_STATUS', 'MISSION_CURRENT',
                            'STATUSTEXT', 'FENCE_STATUS', 'WIND']
        try:
            self.connection = Connection(mavutil.mavlink_connection(self.opts.connection))
        except Exception as err:
            print("Failed to connect to %s : %s" %(self.opts.connection,err))
            sys.exit(1)
        server_thread = threading.Thread(target=main, args = (self,))
        server_thread.daemon = True
        server_thread.start()
        self.main_loop()
    
    def callback(self, data):
        '''callback for data coming in from a websocket'''
        self.message_queue.put_nowait(data)
        
    def send_data(self, data, target = None):
        '''push json data to the browser via a websocket'''
        payload = json.dumps(data).encode('utf8')
        websocket_send_message(payload)
        # TODO: direct messages to individual websockets, e.g. new connections
    def process_connection_in(self):
        inputready,outputready,exceptready = select.select([self.connection.control_connection.port],[],[],0.01)
        # block for 0.01 sec if there is nothing on the connection
        # otherwise we just dive right in...
            
        for s in inputready:
            msg = self.connection.control_connection.recv_msg()
            if msg:
                if msg.get_type() in self.data_stream:
                    msg_dict = msg.to_dict()
                    msg_dict['timestamp'] = msg._timestamp
                    self.send_data({'mav_data':msg_dict})
                
                if msg.get_type() == 'POSITION_TARGET_GLOBAL_INT':
                    msg_dict = msg.to_dict()
                    self.pos_target['lat']= msg_dict['lat_int']
                    self.pos_target['lon'] = msg_dict['lon_int']
                    self.pos_target['alt_wgs84'] = msg_dict['alt']
                 
                    self.send_data({"pos_target_data":self.pos_target})
            
    def main_loop(self):
        self.connection.control_link.request_data_stream_send(1, 1,
                                                mavutil.mavlink.MAV_DATA_STREAM_ALL,
                                                10, 1)
        while True:
            self.process_connection_in() # any down time (max 0.01 sec) occurs here

        
        
if __name__ == '__main__':
    # we are running outside MAVProxy in stand alone mode
    from optparse import OptionParser
    
    parser = OptionParser('cesium_web_server.py [options]')
    
    parser.add_option("--connection", dest="connection", type='str',
                      help="MAVLink computer connection", default="tcp:127.0.0.1:5763")
    
    parser.add_option("--dialect", dest="dialect", help="MAVLink dialect", default="ardupilotmega")
    
    optsargs = parser.parse_args()
    (opts,args) = optsargs
    
    os.environ['MAVLINK20'] = '1' # force MAVLink v2 for the moment
    from pymavlink import mavutil
    mavutil.set_dialect(opts.dialect)
    module(optsargs)
    
    

    
     
    
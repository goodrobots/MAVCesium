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
                
import os, json, sys, select, signal, threading
try:
    import Queue as queue
except ImportError:
    import queue

lock = threading.Lock()
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
    def initialize(self, configuration, callback):
        self.configuration = configuration
        
    def get(self):
        self.render("index.html", bing_api_key=self.configuration.BING_API_KEY, websocket=self.configuration.WEBSOCKET, markers=False,
                     app_prefix = self.configuration.APP_PREFIX)
        
class ContextHandler(tornado.web.RequestHandler):
    def initialize(self, configuration, callback):
        self.configuration = configuration
        
    def post(self):
        markers = [self.get_argument("markers", default=False, strip=True).lstrip('"').rstrip('"')]
        if 'null' in markers:
            markers = False
        self.render("context_menu.html", markers=markers)

class DefaultWebSocket(tornado.websocket.WebSocketHandler):
    def initialize(self, configuration, callback):
        self.configuration = configuration
        self.callback = callback
    
    def check_origin(self, origin):
        return True
        
    def open(self):
        if self.configuration.APP_DEBUG:
            print("websocket opened!")
        self.set_nodelay(True)
        
        lock.acquire()
        live_web_sockets.add(self)
        lock.release()
     
    def on_message(self, message):
        if self.configuration.APP_DEBUG:
            print("received websocket message: {0}".format(message))
        message = json.loads(message)
        if self.callback:
            self.callback(message) # this sends it to the module.send_out_queue_data for further processing.
        else:
            print("no callback for message: {0}".format(message))
        print(dir(self))

    def on_close(self):
        if self.configuration.APP_DEBUG:
            print("websocket closed")
        del self

class Application(tornado.web.Application):
    def __init__(self, config, module_callback):
        args = dict(configuration=config, callback=module_callback)
        handlers = [
            (r"/"+config.APP_PREFIX, MainHandler, args),
            (r"/"+config.APP_PREFIX+"context/", ContextHandler, args),
            (r"/"+config.APP_PREFIX+"websocket/", DefaultWebSocket, args),
        ]

        settings = dict(
            cookie_secret = config.APP_SECRET_KEY,
            template_path = APP_TEMPLATES,
            static_path = APP_STATIC,
            static_url_prefix = "/"+config.APP_PREFIX+"static/",
            xsrf_cookies = False,
        )
        super(Application, self).__init__(handlers, **settings)

def start_app(config, module_callback):
    logging.getLogger("tornado").setLevel(logging.WARNING)
    application = Application(config, module_callback)
    server = tornado.httpserver.HTTPServer(application)
    server.listen(port = int(config.SERVER_PORT), address = str(config.SERVER_INTERFACE))
    if config.APP_DEBUG:
        print("Starting Tornado server: {0}".format(config.SERVER_INTERFACE+":"+config.SERVER_PORT+"/"+config.APP_PREFIX))
    return server

def close_all_websockets():
    removable = set()
    lock.acquire()
    for ws in live_web_sockets:
        removable.add(ws)
    for ws in removable:
        live_web_sockets.remove(ws)
    lock.release()
            
def stop_tornado(config):
    close_all_websockets()
    ioloop = tornado.ioloop.IOLoop.current()
    ioloop.add_callback(ioloop.stop)
    if config.APP_DEBUG:
        print("Asked Tornado to exit")

def websocket_send_message(message):
    removable = set()
    lock.acquire()
    for ws in live_web_sockets:
        if not ws.ws_connection or not ws.ws_connection.stream.socket:
            removable.add(ws)
        else:
            ws.write_message(message)
    lock.release()
    
    lock.acquire()
    for ws in removable:
        live_web_sockets.remove(ws)
    lock.release()

def main(config, module_callback):
    server = start_app(config=config, module_callback=module_callback)
    tornado.ioloop.IOLoop.current().start()
    if config.APP_DEBUG:
        print("Tornado finished")
    server.stop()
    
class Connection(object):
    def __init__(self, connection):
        self.control_connection = connection # a MAVLink connection
        self.control_link = self.control_connection.mav
        self.control_link.srcSystem = 11
        self.control_link.srcComponent = 220 
        
    def set_component(self, val):
        self.control_link.srcComponent = val
    
    def set_system(self, val):
        self.control_link.srcSystem = val
     
class module(object):
    def __init__(self, optsargs):
        self.exit = False
        (self.opts, self.args) = optsargs
        self.server_thread = None
        self.config = Configuration(self.opts.configuration)
        signal.signal(signal.SIGINT, self.exit_gracefully)
        signal.signal(signal.SIGTERM, self.exit_gracefully)
        self.message_queue = queue.Queue(maxsize=10) # limit queue object count to 10
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
        self.server_thread = threading.Thread(target=main, args = (self.config, self.callback,))
        self.server_thread.daemon = True
        self.server_thread.start()
        self.main_loop()
    
    def callback(self, data):
        '''callback for data coming in from a websocket'''
        try:
            self.message_queue.put_nowait(data)
        except queue.Full:
            print ('Queue full, client data is unable to be enqueued')
        
    def send_data(self, data, target = None):
        '''push json data to the browser via a websocket'''
        payload = json.dumps(data).encode('utf8')
        websocket_send_message(payload)
        # TODO: direct messages to individual websockets, e.g. new connections
        
    def drain_message_queue(self):
        '''unload data that has been placed on the message queue by the client'''
        while not self.message_queue.empty():
            try:
                data = self.message_queue.get_nowait()
            except queue.Empty:
                return
            else:
                # TODO: handle the user feedback
                pass
            
    def process_connection_in(self):
        '''receive MAVLink messages'''
        try:
            inputready,outputready,exceptready = select.select([self.connection.control_connection.port],[],[],0.1)
            # block for 0.1 sec if there is nothing on the connection
            # otherwise we just dive right in...
            for s in inputready: 
                self.connection.control_connection.recv_msg()
            # mavlink buffer is never getting cleared
            # force clear the buffer to avoid memory leak
            if self.connection.control_connection.mav.buf_len() == 0 and self.connection.control_connection.mav.buf_index != 0:
                self.connection.control_connection.mav.buf = bytearray()
                self.connection.control_connection.mav.buf_index = 0
        except select.error:
            pass
            
    def handle_msg(self, con, msg):
        '''callback for received MAVLink messages''' 
        if msg.get_type() == 'POSITION_TARGET_GLOBAL_INT':
            msg_dict = msg.to_dict()
            self.pos_target['lat']= msg_dict['lat_int']
            self.pos_target['lon'] = msg_dict['lon_int']
            self.pos_target['alt_wgs84'] = msg_dict['alt']
         
            self.send_data({"pos_target_data":self.pos_target})
            
        elif msg.get_type() in self.data_stream:
            msg_dict = msg.to_dict()
            msg_dict['timestamp'] = msg._timestamp
            self.send_data({'mav_data':msg_dict})
        else:
            # message type not handleded 
            pass
                    
    def main_loop(self):
        '''main loop of the module'''
        self.connection.control_connection.message_hooks.append(self.handle_msg)
        self.connection.control_link.request_data_stream_send(1, 1,
                                                mavutil.mavlink.MAV_DATA_STREAM_ALL,
                                                self.opts.stream_rate, 1)
        while not self.exit:
            self.process_connection_in() # any down time (max 0.1 sec) occurs here
            self.drain_message_queue()
        print('Module finished')
    
    def exit_gracefully(self, signum, frame):
        self.exit = True
        if self.server_thread:
            # attempt to shutdown the tornado server
            stop_tornado(self.config)
            self.server_thread.join(timeout=10)
        
if __name__ == '__main__':
    # we are running outside MAVProxy in stand alone mode
    from optparse import OptionParser
    from config import Configuration
    
    parser = OptionParser('cesium_web_server.py [options]')
    
    parser.add_option("--connection", dest="connection", type='str',
                      help="MAVLink computer connection", default="tcp:127.0.0.1:5763")
    parser.add_option("--dialect", dest="dialect", help="MAVLink dialect", default="ardupilotmega")
    parser.add_option("--stream-rate", dest="stream_rate", help="requested MAVLink stream rate from AP", type='int', default=10)
    parser.add_option("--configuration", dest="configuration", type='str',
                      help="path to MAVCesium configuration file", default=None)
    optsargs = parser.parse_args()
    (opts,args) = optsargs
    
    os.environ['MAVLINK20'] = '1' # force MAVLink v2 for the moment
    from pymavlink import mavutil
    mavutil.set_dialect(opts.dialect)
    module(optsargs)
    
    

    
     
    
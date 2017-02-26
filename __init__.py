'''
Cesium map module
Samuel Dudley
Jan 2016
'''
import os, json, time, sys, uuid, urllib2

from MAVProxy.modules.lib import mp_module
from MAVProxy.modules.lib import mp_settings

from pymavlink import mavutil
import threading, Queue

from autobahn.twisted.websocket import WebSocketServerProtocol, WebSocketServerFactory
from autobahn.twisted.resource import WebSocketResource, WSGIRootResource
from twisted.web.server import Site
from twisted.web.wsgi import WSGIResource
from twisted.internet import reactor

from twisted.python import log

from app import cesium_web_server # the Flask webapp

import webbrowser # open url's in browser window

class ServerProtocol(WebSocketServerProtocol):

    def onConnect(self, request):
        print("Client connecting: {0}".format(request.peer))

    def onOpen(self):
        print("WebSocket connection open")
        self.id = uuid.uuid4()
        self.factory.data[self.id]=self
        payload = {'new_connection':self.id}
        self.factory.message_queue.put(payload)

    def onMessage(self, payload, isBinary):
        if isBinary:
            # TODO: handle binary
            pass
        else:
            # It's text based (JSON)
            payload = json.loads(payload)
            self.factory.message_queue.put(payload)

    def onClose(self, wasClean, code, reason):
        print("WebSocket connection closed: {0}".format(reason))
        del self.factory.data[self.id]

        
class CesiumModule(mp_module.MPModule):

    def __init__(self, mpstate):
        super(CesiumModule, self).__init__(mpstate, "cesium", "Cesium map module", public = True)
        self.add_command('cesium', self.cmd_cesium, [""])
        
        self.data_stream = ['NAV_CONTROLLER_OUTPUT', 'VFR_HUD',
                            'ATTITUDE', 'GLOBAL_POSITION_INT',
                            'SYS_STATUS', 'MISSION_CURRENT',
                            'STATUSTEXT', 'FENCE_STATUS', 'WIND']

        
        self.wp_change_time = 0
        self.fence_change_time = 0
        self.rally_change_time = 0
        self.flightmode = None
        
        self.cesium_settings = mp_settings.MPSettings(
            [ ('openbrowser', bool, False),
              ('debug', bool, True)])
        
        self.aircraft = {'lat':None, 'lon':None, 'alt_wgs84':None,
                         'roll':None, 'pitch':None, 'yaw':None}
        self.pos_target = {'lat':None, 'lon':None, 'alt_wgs84':None}
        self.fence = {}
        self.mission = {}
        
        self.server_thread = None
        
        self.run_server()
        
        if self.cesium_settings.openbrowser:
            self.open_display_in_browser()
            
        
    def run_server(self):
#         log.startLogging(sys.stdout)
        
        # create a Twisted Web resource for our WebSocket server
        self.factory = WebSocketServerFactory(u"ws://0.0.0.0:5000")
        self.factory.protocol = ServerProtocol
        self.factory.setProtocolOptions(maxConnections=100)
        self.factory.data = {}
        self.factory.message_queue = Queue.Queue()
        wsResource = WebSocketResource(self.factory)
        
        # create a Twisted Web WSGI resource for our Flask server
        wsgiResource = WSGIResource(reactor, reactor.getThreadPool(), cesium_web_server.app)
        
        # create a root resource serving everything via WSGI/Flask, but
        # the path "/ws" served by our WebSocket stuff
        rootResource = WSGIRootResource(wsgiResource, {b'ws': wsResource})
    
        # create a Twisted Web Site and run everything
        site = Site(rootResource)
        reactor.listenTCP(5000, site, interface='0.0.0.0')
        self.server_thread = threading.Thread(target=reactor.run, args=(False,))
        self.server_thread.daemon = True
        self.server_thread.start()
        
    def stop_server(self):
        if self.server_thread is not None:
            reactor.callFromThread(reactor.stop) # Kill the server talking to the browser
            while self.server_thread.isAlive():
                time.sleep(0.01) #TODO: handle this better...
    
    def open_display_in_browser(self):
        if self.web_server_thread.isAlive():
            url = 'http://127.0.0.1:5000/'
            try:
                browser_controller = webbrowser.get('google-chrome')
                browser_controller.open_new_tab(url)
            except:
                webbrowser.open_new_tab(url)
            
            
    def send_data(self, data, target = None):
        '''push json data to the browser'''
        payload = json.dumps(data).encode('utf8')
        if target is not None:
            connection = self.factory.data[target]
            reactor.callFromThread(WebSocketServerProtocol.sendMessage, connection,  payload)
        else:   
            for connection in self.factory.data.values():
                reactor.callFromThread(WebSocketServerProtocol.sendMessage, connection,  payload)

    def cmd_cesium(self, args):
        '''cesium command parser'''
        usage = "usage: cesium <restart> <set> (CESIUMSETTING)"
        if len(args) == 0:
            print(usage)
            return
        if args[0] == "set":
            self.cesium_settings.command(args[1:])
        elif args[0] == "count":
            print('%u connected' % int(len(self.factory.data)))
        elif args[0] == "restart":
            self.restart()
        else:
            print(usage)
            
    def send_defines(self, target = None):
        '''get the current mav defines and send them'''
        miss_cmds = {}
        frame_enum = {0: "Abs", 3: "Rel", 10: "AGL"}
        
        # auto-generate the list of mission commands
        for cmd in mavutil.mavlink.enums['MAV_CMD']:
            enum = mavutil.mavlink.enums['MAV_CMD'][cmd]
            name = enum.name
            name = name.replace('MAV_CMD_','')
            if name == 'ENUM_END':
                continue
            miss_cmds[cmd] = name
        
        self.defines = {}
        self.defines['frame_enum'] = frame_enum
        self.defines['mission_commands'] = miss_cmds
        self.send_data({"defines":self.defines}, target = target)


    def send_fence(self):
        '''load and draw the fence in cesium'''
        self.fence = {}
        self.fence_points_to_send = self.mpstate.public_modules['fence'].fenceloader.points
        for point in self.fence_points_to_send:
            point_dict = point.to_dict()
            iidx = point_dict['idx']
            del point_dict['idx']
            if idx != 0: # dont include the return location
                self.fence[idx] = point_dict
        self.send_data({"fence_data":self.fence})
            
    def send_mission(self):
        '''load and draw the mission in cesium'''
        self.mission = {}
        self.mission_points_to_send = self.mpstate.public_modules['wp'].wploader.wpoints
        for point in self.mission_points_to_send:
            point_dict = point.to_dict()
            seq = point_dict['seq']
            del point_dict['seq']
            self.mission[seq] = point_dict
        self.send_data({"mission_data":self.mission})
        
    def send_flightmode(self):
        self.send_data({"flightmode":self.master.flightmode})
        self.flightmode = self.master.flightmode
        
    def restart(self):
        '''restart the web server'''
        self.stop_web_server() 
        self.run_web_server()

    def mavlink_packet(self, m):
        '''handle an incoming mavlink packet'''
        if self.master.flightmode != self.flightmode:
            self.send_flightmode()
        
        if m.get_type() == 'POSITION_TARGET_GLOBAL_INT':
            msg_dict = m.to_dict()
            self.pos_target['lat']= msg_dict['lat_int']
            self.pos_target['lon'] = msg_dict['lon_int']
            self.pos_target['alt_wgs84'] = msg_dict['alt']
             
            if None not in self.pos_target.values():
                self.send_data({"pos_target_data":self.pos_target})
        
        if m.get_type() in self.data_stream:
            msg_dict = m.to_dict()
            msg_dict['timestamp'] = m._timestamp
            self.send_data({'mav_data':msg_dict})
                   
                
        # if the waypoints have changed, redisplay
        last_wp_change = self.module('wp').wploader.last_change
        if self.wp_change_time != last_wp_change and abs(time.time() - last_wp_change) > 1:
            self.wp_change_time = last_wp_change
            self.send_mission()

            # this may have affected the landing lines from the rally points:
            self.rally_change_time = time.time()
    
        # if the fence has changed, redisplay
        if self.fence_change_time != self.module('fence').fenceloader.last_change:
            self.fence_change_time = self.module('fence').fenceloader.last_change
            self.send_fence()
                
    def idle_task(self):
        '''called on idle'''
        while not self.factory.message_queue.empty():
            payload = self.factory.message_queue.get_nowait()
            if self.cesium_settings.debug:
                print payload
                
            if 'new_connection' in payload.keys():
                self.send_defines(target=payload['new_connection'])
                self.send_fence()
                self.send_mission()
                self.send_flightmode()
            
            elif 'mode_set' in payload.keys():
                self.mpstate.functions.process_stdin('%s' % (payload['mode_set']))
            
            elif 'wp_set' in payload.keys():
                self.mpstate.functions.process_stdin('wp set %u' % int(payload['wp_set']))
            
            elif 'wp_move' in payload.keys():
                self.mpstate.functions.process_stdin('wp move %u %f %f' % (
                                                                           int(payload['wp_move']['idx']),
                                                                           float(payload['wp_move']['lat']),
                                                                           float(payload['wp_move']['lon'])
                                                                           )
                                                     )

            elif 'wp_remove' in payload.keys():
                self.mpstate.functions.process_stdin('wp remove %u' % int(payload['wp_remove']))
            
            elif 'wp_list' in payload.keys():
                self.mpstate.functions.process_stdin('wp list')
                
            elif 'fence_list' in payload.keys():
                self.mpstate.functions.process_stdin('fence list')
            
            else:
                pass
   
    def unload(self):
        '''unload module'''
        self.stop_server()
        
        
def init(mpstate):
    '''initialise module'''
    return CesiumModule(mpstate)




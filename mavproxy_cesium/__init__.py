'''
Cesium map module
Samuel Dudley
Jan 2016
'''

import subprocess, os, json, time, sys

from MAVProxy.modules.lib import mp_module
from MAVProxy.modules.lib import mp_settings

from pymavlink import mavutil
import threading, Queue

from autobahn.twisted.websocket import WebSocketServerProtocol, WebSocketServerFactory
from twisted.python import log
from twisted.internet import reactor

class ServerProtocol(WebSocketServerProtocol):

    def onConnect(self, request):
        print("Client connecting: {0}".format(request.peer))

    def onOpen(self):
        print("WebSocket connection open")
        self.factory.data = []
        self.factory.data.append(self)

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

        
class CesiumModule(mp_module.MPModule):

    def __init__(self, mpstate):
        super(CesiumModule, self).__init__(mpstate, "cesium", "Cesium map module", public = True)
        self.add_command('cesium', self.cmd_cesium, [""])
        
        self.wp_change_time = 0
        self.fence_change_time = 0
        self.rally_change_time = 0
        
        self.cesium_settings = mp_settings.MPSettings(
            [ ('localserver', bool, True),
              ('debug', bool, False)])
        
        self.aircraft = {'lat':None, 'lon':None, 'alt_wgs84':None,
                         'roll':None, 'pitch':None, 'yaw':None}
        self.pos_target = {'lat':None, 'lon':None, 'alt_wgs84':None}
        self.fence = {}
        self.mission = {}
        
        self.web_server_process = None
        self.socket_server_thread = None
        
        self.run_web_server()
        self.run_socket_server()
        
    def run_socket_server(self):
#             log.startLogging(sys.stdout)
        self.factory = WebSocketServerFactory(u"ws://127.0.0.1:9000")
        self.factory.protocol = ServerProtocol
        self.factory.setProtocolOptions(maxConnections=2)
        self.factory.data = []
        self.factory.message_queue = Queue.Queue()
        
        reactor.listenTCP(9000, self.factory)
        self.socket_server_thread = threading.Thread(target=reactor.run, args=(False,))
        self.socket_server_thread.daemon = True
        self.socket_server_thread.start()
        
    def run_web_server(self):
        '''optionally launch the webserver on the local machine'''
        if self.cesium_settings.localserver:
            path_name = os.path.dirname(__file__)
            server_path = os.path.join(path_name,'app','cesium_io_server.py')
             
            if self.cesium_settings.debug:
                self.web_server_process = subprocess.Popen(['python', server_path])
            else:
                server_fh = open(os.devnull,"w")
                self.web_server_process = subprocess.Popen(['python', server_path], stdout = server_fh, stderr = server_fh)
                server_fh.close()
        
    def send_data(self, data):
        '''push json data to the browser'''
        payload = json.dumps(data).encode('utf8')
        reactor.callFromThread(WebSocketServerProtocol.sendMessage, self.factory.data[0],  payload)

    def cmd_cesium(self, args):
        '''cesium command parser'''
        usage = "usage: cesium <restart> <set> (CESIUMSETTING)"
        if len(args) == 0:
            print(usage)
            return
        if args[0] == "set":
            self.cesium_settings.command(args[1:])

        elif args[0] == "restart":
            self.restart()
        else:
            print(usage)

    def send_fence(self):
        '''load and draw the fence in cesium'''
        self.fence = {}
        self.fence_points_to_send = self.mpstate.public_modules['fence'].fenceloader.points
        for point in self.fence_points_to_send:
            point_dict = point.to_dict()
            if point_dict['idx'] != 0: # dont include the return location
                self.fence[point_dict['idx']] = {"lat":point_dict['lat'], "lon":point_dict['lng']}
        self.send_data({"fence_data":self.fence})
            
    def send_mission(self):
        '''load and draw the mission in cesium'''
        self.mission = {}
        self.mission_points_to_send = self.mpstate.public_modules['wp'].wploader.wpoints
        for point in self.mission_points_to_send:
            point_dict = point.to_dict()
            self.mission[point_dict['seq']] = {"x":point_dict['x'], "y":point_dict['y'], "z":point_dict['z']}
        self.send_data({"mission_data":self.mission})
        
    def restart(self):
        '''restart the web server'''
        if self.socket_server_thread is not None:
            reactor.callFromThread(reactor.stop) # Kill the socket server talking to the browser
        if self.web_server_process is not None:
            self.web_server_process.kill() # Kill the web server hosting the Cesium display
            
        self.run_web_server()
        self.run_socket_server()

    def mavlink_packet(self, m):
        '''handle an incoming mavlink packet'''
        if m.get_type() == 'GLOBAL_POSITION_INT':
             
            msg_dict = m.to_dict()
            self.aircraft['lat']= msg_dict['lat']
            self.aircraft['lon'] = msg_dict['lon']
            self.aircraft['alt_wgs84'] = msg_dict['alt']
             
            if None not in self.aircraft.values():
                self.send_data({"aircraft_data":self.aircraft})
               
             
        if m.get_type() == 'ATTITUDE':
 
            msg_dict = m.to_dict()
            self.aircraft['roll']= msg_dict['roll']
            self.aircraft['pitch'] = msg_dict['pitch']
            self.aircraft['yaw'] = msg_dict['yaw']
             
            if None not in self.aircraft.values():
                self.send_data({"aircraft_data":self.aircraft})
        
        if m.get_type() == 'POSITION_TARGET_GLOBAL_INT':
            msg_dict = m.to_dict()
            self.pos_target['lat']= msg_dict['lat_int']
            self.pos_target['lon'] = msg_dict['lon_int']
            self.pos_target['alt_wgs84'] = msg_dict['alt']
             
            if None not in self.pos_target.values():
                self.send_data({"pos_target_data":self.pos_target})
                   
                
        # if the waypoints have changed, redisplay
        last_wp_change = self.module('wp').wploader.last_change
        if self.wp_change_time != last_wp_change and abs(time.time() - last_wp_change) > 1:
            self.wp_change_time = last_wp_change
            self.send_mission()

            #this may have affected the landing lines from the rally points:
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
                
            if 'wp_set' in payload.keys():
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
        if self.socket_server_thread is not None:
            reactor.callFromThread(reactor.stop)
            
        if self.web_server_process is not None:
            self.web_server_process.kill() # Kill the web server hosting the cesium display
        
        
def init(mpstate):
    '''initialise module'''
    return CesiumModule(mpstate)




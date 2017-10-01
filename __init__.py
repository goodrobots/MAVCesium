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

from app import cesium_web_server # the tornado web server

import webbrowser # open url's in browser window

from app.config import SERVER_INTERFACE, SERVER_PORT, MODULE_DEBUG, APP_DEBUG, APP_PREFIX
        
class CesiumModule(mp_module.MPModule):

    def __init__(self, mpstate, **kwargs):
        super(CesiumModule, self).__init__(mpstate, "cesium", "Cesium map module", public = True)
        self.add_command('cesium', self.cmd_cesium, [""])
        self.data_stream = ['NAV_CONTROLLER_OUTPUT', 'VFR_HUD',
                            'ATTITUDE', 'GLOBAL_POSITION_INT',
                            'SYS_STATUS', 'MISSION_CURRENT',
                            'STATUSTEXT', 'FENCE_STATUS', 'WIND']

        self.main_counter = 0
        
        self.message_queue = Queue.Queue()
        
        self.wp_change_time = 0
        self.fence_change_time = 0
        self.rally_change_time = 0
        self.flightmode = None
        
        self.cesium_settings = mp_settings.MPSettings(
            [ ('openbrowser', bool, False),
              ('debug', bool, MODULE_DEBUG)])
        
        self.aircraft = {'lat':None, 'lon':None, 'alt_wgs84':None,
                         'roll':None, 'pitch':None, 'yaw':None}
        self.pos_target = {'lat':None, 'lon':None, 'alt_wgs84':None}
        self.fence = {}
        self.mission = {}
        
        self.server_thread = None
        self.start_server()
        
        if self.cesium_settings.openbrowser:
            self.open_display_in_browser()
    
    def start_server(self):
        if self.main_counter == 0:
            self.main_counter += 1
            self.server_thread = threading.Thread(target=cesium_web_server.main, args = (self,))
            self.server_thread.daemon = True
            self.server_thread.start()
#             log.startLogging(sys.stdout)
            self.mpstate.console.writeln('MAVCesium display loaded at http://'+SERVER_INTERFACE+":"+SERVER_PORT+'/'+APP_PREFIX, fg='white', bg='blue')
        else:
            time.sleep(0.1)
        
    def stop_server(self):
        cesium_web_server.stop_tornado()
    
    def open_display_in_browser(self):
        if self.web_server_thread.isAlive():
            url = 'http://'+SERVER_INTERFACE+":"+SERVER_PORT+'/'+APP_PREFIX
            try:
                browser_controller = webbrowser.get('google-chrome')
                browser_controller.open_new_tab(url)
            except:
                webbrowser.open_new_tab(url)
                
    def callback(self, data):
        '''callback for data coming in from a websocket'''
        self.message_queue.put_nowait(data)
            
    def send_data(self, data, target = None):
        '''push json data to the browser via a websocket'''
        payload = json.dumps(data).encode('utf8')
        cesium_web_server.websocket_send_message(payload)
        # TODO: direct messages to individual websockets, e.g. new connections

    def cmd_cesium(self, args):
        '''cesium command parser'''
        usage = "usage: cesium <restart> <count> <set> (CESIUMSETTING)"
        if len(args) == 0:
            print(usage)
            return
        if args[0] == "set":
            self.cesium_settings.command(args[1:])
        elif args[0] == "count":
            print('%u connected' % int(len(cesium_web_server.live_web_sockets)))
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
            idx = point_dict['idx']
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
        self.stop_server() 
        self.start_server()

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
        while not self.message_queue.empty():
            payload = self.message_queue.get_nowait()
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
        # override the unload method
        self.stop_server() 
        
def init(mpstate, **kwargs):
    '''initialise module'''
    return CesiumModule(mpstate, **kwargs)




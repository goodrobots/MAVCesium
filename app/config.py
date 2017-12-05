""" configuration variables """

import configparser
import os
import uuid

def parse_bool(OPTION):
    if OPTION == '0':
        OPTION = False
    else:
        OPTION = True
    return OPTION

class Configuration(object):
    def __init__(self, _conf_file_path = None):
        self.success = False
        _conf = configparser.ConfigParser()
        _conf_file_paths = []
        if _conf_file_path:
            _conf_file_paths.append(_conf_file_path)
        if 'HOME' in os.environ:
            _conf_file_path = os.path.join(os.environ['HOME'], ".mavcesium.ini")
            _conf_file_paths.append(_conf_file_path)
        if 'LOCALAPPDATA' in os.environ:
            _conf_file_path = os.path.join(os.environ['LOCALAPPDATA'], "MAVProxy", "mavcesium.ini")
            _conf_file_paths.append(_conf_file_path)
            
        try: # try to use pkg_resources to allow for zipped python eggs
            import pkg_resources
            _cur_dir = pkg_resources.resource_filename('MAVProxy.modules.mavproxy_cesium','app')
        except: # otherwise fall back to the standard file system
            _cur_dir = os.path.dirname(os.path.abspath(__file__))
        
        _conf_file_paths.append(os.path.join(_cur_dir, 'mavcesium_default.ini'))
        
        for _conf_file_path in _conf_file_paths:
            if os.path.exists(_conf_file_path):
                try:
                    # load the config
                    _conf.read_file(open(_conf_file_path))
                    
                    self.APP_PREFIX = str(_conf.get('general', 'app_prefix'))
                    if self.APP_PREFIX == "''":
                        self.APP_PREFIX = ""
            
                    self.SERVER_INTERFACE = _conf.get('general', 'server_interface')
                    self.SERVER_PORT = _conf.get('general', 'server_port')
                    self.WEBSOCKET = str("ws://" + _conf.get('general', 'websocket_interface') + ":" + _conf.get('general', 'websocket_port') +
                                    "/" + self.APP_PREFIX + "websocket/")
                    
                    self.BING_API_KEY = _conf.get('api_keys', 'bing')
        
                    self.APP_SECRET_KEY = str(_conf.get('general', 'app_secret_key'))
                    if self.APP_SECRET_KEY == "''":
                        self.APP_SECRET_KEY = str(uuid.uuid4())
                    self.APP_DEBUG = parse_bool(_conf.get('debug', 'app_debug'))
                    self.MODULE_DEBUG = parse_bool(_conf.get('debug', 'module_debug'))
                    
        
                    if self.MODULE_DEBUG:
                        print ('Using config file at {}'.format( _conf_file_path ))
                    self.success = True
                    break # use first working config
                    
                
                except Exception as e:
                    print ('Failed to use config file at {} : {}'.format( _conf_file_path, e ))
                    self.success = False

# TODO: check for pass / fail and action
            
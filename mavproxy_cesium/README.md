# MAVCesium - An experimental web based map display for [MAVProxy](https://github.com/Dronecode/MAVProxy) based on [Cesium](https://github.com/AnalyticalGraphicsInc/cesium) 
[See the live online demo here](http://www.mavcesium.io/) *Note: your browser will need to support webgl*
### About the project
As a ground control station operator I oftern find myself wishing [MAVProxy](https://github.com/Dronecode/MAVProxy) had a more intutive way of displaying an air vehicle attitude and position. This project uses [Cesium](https://github.com/AnalyticalGraphicsInc/cesium) to display the position and attitude infomation being received by a [MAVProxy](https://github.com/Dronecode/MAVProxy) ground station in real time.

The project is designed to run on a local machine to maximise perfomance, however the [demo](http://www.mavcesium.io/) is dispalying the output of a [MAVProxy](https://github.com/Dronecode/MAVProxy) ground station connected to a simulated vehicle flying around [CMAC](https://www.google.com.au/maps/place/Canberra+Model+Aircraft+Club+Flying+Field/@-35.362771,149.1636837,945m/data=!3m1!1e3!4m5!3m4!1s0x6b164b893600af05:0xa5e0eae0c1fb648e!8m2!3d-35.3627754!4d149.1658777) (all running on a droplet).


![screen shot of webapp](https://github.com/SamuelDudley/cesium_deploy/blob/master/CMAC.png "screen shot of webapp")


### Development
To be clear, this project is a lump of poorly coded small experiments in python webapps and javascript. The current codebase is a nasty set of strung together blocks of code which sort of work most of the time. I will continue to update and clean up the project as I slowly work on the following features:

* Predefined air vehicle views
* Point and click mission planning
* Point and click tasking (e.g. Guided commands)
* Visualization of sensor footprints
* image / video draped over terrain
* Geofence / Airspace display
* Log playback from .tlog and .bin files
* Heads up display
* etc...

Development is being undertaken on a Ubuntu 14.04 x64 machine.

### How it works
A [MAVProxy](https://github.com/Dronecode/MAVProxy) ground station receiving telemetry
 from an air vehicle emits attitude and location information via [redis](http://redis.io/). This information is consumed by a [flask web server](http://flask.pocoo.org/) which hosts the [Cesium](https://github.com/AnalyticalGraphicsInc/cesium) application. The information is used to update a [gltf model](https://cesiumjs.org/tutorials/3D-Models-Tutorial/) in real time.

### Usage
Currently very user un-friendly. At some stage I will write some notes on how to set everything up. But here is a quick run down:
* Get a free bing maps api key from [here](https://www.bingmapsportal.com/) and replace the text in [api_keys.txt](https://github.com/SamuelDudley/MAVCesium/blob/master/app/static/api_keys.txt#L1)
* Run [cesium_io_server.py](https://github.com/SamuelDudley/cesium_deploy/blob/master/app/cesium_io_server.py) to launch the flask server
* Run [MAVProxy](https://github.com/Dronecode/MAVProxy) with the [cesium module](https://github.com/SamuelDudley/cesium_deploy/blob/master/mavproxy_cesium.py) loaded
* Point your webgl enabled browser to http://127.0.0.1:5000/ and you should see the air vehicle
* For bonus points replace the [Griffon Aerospace MQM-170 Outlaw gltf model](https://github.com/SamuelDudley/MAVCesium/blob/master/app/static/DST/rat.gltf) with something that resembles your air vehicle!

If you get it running or find it useful let me know :) Issues and pull requests welcome!

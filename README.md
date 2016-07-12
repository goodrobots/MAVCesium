# MAVCesium - An experimental web based map display for [MAVProxy](https://github.com/Dronecode/MAVProxy) based on [Cesium](https://github.com/AnalyticalGraphicsInc/cesium) 
[See the live online demo here](http://www.MAVCesium.io/) *Notes:
Your browser will need to support webgl and web sockets.
Please view on a desktop machine as the application does not currently support responsive layouts.*


### About the project
As a ground control station operator I often find myself wishing [MAVProxy](https://github.com/Dronecode/MAVProxy) had a more intuitive way of displaying an air vehicle attitude and position. This project uses [Cesium](https://github.com/AnalyticalGraphicsInc/cesium) to display the position and attitude information being received by a [MAVProxy](https://github.com/Dronecode/MAVProxy) ground station in real time.

The project is designed to run on a local machine to maximise performance, however the [demo](http://www.MAVCesium.io/) is displaying the output of a [MAVProxy](https://github.com/Dronecode/MAVProxy) ground station connected to a simulated vehicle flying around [CMAC](https://www.google.com.au/maps/place/Canberra+Model+Aircraft+Club+Flying+Field/@-35.362771,149.1636837,945m/data=!3m1!1e3!4m5!3m4!1s0x6b164b893600af05:0xa5e0eae0c1fb648e!8m2!3d-35.3627754!4d149.1658777).

### Screenshots
![screenshot 1 of webapp](https://github.com/SamuelDudley/MAVCesium/blob/gh-pages/screenshots/CMAC_HUD.png "screenshot with HUD")
![screenshot 2 of webapp](https://github.com/SamuelDudley/MAVCesium/blob/gh-pages/screenshots/CMAC_SMALL_HUD.png "screenshot with small HUD")
![screenshot 3 of webapp](https://github.com/SamuelDudley/MAVCesium/blob/gh-pages/screenshots/NO_HUD.png "screenshot with no HUD")

### Development
Currently in pre-alpha this module has been heavily re-worked to reduce dependencies and increase cross platform support. Although currently under development, this module provides a usable position and attitude display, HUD, geofence display and limited mission display capabilities.
 
On the TODO list...
* Improved mission display and planning capabilities
* Real time visualisation of sensor footprints and data feeds (video and image)
* Support for custom digital elevation maps
* Support for custom ground imagery
* Log playback from .tlog and .bin files
* Support responsive layouts
* etc...

Development is being undertaken on a Ubuntu 14.04 x64 machine and has been tested on a 16.04 x64 machine.

### How it works
When you load the MAVCesium module two servers are created by default: A [flask web server](http://flask.pocoo.org/) and a web socket server. The flask server handles static data requests while the web socket streams JSON between [MAVProxy](https://github.com/Dronecode/MAVProxy) and the webgl enabled browser, driving the display.

### Getting it running
* Install the python dependencies located in [requirements.txt](https://github.com/SamuelDudley/MAVCesium/blob/master/mavproxy_cesium/app/requirements.txt) via pip
* Either add the mavproxy_cesium directory from this repo to your PYTHON_PATH or copy and paste the mavproxy_cesium directory and its contents into your MAVProxy modules folder
* (Optional but recommended) Get a free bing maps api key from [here](https://www.bingmapsportal.com/) and insert the key in [api_keys.txt](https://github.com/SamuelDudley/MAVCesium/blob/master/app/api_keys.txt#L1)
* Run [MAVProxy](https://github.com/Dronecode/MAVProxy) and load the MAVCesium module with the `module load cesium` command in the MAVProxy console
* Point your webgl enabled browser to http://127.0.0.1:5000/ and you should see the air vehicle in the center of your screen with a HUD overlay
* For bonus points replace the [Griffon Aerospace MQM-170 Outlaw gltf model](https://github.com/SamuelDudley/MAVCesium/blob/master/mavproxy_cesium/app/static/DST/models/rat.gltf) with something that resembles your air vehicle! You can convert .dae models to .gltf using [this](https://cesiumjs.org/convertmodel.html) online tool

### Module usage
The top bar of the MAVCesium display contains similar data to the MAVProxy map. Here you will find the cursor lat, lon, alt and information on left click positions.
You can access the (currently limited) context menu via double right click, while camera controls and settings can be found in the upper right of the screen.
HUD overlay visibility can be toggled by pressing `h` when the MAVCesium display is active and can be made smaller via a button in the settings menu.

Further documentation is under construction [here](http://samueldudley.github.io/MAVCesium/)

If you get it running or find it useful let me know :) Issues and pull requests welcome!


### Credits
Some of the other projects which go into MAVCesium are:
[Cesium](https://github.com/AnalyticalGraphicsInc/cesium)
[MAVProxy](https://github.com/Dronecode/MAVProxy)
[Ardupilot](http://ardupilot.org/ardupilot/index.html)
[autobahn-python](https://github.com/crossbario/autobahn-python)
[flask](http://flask.pocoo.org/)
[jQuery](https://jquery.com/)
[Bootstrap](http://getbootstrap.com/)
[Font Awesome](http://fontawesome.io/)
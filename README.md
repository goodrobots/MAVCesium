# MAVCesium - An experimental web based map display for [MAVProxy](https://github.com/Dronecode/MAVProxy) based on [Cesium](https://github.com/AnalyticalGraphicsInc/cesium)
**[ Click here to see a live demo ](http://www.MAVCesium.io/)**

*Notes: Your browser will need to support webgl and web sockets. Please view on a desktop machine as the application does not currently support responsive layouts.*


### About the project
As a ground control station operator I often find myself wishing [MAVProxy](https://github.com/Dronecode/MAVProxy) had a more intuitive way of displaying an air vehicle attitude and position. This project uses [Cesium](https://github.com/AnalyticalGraphicsInc/cesium) to display the position and attitude information being received by a [MAVProxy](https://github.com/Dronecode/MAVProxy) ground station in real time.

The project is designed to run on a local machine to maximise performance, however the [demo](http://www.MAVCesium.io/) is displaying the output of a [MAVProxy](https://github.com/Dronecode/MAVProxy) ground station connected to a simulated vehicle flying around [CMAC](https://www.google.com.au/maps/place/Canberra+Model+Aircraft+Club+Flying+Field/@-35.362771,149.1636837,945m/data=!3m1!1e3!4m5!3m4!1s0x6b164b893600af05:0xa5e0eae0c1fb648e!8m2!3d-35.3627754!4d149.1658777).

### Screenshots
![screenshot 1 of webapp](https://github.com/SamuelDudley/MAVCesium/blob/gh-pages/screenshots/CMAC_HUD.png "screenshot with HUD")
![screenshot 2 of webapp](https://github.com/SamuelDudley/MAVCesium/blob/gh-pages/screenshots/CMAC_SMALL_HUD.png "screenshot with small HUD")
![screenshot 3 of webapp](https://github.com/SamuelDudley/MAVCesium/blob/gh-pages/screenshots/NO_HUD.png "screenshot with no HUD")

### Development
Although currently under development, this module provides a usable position and attitude display, HUD, geofence display and limited mission display capabilities.
 
On the TODO list...
* Improved mission display and planning capabilities
* Real time visualisation of sensor footprints and data feeds (video and image)
* Support for custom digital elevation maps
* Support for custom ground imagery
* Log playback from .tlog and .bin files
* Support responsive layouts
* etc...

Development is being undertaken on a Ubuntu 16.04 x64 machine and has been tested on a 14.04 x64 machine. As the (few) dependencies are pure python I expect it will install and run on a windows machine, however this is currently untested.

### How it works
When you load the MAVCesium module a single [tornado server](http://www.tornadoweb.org/en/stable/) is created. This server handles handles static data requests while also streaming JSON between [MAVProxy](https://github.com/Dronecode/MAVProxy) and your webgl enabled browser, driving the display.

The display is updated only as new data is received via the telemetry stream, so the faster the telemetry stream the 'smoother' the display update will be.

### Getting it running
*The following assumes that you have already installed the requirements for MAVProxy*

* Install the python dependencies for MAVCesium located in [requirements.txt](https://github.com/SamuelDudley/MAVCesium/blob/master/requirements.txt) via pip

* MAVCesium is avalable as a git submodule of [MAVProxy](https://github.com/Dronecode/MAVProxy). If you already have an existing [MAVProxy](https://github.com/Dronecode/MAVProxy) repository setup, you can initialise the MAVCesium module by running the following in your MAVProxy base directory:
 ```
 git submodule init
 git submodule update
 ```

 **Otherwise** if you would like to clone MAVProxy and get the MAVCesium module at the same time you can run the following command:
 ```
 git clone --recursive https://github.com/Dronecode/MAVProxy.git
 ```
 You can then install MAVProxy as per the [developer guide](http://ardupilot.github.io/MAVProxy/html/development/index.html):
 ```
 cd MAVProxy
 python setup.py build install --user
 ```
* Run [MAVProxy](https://github.com/Dronecode/MAVProxy) and load the MAVCesium module with the `module load cesium` command in the MAVProxy console
* Point your webgl enabled browser to http://127.0.0.1:5000/ and once you start receiving valid mavlink messages from the vehicle connected to the MAVProxy ground station you will see the vehicle model in the center of your screen with a HUD overlay

* If you have other computers / tablets / ipads on your network you can also open webgl capable browsers on them and point it to the network facing IP address of the computer that MAVProxy is running on.
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
[tornado](http://www.tornadoweb.org/en/stable/)
[jQuery](https://jquery.com/)
[Bootstrap](http://getbootstrap.com/)
[Font Awesome](http://fontawesome.io/)

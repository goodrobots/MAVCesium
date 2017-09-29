var display_time_milis = Date.now();

var date = new Date();
var dynamic_lighting = {value: false}
var terrain_shadows = {value: false}
var entity_shadows = {value: false}

  var clock = new Cesium.Clock({
     //startTime : Cesium.JulianDate.fromIso8601(date.toISOString()),
     currentTime : Cesium.JulianDate.fromIso8601(date.toISOString()),
     //stopTime : Cesium.JulianDate.fromIso8601("2013-12-26"),
     clockRange : Cesium.ClockRange.UNBOUNDED,//Cesium.ClockRange.LOOP_STOP,
     clockStep : Cesium.ClockStep.SYSTEM_CLOCK_MULTIPLIER
  });

  console.log(bing_api_key)
  if (bing_api_key) {
	  Cesium.BingMapsApi.defaultKey = bing_api_key;
  }
	// Construct the viewer, with a high-res terrain source pre-selected.
	var viewer = new Cesium.Viewer('cesium_container', {
		animation: false, // <-- this is the time control
	    geocoder: false,
	    homeButton: false,
	    sceneModePicker: false,
	    timeline: false,
	    navigationHelpButton: false,
	    navigationInstructionsInitiallyVisible: false,
	    fullscreenButton: false,
	    baseLayerPicker: false,
	    scene3DOnly: true,
	    shadows : entity_shadows.value,
	    terrainShadows : terrain_shadows.value,
	    clock : clock,
	    infoBox : false, //Disable InfoBox widget
	    selectionIndicator : false, //Disable selection indicator
	    terrainProvider : new Cesium.CesiumTerrainProvider({
			url : '//assets.agi.com/stk-terrain/world',
			requestVertexNormals: true
		}),
	});
	var scene = viewer.scene; //add a scene to the viewer
	var canvas = viewer.canvas; //add a canvas to the viewer
	scene.skyAtmosphere = new Cesium.SkyAtmosphere();
	scene.sun =  new Cesium.Sun();

	scene.sunBloom = true
	
//	// Get a reference to the ellipsoid, with terrain on it.  (This API may change soon)
	var ellipsoid = viewer.scene.globe.ellipsoid;

    viewer.scene.globe.enableLighting = dynamic_lighting.value;
    //Enable depth testing so things behind the terrain disappear.
    viewer.scene.globe.depthTestAgainstTerrain = true;
    
    var shadowMap = viewer.shadowMap;
    shadowMap.maxmimumDistance = 10000.0;
    shadowMap.size = 2048
    shadowMap.softShadows = true

    // position the camera roughly over Australia
    viewer.camera.setView({
        destination : Cesium.Cartesian3.fromDegrees(134.67, -26.00, 5000000)
    })
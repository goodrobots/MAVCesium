var $contextMenu = $("#contextMenu");

$(function () {
	  $('[data-toggle="tooltip"]').tooltip()
	})

    
    var position = Cesium.Cartesian3.fromDegrees(136.861933, -35.370903, -2000.0);
    var yaw = Cesium.Math.toRadians(45.0);
    var pitch = Cesium.Math.toRadians(15.0);
    var roll = Cesium.Math.toRadians(10.0);
    var orientation = Cesium.Transforms.headingPitchRollQuaternion(position, yaw, pitch, roll);
    var vehicle_offset_x = 25
    var vehicle_offset_y = 25
    var vehicle_offset_z = 25
    var vehicle_model = '/static/DST/models/rat.gltf'
    
    vehicle_offset = new Cesium.Cartesian3(vehicle_offset_x,vehicle_offset_y,vehicle_offset_z)
    viewer.entities.add({
    	id : "vehicle",
        position : position,
        orientation : orientation,
        
        model : {
        	allowPicking : false,
            uri : vehicle_model,
            minimumPixelSize : 64 //set min size
        },
        viewFrom : vehicle_offset
    });
    
    var defines = undefined
    
    var show_landing_zone = {value: false,
    						 outer: undefined,
    						 inner: undefined}

    var show_mission = {value: true}
    
    var track_vehicle = {value: true}
    
    var playback = {value: false}
    
    var god_view = {value: false,
    		init_flag: false,
    		alt: 150}
    
    var fpv_view = {value: false}
    var free_view = {value: true}
    
    var views = [god_view, fpv_view, free_view]
    var hud = {show:true}

    var aircraft = {}
    var pos_target = {lat:null, lon:null, alt_wgs84:null, color:Cesium.Color.FUSCHIA, show:true}
    var fence = {points:[], show:true, color:Cesium.Color.GREEN.withAlpha(0.2), alt_agl:500}
    var home_alt_wgs84 = undefined
    var data_stream = {}
    var flightmode = null
    
    function update_data_stream(mav_data){
    	if (mav_data.mavpackettype){
    		data_stream[mav_data.mavpackettype]=mav_data
    		if (mav_data.mavpackettype == 'ATTITUDE' || mav_data.mavpackettype == 'GLOBAL_POSITION_INT') {
    			update_aircraft_data()
    		}
    	}
    }
    
    function update_flightmode(flightmode_data){
    	flightmode = flightmode_data
    }
    
    function update_defines(defines_data) {
    	defines = defines_data
    }
    
    function update_fence_data(fence_data) {
        console.log(fence_data)
        var cssColor = '#ff0000';
        
        fence.points = []
        
        
        for (var point in fence_data){
        	if (fence_data.hasOwnProperty(point)) {
        	
        		var pointOfInterest = Cesium.Cartographic.fromDegrees(
        				fence_data[point].lng, fence_data[point].lat, 5000, new Cesium.Cartographic()
        			);
				  	// Sample the terrain (async)
				  	Cesium.sampleTerrain(viewer.terrainProvider, 11, [ pointOfInterest ]).then(function(samples) {
				  		terrain_sample_height = samples[0].height
				  	});
				  	fence.points.push(fence_data[point].lng, fence_data[point].lat, fence.alt_agl+terrain_sample_height); //[ lon, lat, alt, lon, lat, alt, etc. ]
				  
				  draw_fence()
        	}
        };
    }
    function draw_fence() {
    		viewer.entities.remove(viewer.entities.getById('fence_wall'))
    	if (fence.points.length > 9) {
    		var fence_wall = viewer.entities.add({
		    	id : "fence_wall",
		    	wall : {
		    		positions: Cesium.Cartesian3.fromDegreesArrayHeights( fence.points ),
		    		material: fence.color
		    	},
		    	show : fence.show
		     })
    	}
     };
    
    function update_mission_data(mision_data) {
 
        var cssColor = '#00ff00';
        var points = [];
        
        for (var point in mision_data){
            if (mision_data.hasOwnProperty(point)) {
            	if (point == 0){
            		// this is the home point
            		console.log('home')
            		if (mision_data[point].frame == 0){
            			home_alt_wgs84 = mision_data[point].z
            		} else {
            			console.log('Error: Home point does not have ABS alt')
            		}
            		
            	}
            	
            	if (home_alt_wgs84){ //if we could not define the home alt then don't bother...
            		create_wp(point, mision_data[point])
	            	}
				  	 
            }
        }
    };

    var terrain_sample_height

    function update_aircraft_data() {
    	if (data_stream.ATTITUDE && data_stream.GLOBAL_POSITION_INT) {
            var entity = viewer.entities.getById('vehicle');
            aircraft.lat = data_stream.GLOBAL_POSITION_INT.lat*Math.pow(10.0, -7)
            aircraft.lon = data_stream.GLOBAL_POSITION_INT.lon*Math.pow(10.0, -7)
            aircraft.alt_wgs84 = data_stream.GLOBAL_POSITION_INT.alt*Math.pow(10.0, -3)
            aircraft.roll = data_stream.ATTITUDE.roll
            aircraft.pitch = data_stream.ATTITUDE.pitch
            aircraft.yaw = data_stream.ATTITUDE.yaw
            aircraft.position = Cesium.Cartesian3.fromDegrees(aircraft.lon, aircraft.lat, aircraft.alt_wgs84);
            
	        entity.orientation = Cesium.Transforms.headingPitchRollQuaternion(
	        		aircraft.position, aircraft.yaw+Math.PI/2.0, -aircraft.pitch, -aircraft.roll);
	        entity.position = aircraft.position;
	        
	        draw_pos_target()
	        
	        if (track_vehicle.value){
	        	scene.screenSpaceCameraController.enableRotate = true;
                scene.screenSpaceCameraController.enableTranslate = false;
                scene.screenSpaceCameraController.enableZoom = true;
                scene.screenSpaceCameraController.enableTilt = true;
                scene.screenSpaceCameraController.enableLook = false;
	        	viewer.trackedEntity = entity;
	        }
	        
	        if (!track_vehicle.value){
	        	viewer.trackedEntity = undefined
	        	scene.screenSpaceCameraController.enableRotate = true;
                scene.screenSpaceCameraController.enableTranslate = true;
                scene.screenSpaceCameraController.enableZoom = true;
                scene.screenSpaceCameraController.enableTilt = true;
                scene.screenSpaceCameraController.enableLook = true;
	        }
	        
	        if (god_view.value){
	        	
	        	viewer.trackedEntity = undefined
	        	
	        	if (god_view.init_flag){ //if this is the first time the god_view has been called since pushing the button
	                // 2 Set view with heading, pitch and roll
	                viewer.camera.setView({
	                	destination : Cesium.Cartesian3.fromDegrees(aircraft.lon, aircraft.lat, aircraft.alt_wgs84+god.view_alt),
	                    orientation: {
	                        heading : 0.0,
	                        pitch : -Cesium.Math.PI_OVER_TWO,
	                        roll : 0.0               
	                    }
	                });
	                god_view.init_flag = false
	        	}
	        	
	        	// 1. Set position with a top-down view
	        	
	        	
                
	        	if (track_vehicle.value){
	        		// disable the default event handlers
	        		// zooming is handled by the custom event handle only active in 'god_view'
	        		scene.screenSpaceCameraController.enableRotate = false;
	                scene.screenSpaceCameraController.enableTranslate = false;
	                scene.screenSpaceCameraController.enableZoom = false;
	                scene.screenSpaceCameraController.enableTilt = false;
	                scene.screenSpaceCameraController.enableLook = false;
	        		
	                
	        		viewer.camera.setView({
	        			destination : Cesium.Cartesian3.fromDegrees(aircraft.lon, aircraft.lat, aircraft.alt_wgs84+god_view.alt),
                        heading : 0.0,
                        pitch : -Cesium.Math.PI_OVER_TWO,
                        roll : 0.0
                          });
	        	

	        	    
	        	}
	        	else{
	        		// disable the default event handlers but allow panning and zooming
	        		scene.screenSpaceCameraController.enableRotate = true;
	                scene.screenSpaceCameraController.enableTranslate = true;
	                scene.screenSpaceCameraController.enableZoom = true;
	                scene.screenSpaceCameraController.enableTilt = false;
	                scene.screenSpaceCameraController.enableLook = false;
	                
	        		viewer.camera.setView({
	        			position : Cesium.Cartesian3.fromDegrees(aircraft.lon, aircraft.lat, aircraft.alt_wgs84+god.view_alt),
                        heading : 0.0,
                        pitch : -Cesium.Math.PI_OVER_TWO,
                        roll : 0.0
                          });
	        		
	        	}
	        	
	        }
	        
	        if (fpv_view.value){
	        	viewer.trackedEntity = undefined
	        	// 2 Set view with heading, pitch and roll
	        	scene.screenSpaceCameraController.enableRotate = false;
                scene.screenSpaceCameraController.enableTranslate = false;
                scene.screenSpaceCameraController.enableZoom = false;
                scene.screenSpaceCameraController.enableTilt = false;
                scene.screenSpaceCameraController.enableLook = false;
                
                viewer.camera.setView({
	        	    destination : aircraft.position,
	        	    orientation: {
	        	        heading : aircraft.yaw,
	        	        pitch : aircraft.pitch,
	        	        roll : aircraft.roll
	        	    }
	        	});
	        }
    	}
	        
        
    };
    
    var pos_target_lines = scene.primitives.add(new Cesium.PolylineCollection)
    
    function update_pos_target_data(pos_target_data){
    	pos_target.lon = pos_target_data.lon*Math.pow(10.0, -7)
        pos_target.lat = pos_target_data.lat*Math.pow(10.0, -7)
        pos_target.alt_wgs84 = pos_target_data.alt_wgs84
    }
    
    function draw_pos_target(){
    	var pos_target_line = get_by_id(pos_target_lines, 'pos_target_line')
    	if (pos_target_line != null){
    		pos_target_lines.remove(pos_target_line)
    	}
    	pos_target_lines.add({
            id : 'pos_target_line',
            show : pos_target.show,
            positions : Cesium.Cartesian3.fromDegreesArrayHeights([pos_target.lon, pos_target.lat, pos_target.alt_wgs84,
                                                                   aircraft.lon, aircraft.lat, aircraft.alt_wgs84]),
            width : 1,
            material : Cesium.Material.fromType('Color', {
                color : pos_target.color
                })
        })
    		
    }

    	

    	
    
    
    function toggle_value(btn_ref, var_to_toggle) {
    	var_to_toggle.value = !var_to_toggle.value;
    }
    
    function update_button(btn_ref, var_to_toggle){
        $(btn_ref).removeClass("active")
        if (var_to_toggle.value){
            $(btn_ref).addClass("active");
        }
        else{
            $(btn_ref).removeClass("active");
        }
    }
    
    function update_view_control(var_to_toggle){
        for (idx in views){
        	console.log(views[idx])
        	if (views[idx] == var_to_toggle){
        		views[idx].value = true
        	} else{
        		views[idx].value = false
        	}
        }
    }
    
        
    
    toggle_track_vehicle = function(btn_ref, var_to_toggle) {
    	toggle_value(btn_ref, var_to_toggle)
        update_button(btn_ref, var_to_toggle)
    }
    
    
    toggle_fpv_view = function(btn_ref, var_to_toggle) {
        update_view_control(var_to_toggle)
        
    }

        
    toggle_god_view = function(btn_ref, var_to_toggle) {
        update_view_control(var_to_toggle)
            if (var_to_toggle.vale){
            	var_to_toggle.init_flag = true
                }
    }
    
    
    toggle_free_view = function(btn_ref, var_to_toggle) {
    	update_view_control(var_to_toggle)
    }
         
    
    // setup an event handler for the mouse wheel
    var wheel_handler = new Cesium.ScreenSpaceEventHandler(canvas);

    wheel_handler.setInputAction(function(event) {
    	var mousePosition = scene.camera.position;
        //var height = ellipsoid.cartesianToCartographic(mousePosition).height;
        if (god_view.value){
        	god_view.alt = god_view.alt - event
        	if (god_view.alt < 10){ // if this value goes -ve then we have zoomed in past the vehicle and can no longer see it
        		god_view.alt = 10 // limit the zoom level
        	}
        }
    }, Cesium.ScreenSpaceEventType.WHEEL);
    
    var camera_state = {
    		enableRotate : true,
    		enableTranslate : true,
    		enableZoom : true,
    		enableTilt : true,
    		enableLook : true
    		}
    
    function restore_camera(){
    	scene.screenSpaceCameraController.enableRotate = camera_state.enableRotate;
        scene.screenSpaceCameraController.enableTranslate = camera_state.enableTranslate;
        scene.screenSpaceCameraController.enableZoom = camera_state.enableZoom;
        scene.screenSpaceCameraController.enableTilt = camera_state.enableTilt;
        scene.screenSpaceCameraController.enableLook = camera_state.enableLook;
    }
    
    function store_camera(){
    	camera_state.enableRotate = scene.screenSpaceCameraController.enableRotate;
    	camera_state.enableTranslate = scene.screenSpaceCameraController.enableTranslate;
    	camera_state.enableZoom = scene.screenSpaceCameraController.enableZoom;
    	camera_state.enableTilt = scene.screenSpaceCameraController.enableTilt;
    	camera_state.enableLook = scene.screenSpaceCameraController.enableLook;
        
    }
    
    
    function get_by_id(collection, id_to_match){
        for (var i = 0; i < collection.length; i++) {
            var  obj = collection.get(i);
            if (id_to_match == obj.id) return obj
        }
        return null
    }
    
    
    function clear_selected_marker(){
    	if (selected.marker != null){
            document.getElementsByTagName("body")[0].style.cursor = "default"
            selected.marker.image = '/static/DST/wp_icons/blu-blank.png' // re-set the wp icon to be unselected...
            selected.marker = null
            selected.alt_line = null
        }
    }
    
    
 // setup an event handler for the mouse movement
    var pos_handler = new Cesium.ScreenSpaceEventHandler(canvas);
 
    var selected = {
    		marker : null,
    		alt_line : null,  // line that joins the wp to the ground (has same id as marker)
    		dragging : false,
    		camera_stored : false} // used for waypoint

    pos_handler.setInputAction(function(movement) {
    	
    	// update the mouse location text as we move on the map
    	// find intersection of ray through a pixel and the globe
    	var ray = viewer.camera.getPickRay(movement.endPosition);
    	var cartesian = scene.globe.pick(ray, scene); // TODO we need to ensure the terrain has been loaded or height will return incorrectly.

		//var cartesian = viewer.camera.pickEllipsoid(movement.endPosition, scene.globe.ellipsoid);
		//console.log('cart', cartesian)
	    if (cartesian) {
	        var cartographic = Cesium.Cartographic.fromCartesian(cartesian);
	        var longitudeString = Cesium.Math.toDegrees(cartographic.longitude).toFixed(6); // can use these values in the UI
	        var latitudeString = Cesium.Math.toDegrees(cartographic.latitude).toFixed(6);
	        var heightString = cartographic.height.toFixed(1)
	        // console.log(longitudeString, latitudeString, heightString)
	        document.getElementById('cursor_location').innerHTML = 'Cursor: '+latitudeString+' '+longitudeString+' '+heightString+'m';
	    }
    	
	        
	        
    	//console.log(selected.dragging)
    	var pickedObjects = scene.drillPick(movement.endPosition);
    	var pickedObject = undefined
    	
    	
    	
    	if (pickedObjects.length  == 1){
            pickedObject = pickedObjects[0]
        } else if (pickedObjects.length  > 1){
        	// TODO handle many objects
        }
    	
    	
    	
    	
    	if (selected.marker != null && selected.dragging) {
    		selected.marker.image= '/static/DST/wp_icons/ylw-blank.png' // make / keep the marker yellow
    		document.getElementsByTagName("body")[0].style.cursor = "url(/static/DST/pointers/move.png), pointer"
    		
    		if (!selected.camera_stored){
    			  store_camera() // store the current camera until after release
    			  selected.camera_stored = true
    			  console.log('store pre', camera_state)
    		}
    		
    		// lock the camera while dragging
    		scene.screenSpaceCameraController.enableRotate = false;
            scene.screenSpaceCameraController.enableTranslate = false;
            scene.screenSpaceCameraController.enableZoom = true;
            scene.screenSpaceCameraController.enableTilt = false;
            scene.screenSpaceCameraController.enableLook = false;
            
    		
    		// we have a wp selected an are trying to move it...
            
        	// find intersection of ray through a pixel and the globe
        	var ray = viewer.camera.getPickRay(movement.endPosition);
        	var cartesian = scene.globe.pick(ray, scene); // TODO we need to ensure the terrain has been loaded or height will return incorrectly.
        	
        	//// ----------
            
    		//var cartesian = viewer.camera.pickEllipsoid(movement.endPosition, scene.globe.ellipsoid);
    		//console.log('cart', cartesian)
    	    if (cartesian) {
    	        var cartographic = Cesium.Cartographic.fromCartesian(cartesian);
    	        var longitudeString = Cesium.Math.toDegrees(cartographic.longitude).toFixed(2); // can use these values in the UI
    	        var latitudeString = Cesium.Math.toDegrees(cartographic.latitude).toFixed(2);
    	        
    	        selected.marker.position = Cesium.Cartesian3.fromRadians(cartographic.longitude,
    	        		cartographic.latitude, cartographic.height+300);
    	        
    	        
    	        selected.alt_line.positions = Cesium.Cartesian3.fromRadiansArrayHeights( [cartographic.longitude,
                                                                             cartographic.latitude,
                                                                             cartographic.height+300,
                                                                                
                                                                             cartographic.longitude,
                                                                             cartographic.latitude,
                                                                             cartographic.height])
    	    }
    		return // get out of the mouse movement function here if we are dragging and have a wp selected
    		
    	}
    	
    	if (selected.marker != null && $contextMenu.css('display') != 'none' ){
    		return
    	}
    	if (selected.marker == null){
    		clear_selected_marker()
    		
    	}
    	
    	// we only get here if we are not currently dragging a wp
        if (Cesium.defined(pickedObject)) {
        	
        	if (selected.marker != null && (selected.marker.id != pickedObject.id)){ // only allow one wp to be selected at any given time
        		clear_selected_marker()
        	}
        	
        	selected.marker = get_by_id(markers, pickedObject.id) // will set marker to instance or null
        	
        	if (selected.marker != null && !selected.dragging){ // this is the only point where we select the wp
        		// we dont select if we are dragging otherwise we can move wp's accidentally when panning the camera...
        		document.getElementsByTagName("body")[0].style.cursor = "pointer" // change the pointer to a hand
        		selected.marker.image= '/static/DST/wp_icons/ylw-blank.png'
        		selected.alt_line = get_by_id(alt_lines, selected.marker.id) // 
        	} else { // we have not picked a wp
        		clear_selected_marker()
        	}
        
        } else{ // not Cesium.defined(pickedObject)
        	clear_selected_marker()
        } 
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    
    
    // handle left down with wp selected
    var wp_handler_down = new Cesium.ScreenSpaceEventHandler(canvas);
    // hold last click location
    var last_click = undefined
    
    wp_handler_down.setInputAction(function(event){
    	$contextMenu.hide(); // if a context menu is up then hide it!
    	console.log($contextMenu)
        console.log(event.position)
        selected.dragging = true
        if (selected.marker != null) {
            console.log('dragging', selected.marker)
        }
    	
    	var ray = viewer.camera.getPickRay(event.position);
    	var intersection = scene.globe.pick(ray, scene); // TODO we need to ensure the terrain has been loaded or height will return incorrectly.
    	
    	
    	
    	if (intersection) {
    		var ray_cartographic = Cesium.Cartographic.fromCartesian(intersection)
	        var longitudeString = Cesium.Math.toDegrees(ray_cartographic.longitude).toFixed(6); // can use these values in the UI
	        var latitudeString = Cesium.Math.toDegrees(ray_cartographic.latitude).toFixed(6);
	        var heightString = ray_cartographic.height.toFixed(1)
	        
	        //update the UI click text
	        document.getElementById('cursor_click').innerHTML = 'Click: '+latitudeString+' '+longitudeString+' '+heightString+'m';
	        if (last_click) {
	        	var geo_sep = new Cesium.EllipsoidGeodesic(last_click, ray_cartographic)
	        	document.getElementById('cursor_click').innerHTML += ' Distance: '+geo_sep.surfaceDistance.toFixed(1)+'m Bearing: '+ Cesium.Math.toDegrees(Cesium.Math.zeroToTwoPi(geo_sep.startHeading)).toFixed(1);
	        }
	        last_click = ray_cartographic
    	}
    
    }, Cesium.ScreenSpaceEventType.LEFT_DOWN);
    
    
    var wp_handler_add = new Cesium.ScreenSpaceEventHandler(canvas);
    
    wp_handler_add.setInputAction(function(event){
    	
    	/// ------------
    	// find intersection of ray through a pixel and the globe
    	var ray = viewer.camera.getPickRay(event.position);
    	var intersection = scene.globe.pick(ray, scene); // TODO we need to ensure the terrain has been loaded or height will return incorrectly.
    	console.log('ray_pick')
    	console.log(intersection)
    	if (intersection) {
    		var ray_cartographic = Cesium.Cartographic.fromCartesian(intersection)
    		console.log(Cesium.Math.toDegrees(ray_cartographic.latitude), Cesium.Math.toDegrees(ray_cartographic.longitude), ray_cartographic.height)
    	//// ----------
    	
//	    TODO: handle wp types and ref frames...
            create_wp(Cesium.Math.toDegrees(ray_cartographic.latitude), Cesium.Math.toDegrees(ray_cartographic.longitude), ray_cartographic.height+300)
    	}
    
    }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
    
    
    // handle left up with wp selected
    var wp_handler_up = new Cesium.ScreenSpaceEventHandler(canvas);
    
    wp_handler_up.setInputAction(function(event){
    	if (selected.marker != null && selected.dragging) {
    		// report that the wp has finished being moved
    		release_location = Cesium.Cartographic.fromCartesian(selected.marker.position)
    		console.log(selected.marker.id, Cesium.Math.toDegrees(release_location.longitude), Cesium.Math.toDegrees(release_location.latitude))
    		send(JSON.stringify({'wp_move': {'idx':selected.marker.id, 'lat':Cesium.Math.toDegrees(release_location.latitude), 'lon':Cesium.Math.toDegrees(release_location.longitude)}}));   		
    	}
    	
    	selected.dragging = false
    	restore_camera() // un freeze the camera 
    	selected.camera_store = false // the click has ended so release the camera
    	
    	clear_selected_marker()
    	
    	console.log('restore', camera_state)
    }, Cesium.ScreenSpaceEventType.LEFT_UP);

    

$('#cesium_container').mouseup(function (evt) {
	  if (evt.which === 3) { // right-click
	    /* if you wanted to be less strict about what
	       counts as a double click you could use
	       evt.originalEvent.detail > 1 instead */
	    if (evt.originalEvent.detail === 2 && selected.marker != null) { 
	      console.log('Double right-click on marker');
	      $.post("/context/", {markers: JSON.stringify(selected.marker.id)}, function(data){
	    	  $('#contextMenu').html(data);
	    	  console.log(data)
	      })
	      $contextMenu.css({
	          display: "block",
	          left: evt.pageX,
	          top: evt.pageY
	       });
	    
	    } else if (evt.originalEvent.detail === 2) { 
            console.log('Double right-click NOT on marker');
            $.post("/context/", {markers: JSON.stringify(null)} , function(data){
            	$('#contextMenu').html(data);
            	console.log(data)
            })
            
            $contextMenu.css({
                display: "block",
                left: evt.pageX,
                top: evt.pageY
            });
	    
	    } else if (evt.originalEvent.detail === 1) { 
	    	console.log('Single right-click');
	    }
	  }
	});

document.onkeypress = function(evt) {
    evt = evt || window.event;
    var charCode = evt.which || evt.keyCode;
    var charStr = String.fromCharCode(charCode);
    if (charStr == "-") {
    	console.log('zoom -')
    	viewer.camera.zoomOut(500)
    } else if (charStr == "+") {
    	viewer.camera.zoomIn(500)
    	console.log('zoom +')
    } else if (charStr == "h") {
    	hud.show = !hud.show
    } else {
    	//do nothing
    }
};
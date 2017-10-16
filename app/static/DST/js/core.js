var $contextMenu = $("#contextMenu");

$(function () { // init tool tips and only show on hover
	$('[data-toggle="tooltip"]').tooltip({
		trigger : 'hover'
	})
})

    var vehicle_offset_x = 25
    var vehicle_offset_y = 25
    var vehicle_offset_z = 25
    var vehicle_model = '/'+app_prefix+'static/DST/models/rat.gltf'
    
    var position = Cesium.Cartesian3.fromDegrees(0, 0, 0);
    var heading = 0;
    var pitch = 0;
    var roll = 0;
    var hpr = new Cesium.HeadingPitchRoll(heading, pitch, roll);
    var orientation = Cesium.Transforms.headingPitchRollQuaternion(position, hpr);
    	
    	
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
    
    var show_sensor_footprint = {value: false}
    
    var top_view = {value: true,
    		init_flag: false,
    		alt: 1000}
    
    var forward_view = {value: false}
    var free_view = {value: false}
    var mount_view = {value: false}
    
    var default_camera_settings = {
    		fov: viewer.camera.frustum.fov,
    		aspect_ratio: viewer.camera.frustum.aspectRatio
    }
    
    var mount_camera_settings = {
    		fov: 122.6,
    		aspect_ratio: 122.6/94.4,
    		yaw: 0,
    		pitch: -90.,
    		roll: 0
    }
    
    var views = [top_view, forward_view, free_view, mount_view];
    var hud = {show:true};

    var aircraft = {};
    var pos_target = {lat:null, lon:null, alt_wgs84:null, show:true, color:Cesium.Color.FUCHSIA};
    var fence = {points:[], show:true, alt_agl:500, color:Cesium.Color.GREEN};
    var home_alt_wgs84 = undefined;
    var data_stream = {};
    var flightmode = null;
    
    var terrain_sample_height;
    
    var pos_target_lines = scene.primitives.add(new Cesium.PolylineCollection);
    var sensor_lines = scene.primitives.add(new Cesium.PolylineCollection);
    var sensor_footprint = undefined;
    
    function update_data_stream(mav_data){
    	if (mav_data.mavpackettype){
    		data_stream[mav_data.mavpackettype] = mav_data;
    		if (mav_data.mavpackettype == 'ATTITUDE' || mav_data.mavpackettype == 'GLOBAL_POSITION_INT') {
    			update_aircraft_data();
    		}
    	}
    }
    
    function update_flightmode(flightmode_data){
    	flightmode = flightmode_data;
    }
    
    function update_defines(defines_data) {
    	defines = defines_data;
    }
    
    function update_fence_data(fence_data) {
        console.log(fence_data)
        
        fence.points = [];
        
        
        for (var point in fence_data){
        	if (fence_data.hasOwnProperty(point)) {
        	
        		var pointOfInterest = Cesium.Cartographic.fromDegrees(
        				fence_data[point].lng, fence_data[point].lat, 5000, new Cesium.Cartographic()
        			);
				  	// Sample the terrain (async)
				  	Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, [ pointOfInterest ]).then(function(samples) {
				  		terrain_sample_height = samples[0].height
				  	});
				  	fence.points.push(fence_data[point].lng, fence_data[point].lat, fence.alt_agl+terrain_sample_height); //[ lon, lat, alt, lon, lat, alt, etc. ]
				  
				  draw_fence();
        	}
        };
    }
    function draw_fence() {
    		viewer.entities.remove(viewer.entities.getById('fence_wall'))
    	if (fence.points.length > 9) {
    		var fence_wall = viewer.entities.add({
		    	id : "fence_wall",
		    	wall : {
		    		positions: Cesium.Cartesian3.fromDegreesArrayHeights( fence.points )
		    	},
		    	show : fence.show
		     })
    	}
     };
    
    function update_mission_data(mision_data) {
 
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

    

    function update_aircraft_data() {
    	if (data_stream.ATTITUDE && data_stream.GLOBAL_POSITION_INT) {
            var entity = viewer.entities.getById('vehicle');
            
            aircraft.lat = data_stream.GLOBAL_POSITION_INT.lat*Math.pow(10.0, -7);
            aircraft.lon = data_stream.GLOBAL_POSITION_INT.lon*Math.pow(10.0, -7);
            aircraft.alt_wgs84 = data_stream.GLOBAL_POSITION_INT.alt*Math.pow(10.0, -3);
            aircraft.roll = data_stream.ATTITUDE.roll
            aircraft.pitch = data_stream.ATTITUDE.pitch
            aircraft.yaw = data_stream.ATTITUDE.yaw
            
            aircraft.position = Cesium.Cartesian3.fromDegrees(aircraft.lon, aircraft.lat, aircraft.alt_wgs84);
		    aircraft.hpr = new Cesium.HeadingPitchRoll(aircraft.yaw+Math.PI/2, -aircraft.pitch, -aircraft.roll);
		    aircraft.orientation = Cesium.Transforms.headingPitchRollQuaternion(aircraft.position, aircraft.hpr);
		    
		    entity.position = aircraft.position;
		    entity.orientation = aircraft.orientation;
	        
	        draw_pos_target();
	        
	        draw_sensor_bounds();
	        
	        if (top_view.value){
	        	
	        	viewer.trackedEntity = undefined;
	        	
	        	if (top_view.init_flag){ //if this is the first time the top_view has been called since pushing the button
	                // 2 Set view with heading, pitch and roll
	                viewer.camera.setView({
	                	destination : Cesium.Cartesian3.fromDegrees(aircraft.lon, aircraft.lat, aircraft.alt_wgs84+top.view_alt),
	                    orientation: {
	                        heading : 0.0,
	                        pitch : -Cesium.Math.PI_OVER_TWO,
	                        roll : 0.0               
	                    }
	                });
	                top_view.init_flag = false
	        	}
	        	
	        	// 1. Set position with a top-down view
	        	
	        	
                
	        	if (track_vehicle.value){
	        		// disable the default event handlers
	        		// zooming is handled by the custom event handle only active in 'top_view'
	        		scene.screenSpaceCameraController.enableRotate = false;
	                scene.screenSpaceCameraController.enableTranslate = false;
	                scene.screenSpaceCameraController.enableZoom = false;
	                scene.screenSpaceCameraController.enableTilt = false;
	                scene.screenSpaceCameraController.enableLook = false;
	        		
	                
	        		viewer.camera.setView({
	        			destination : Cesium.Cartesian3.fromDegrees(aircraft.lon, aircraft.lat, aircraft.alt_wgs84+top_view.alt),
                        heading : 0.0,
                        pitch : -Cesium.Math.PI_OVER_TWO,
                        roll : 0.0
                          });
	        		
	        	} else {
	        		// disable the default event handlers but allow panning and zooming
	        		scene.screenSpaceCameraController.enableRotate = true;
	                scene.screenSpaceCameraController.enableTranslate = true;
	                scene.screenSpaceCameraController.enableZoom = true;
	                scene.screenSpaceCameraController.enableTilt = false;
	                scene.screenSpaceCameraController.enableLook = false;
	                
	        		viewer.camera.setView({
	        			position : Cesium.Cartesian3.fromDegrees(aircraft.lon, aircraft.lat, aircraft.alt_wgs84+top.view_alt),
                        heading : 0.0,
                        pitch : -Cesium.Math.PI_OVER_TWO,
                        roll : 0.0
                          });
	        		
	        	}
	        	
	        	viewer.camera.frustum.fov = default_camera_settings.fov; // this works
                viewer.camera.frustum.aspectRatio = default_camera_settings.aspect_ratio; // this works
	        	
	        } else if (forward_view.value) {
	        	viewer.trackedEntity = undefined
	        	// 2 Set view with heading, pitch and roll of aircraft
	        	scene.screenSpaceCameraController.enableRotate = false;
                scene.screenSpaceCameraController.enableTranslate = false;
                scene.screenSpaceCameraController.enableZoom = false;
                scene.screenSpaceCameraController.enableTilt = false;
                scene.screenSpaceCameraController.enableLook = false;
                
                viewer.camera.frustum.fov = default_camera_settings.fov; // this works
                viewer.camera.frustum.aspectRatio = default_camera_settings.aspect_ratio; // this works
                
                viewer.camera.setView({
	        	    destination : aircraft.position,
	        	    orientation: {
	        	        heading : aircraft.yaw,
	        	        pitch : aircraft.pitch,
	        	        roll : aircraft.roll
	        	    }
	        	});
	        } else if (mount_view.value){
	        	viewer.trackedEntity = undefined
	        	// 3 Set view with heading, pitch and roll of mount (attached to aircraft)
	        	scene.screenSpaceCameraController.enableRotate = false;
                scene.screenSpaceCameraController.enableTranslate = false;
                scene.screenSpaceCameraController.enableZoom = false;
                scene.screenSpaceCameraController.enableTilt = false;
                scene.screenSpaceCameraController.enableLook = false;
                
                
            	var hpr = new Cesium.HeadingPitchRoll(aircraft.yaw-Math.PI/2, aircraft.pitch, aircraft.roll);
            	
            	var hpr_mount = new Cesium.HeadingPitchRoll(0, -Math.PI/2, 0); // this is the actual mount offset
            	
            	var vehicleQuat = new Cesium.Quaternion
            	var mountQuat = new Cesium.Quaternion
            	var vehiclePos = aircraft.position
            	vehicleQuat = Cesium.Transforms.headingPitchRollQuaternion(vehiclePos, hpr)
            	mountQuat = Cesium.Quaternion.fromHeadingPitchRoll(hpr_mount)
            	Cesium.Quaternion.multiply(vehicleQuat, mountQuat, vehicleQuat)
            	var camRot = Cesium.Matrix3.fromQuaternion(vehicleQuat);            	

				var lookDir = new Cesium.Cartesian3(1, 0, 0);
				
				var upDir = new Cesium.Cartesian3(0.0, 0, 1);
                
                // transform look dir to globe frame
                Cesium.Matrix3.multiplyByVector(camRot, lookDir, lookDir);
                Cesium.Matrix3.multiplyByVector(camRot, upDir, upDir);

                viewer.camera.frustum.fov = Cesium.Math.toRadians(mount_camera_settings.fov); // this works
                viewer.camera.frustum.aspectRatio = mount_camera_settings.aspect_ratio; // this works
                console.log(Cesium.Math.toDegrees(viewer.camera.frustum.fov), Cesium.Math.toDegrees(viewer.camera.frustum.fovy));
                
                viewer.camera.setView({
	        	    destination : aircraft.position,
	        	    orientation : {
				        direction : lookDir,
				        up : upDir
	        	    }
	        	});
	        } else { // free_view
	        	
		        if (track_vehicle.value){
		        	scene.screenSpaceCameraController.enableRotate = true;
	                scene.screenSpaceCameraController.enableTranslate = false;
	                scene.screenSpaceCameraController.enableZoom = true;
	                scene.screenSpaceCameraController.enableTilt = true;
	                scene.screenSpaceCameraController.enableLook = false;
		        	viewer.trackedEntity = entity;
		        } else {
		        	viewer.trackedEntity = undefined
		        	scene.screenSpaceCameraController.enableRotate = true;
	                scene.screenSpaceCameraController.enableTranslate = true;
	                scene.screenSpaceCameraController.enableZoom = true;
	                scene.screenSpaceCameraController.enableTilt = true;
	                scene.screenSpaceCameraController.enableLook = true;
		        }
		        
		        viewer.camera.frustum.fov = default_camera_settings.fov; // this works
                viewer.camera.frustum.aspectRatio = default_camera_settings.aspect_ratio; // this works
	        }
    	} 
    };
    

    
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
    
    function draw_sensor_bounds(){
    	
    	var hpr = new Cesium.HeadingPitchRoll(aircraft.yaw-Math.PI/2, aircraft.pitch, aircraft.roll);
    	
    	var hpr_mount1 = new Cesium.HeadingPitchRoll(0, -Math.PI/2, 0); // rotation to correct axis to image
    	var hpr_mount2 = new Cesium.HeadingPitchRoll(0, 0, -Math.PI/2);
    	
    	var hpr_mount3 = new Cesium.HeadingPitchRoll(0, -Math.PI/2, 0); // this is the actual mount offset
    	
    	var vehicleQuat = new Cesium.Quaternion
    	var mountQuat = new Cesium.Quaternion
    	var mountQuat1 = new Cesium.Quaternion
    	var mountQuat2 = new Cesium.Quaternion
    	var mountQuat3 = new Cesium.Quaternion
    	var vehiclePos = aircraft.position
    	vehicleQuat = Cesium.Transforms.headingPitchRollQuaternion(vehiclePos, hpr)
    	mountQuat1 = Cesium.Quaternion.fromHeadingPitchRoll(hpr_mount1)
    	mountQuat2 = Cesium.Quaternion.fromHeadingPitchRoll(hpr_mount2)
    	mountQuat3 = Cesium.Quaternion.fromHeadingPitchRoll(hpr_mount3)
    	Cesium.Quaternion.multiply(mountQuat2, mountQuat1, mountQuat)
    	Cesium.Quaternion.multiply(mountQuat3, mountQuat, mountQuat)
    	Cesium.Quaternion.multiply(vehicleQuat, mountQuat, vehicleQuat)
    	var camRot = Cesium.Matrix3.fromQuaternion(vehicleQuat);  	

    	var camPos = aircraft.position

    	var camProj = new Cesium.Matrix3(1/1.8,  0.0,  0.5,
    								     0.0,  (122.6/94.4)/1.8,  0.5,
    								     0.0,  0.0,  1);
    	
    	var camDistR = new Cesium.Cartesian3(-2.60e-01, 8.02e-02, 0.0); // not used yet
    	var camDistT = new Cesium.Cartesian2(-2.42e-04, 2.61e-04); // not used yet
    	
        // compute ground footprint on ellipsoid
        var coords = [];
        var lookDir = new Cesium.Cartesian3();
        var invCamProj = Cesium.Matrix3.inverse(camProj, new Cesium.Matrix3());

        for (var i = 0; i < 4; i++) {

            var corner;
            if (i === 0) {
                //corner = new Cartesian3(0.0, 0.0, 1.0);
                corner = new Cesium.Cartesian3(-0.5, -0.5, 1.0);
            }
            else if (i === 1) {
                //corner = new Cartesian3(1.0, 0.0, 1.0);
                corner = new Cesium.Cartesian3(1.5, -0.5, 1.0);
            }
            else if (i === 2) {
                //corner = new Cartesian3(1.0, 1.0, 1.0);
                corner = new Cesium.Cartesian3(1.5, 1.5, 1.0);
            }
            else if (i === 3) {
                //corner = new Cartesian3(0.0, 1.0, 1.0);
                corner = new Cesium.Cartesian3(-0.5, 1.5, 1.0);
            }

            // transform normalized coordinates to look direction in camera frame
            Cesium.Matrix3.multiplyByVector(invCamProj, corner, lookDir);

            // transform look dir to globe frame
            Cesium.Matrix3.multiplyByVector(camRot, lookDir, lookDir);

            // intersect ray
            var ground;
            var ray = new Cesium.Ray(camPos, lookDir);
            // var intersects = Cesium.IntersectionTests.rayEllipsoid(ray, Cesium.Ellipsoid.WGS84);
            var intersects = scene.globe.pick(ray, scene);
            if (intersects == null) {
//               ground = IntersectionTests.grazingAltitudeLocation(ray, Cesium.Ellipsoid.WGS84);
               ground = Cesium.Ray.getPoint(ray, 4000.0);
            }
            else { 
//               ground = Cesium.Ray.getPoint(ray, intersects.start); // only valid if Cesium.IntersectionTests.rayEllipsoid(ray, Cesium.Ellipsoid.WGS84); is used
            	ground = intersects;
            }
            coords[i] = ground;
            
        }
        
        var sensor_line = get_by_id(sensor_lines, 'sensor_line')
    	if (sensor_line != null){
    		sensor_lines.remove(sensor_line)
    	}
        
        if (sensor_footprint) {
        	viewer.scene.primitives.remove(sensor_footprint)
	    	sensor_footprint = undefined
        }
        
        if (show_sensor_footprint.value){
        	
       
    	
	    	if (coords) {
		    	sensor_lines.add({
		            id : 'sensor_line',
		            show : pos_target.show,
		            positions : [aircraft.position, coords[0], aircraft.position, coords[1], aircraft.position, coords[2], aircraft.position, coords[3], aircraft.position],
		            width : 2,
		            material : Cesium.Material.fromType('Color', {
		                color : Cesium.Color.SNOW
		            })
		        })
	
		        var sensor_footprint_geom = new Cesium.GeometryInstance({
		            id: 'sensor_footprint',
		            geometry: new Cesium.PolygonGeometry({
		                polygonHierarchy: {
		                    positions: [coords[0], coords[1], coords[2], coords[3]]
		                }
		            }),
		            attributes: {
		                color: Cesium.ColorGeometryInstanceAttribute.fromColor(new Cesium.Color(1.0, 0.0, 0.0, 0.4))
		            }
		        });
		    	
	
		        sensor_footprint = new Cesium.GroundPrimitive({geometryInstances : [sensor_footprint_geom],
		        											   allowPicking : false,
		        											   asynchronous : false
		        											  });
		    	scene.primitives.add(sensor_footprint)
	    	 }
    	}
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
    
    
    toggle_forward_view = function(btn_ref, var_to_toggle) {
        update_view_control(var_to_toggle)
        
    }

        
    toggle_top_view = function(btn_ref, var_to_toggle) {
        update_view_control(var_to_toggle)
            if (var_to_toggle.vale){
            	var_to_toggle.init_flag = true
                }
    }
    
    
    toggle_free_view = function(btn_ref, var_to_toggle) {
    	update_view_control(var_to_toggle)
    }
    
    toggle_mount_view = function(btn_ref, var_to_toggle) {
    	update_view_control(var_to_toggle)
    }
         
    
    // setup an event handler for the mouse wheel
    var wheel_handler = new Cesium.ScreenSpaceEventHandler(canvas);

    wheel_handler.setInputAction(function(event) {
    	var mousePosition = scene.camera.position;
        //var height = ellipsoid.cartesianToCartographic(mousePosition).height;
        if (top_view.value){
        	top_view.alt = top_view.alt - event
        	if (top_view.alt < 10){ // if this value goes -ve then we have zoomed in past the vehicle and can no longer see it
        		top_view.alt = 10 // limit the zoom level
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
            selected.marker.image = '/'+app_prefix+'static/DST/wp_icons/blu-blank.png' // re-set the wp icon to be unselected...
            selected.marker = null
            selected.alt_line = null
        }
    }
    
    
 // setup an event handler for the mouse movement
    var pos_handler = new Cesium.ScreenSpaceEventHandler(canvas);
 
    var selected = {
    		marker : null,
    		alt_line : null,  // line that joins the wp to the ground (has same id as marker)
    		label : null, // wp label (has same id as marker)
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
	        document.getElementById('cursor_location').innerHTML = 'Cursor: <small>'+latitudeString+' '+longitudeString+' '+heightString+'m</small>&nbsp';
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
    		selected.marker.image= '/'+app_prefix+'static/DST/wp_icons/ylw-blank.png' // make / keep the marker yellow
    		document.getElementsByTagName("body")[0].style.cursor = "url('/'+app_prefix+'static/DST/pointers/move.png), pointer"
    		
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
                                                                             cartographic.height]);
    	        
    	        selected.label.position = Cesium.Cartesian3.fromRadians(cartographic.longitude,
    	        		cartographic.latitude, cartographic.height+300);
                                                                           
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
        		selected.marker.image= '/'+app_prefix+'static/DST/wp_icons/ylw-blank.png'
        		selected.alt_line = get_by_id(alt_lines, selected.marker.id) //
        		selected.label = get_by_id(labels, selected.marker.id)
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
	        document.getElementById('cursor_click').innerHTML = 'Click: <small>'+latitudeString+' '+longitudeString+' '+heightString+'m</small>&nbsp';
	        if (last_click) {
	        	var geo_sep = new Cesium.EllipsoidGeodesic(last_click, ray_cartographic)
	        	document.getElementById('click_distance').innerHTML = '<small>(Distance: '+geo_sep.surfaceDistance.toFixed(1)+'m Bearing: '+ Cesium.Math.toDegrees(Cesium.Math.zeroToTwoPi(geo_sep.startHeading)).toFixed(1)+')</small>';
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
    
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    
    
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


var right_data = {x:undefined, y:undefined}

$('#cesium_container').mousedown(function (evt) {
	console.log('mouse down', evt)
	if (evt.which === 3) { // right-click
		right_data.x = evt.screenX;
		right_data.y = evt.screenY;
	}
});
    
var right_click_handler = new Cesium.ScreenSpaceEventHandler(canvas);
right_click_handler.setInputAction(function(event){

	if (selected.marker != null) {
		console.log('Single right-click on marker');
		$.post("/" + app_prefix + "context/", {markers: JSON.stringify(selected.marker.id)}, function(data){
			$('#contextMenu').html(data);
			console.log(data)
		})
	} else { 
		console.log('Single right-click NOT on marker');
			$.post("/" + app_prefix + "context/", {markers: JSON.stringify(null)} , function(data){
			$('#contextMenu').html(data);
			console.log(data)
		})
	}
	$contextMenu.css({
		display: "block",
		left: event.position.x,
		top: event.position.y
	});
}, Cesium.ScreenSpaceEventType.RIGHT_CLICK);

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
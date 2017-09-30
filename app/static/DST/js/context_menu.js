$contextMenu.on("click", "a", function(evt) {
	console.log(evt)
	evt.preventDefault();
    console.log(evt.target.innerText)
    console.log(evt.target.href)
    console.log(evt.target.id)
    $contextMenu.hide();
    
    if (evt.target.innerText === 'Remove'){
    	// we wish to remove the WP
    	send(JSON.stringify({wp_remove: evt.target.id}));
    	//destroy_wp(evt.target.id)
    }

    if (evt.target.innerText === 'Set'){
    	// we wish ts set this as the current WP   	
    	send(JSON.stringify({wp_set: evt.target.id}));
    }
    if (evt.target.innerText === 'Show Landing Zone'){
    	show_landing_zone.value = !show_landing_zone.value
    	if (show_landing_zone.value){
		    var landing_zone_outer = new Cesium.GeometryInstance({
		        geometry : new Cesium.CircleGeometry({
		            center : Cesium.Cartesian3.fromDegrees(Cesium.Math.toDegrees(last_click.longitude), Cesium.Math.toDegrees(last_click.latitude)),
		            radius : 80.0
		        }),
		        id : 'landing_zone_outer',
		        attributes : {
		            color : new Cesium.ColorGeometryInstanceAttribute(0.0, 0.0, 1.0, 0.2)
		        }
		    });
		    
		    var landing_zone_inner = new Cesium.GeometryInstance({
		    	geometry : new Cesium.CircleGeometry({
		    		center : Cesium.Cartesian3.fromDegrees(Cesium.Math.toDegrees(last_click.longitude), Cesium.Math.toDegrees(last_click.latitude)),
		    		radius : 30.0
			    	}),
		        id : 'landing_zone_inner',
		        attributes : {
		            color : new Cesium.ColorGeometryInstanceAttribute(1.0, 0.0, 0.0, 0.3)
		        }
		    });
		    
		    show_landing_zone.outer = new Cesium.GroundPrimitive({geometryInstances : [landing_zone_outer]});
		    show_landing_zone.inner = new Cesium.GroundPrimitive({geometryInstances : [landing_zone_inner]});
		    scene.primitives.add(show_landing_zone.outer)
		    scene.primitives.add(show_landing_zone.inner)
	    } else {
	    	viewer.scene.primitives.remove(show_landing_zone.outer)
	    	viewer.scene.primitives.remove(show_landing_zone.inner)
	    	show_landing_zone.outer = undefined
	    	show_landing_zone.inner = undefined
	    }
    }
    
    if (evt.target.id === 'fence-list'){
    	send(JSON.stringify({fence_list: evt.target.id}));
//    	show_fence.value = ! show_fence.value
//    	var entity = viewer.entities.getById('fence_wall');
//        if (entity === undefined || entity === null) {
//            //bail out and dont try to set the show attribute
//        } else {
//            entity.show = show_fence.value;
//        }
    }
    
    if (evt.target.id === 'mission-list'){
    	send(JSON.stringify({wp_list: evt.target.id}));
//    	var entity = viewer.entities.getById('mission_line');
//        if (entity === undefined || entity === null) {
//            //bail out and dont try to set the show attribute
//        }
//        else{
//            entity.show = show_mission.value.value;
//        }//end else
    }
    
    

});
 
$contextMenu.on("mouseover", "a", function(evt){
	console.log(evt)
    console.log(evt.target.innerText)
    console.log(evt.target.id)
    var marker = get_by_id(markers, evt.target.id)
    
    if (marker != null){
    	selected.marker = marker
    	document.getElementsByTagName("body")[0].style.cursor = "pointer" // change the pointer to a hand
		selected.marker.image= '/'+app_prefix+'static/DST/wp_icons/ylw-blank.png'
		selected.alt_line = get_by_id(alt_lines, selected.marker.id)
		
    } else{
    	clear_selected_marker()
    }
    // we can use this to select a wp and highlight it on mouse over in the menu
})
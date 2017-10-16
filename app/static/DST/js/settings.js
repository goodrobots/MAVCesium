toggle_entity_shadows = function(btn_ref, var_to_toggle) {
    	toggle_value(btn_ref, var_to_toggle)
    	viewer.shadows = var_to_toggle.value
    }

toggle_terrain_shadows = function(btn_ref, var_to_toggle) {
	toggle_value(btn_ref, var_to_toggle)
	viewer.terrainShadows = var_to_toggle.value
}

toggle_dynamic_lighting = function(btn_ref, var_to_toggle) {
	toggle_value(btn_ref, var_to_toggle)
	scene.globe.enableLighting = var_to_toggle.value
}

toggle_sensor_footprint = function(btn_ref, var_to_toggle) {
	toggle_value(btn_ref, var_to_toggle)
}

$('#toggle_pos_target_line').on('click', function(event) {
	  event.preventDefault()
	  pos_target.show = !pos_target.show 
});

$('#toggle_fence').on('click', function(event) {
	  event.preventDefault()
	  fence.show = !fence.show
	  draw_fence()
});

$('#send_auto').on('click', function(event) {
	  event.preventDefault()
	  send(JSON.stringify({mode_set: 'auto'})); 
});

$('#hud_width').on('click', function(event) {
	event.preventDefault()
	hud_half_width = !hud_half_width
	resize_hud()
});


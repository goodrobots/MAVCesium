var canvas_element = document.getElementById('hud')
var canvas = null
var FPS = 30
var canvas_width = window.innerWidth
var canvas_height = window.innerHeight
var hud_half_width = false

canvas_element.width  = window.innerWidth
canvas_element.height = window.innerHeight

if (canvas_element.getContext){
	canvas = canvas_element.getContext('2d');
	window.addEventListener('resize', resize_hud, false);
	setInterval(function() {
		draw_hud();
	}, 1000/FPS);
} else {
	console.log('ERROR: Canvas element not supported by browser. Unable to draw HUD')
}


function resize_hud() {
	canvas_element.height = window.innerHeight
	canvas_height = window.innerHeight
	if (hud_half_width == true) {
		canvas_element.width  = window.innerWidth/2
		canvas_width = window.innerWidth/2
	} else {
		canvas_element.width  = window.innerWidth
		canvas_width = window.innerWidth
	}
}

//airspeed_guage = new arc_guage('AS');

//voltage_guage = new arc_guage('BATT', 1.0/1000.0);
//voltage_guage.min_display = 3.1*6
//voltage_guage.warning_low = 3.3*6;
//voltage_guage.nominal_low = 3.5*6;
//voltage_guage.nominal_high = 4.3*6;
//voltage_guage.warning_high = 4.3*6;
//voltage_guage.max_display = 4.3*6;
//voltage_guage.offset_y = 2

function draw_hud() {
	canvas.clearRect(0, 0, canvas_width, canvas_height);
	if (!data_stream.ATTITUDE && !data_stream.GLOBAL_POSITION_INT) {
		// we dont have valid mavlink data yet
		// inform the user what is going on...
		text_overlay.draw('Waiting for valid MAVLink data...')
	}
	
	if (hud.show){
		// update hud elements here...
		if (data_stream.ATTITUDE) {
			pitch_ladder.draw()
			roll_guage.draw()
			compass.draw()
		}
		text_guage.draw()
//		if (data_stream.VFR_HUD) {
//			airspeed_guage.draw(data_stream.VFR_HUD.airspeed, 30.5)
//		}
//		if (data_stream.SYS_STATUS){
//			voltage_guage.draw(data_stream.SYS_STATUS.voltage_battery)
//		}
//		flight_vector.draw()
	}
}

var text_overlay = {
	color: "#FFF",

	draw: function(msg) {
		canvas.fillStyle = this.color;
	    canvas.strokeStyle = this.color;
	    canvas.save() // pre rotate & translate
	    canvas.textAlign="center";
	    canvas.textBaseline="middle";
	    canvas.font="30px Arial";
	    canvas.translate(canvas_width/2, canvas_height/2);
	    canvas.fillText(msg, 0, 0);
	    canvas.restore() // post rotate & translate
	}
		
}

var pitch_ladder = {
	//TODO show direction of flight rel to camera, e.g. visualize alpha and beta offsets from camera view
	color: "#FFF",
	rung_width: 100,
	vertical_spacing: 200,
	text_spacing : 10,
	rungs: 10,
	pitch_interval: 5,
	rung_end_height: 20,
	draw: function() {
		canvas.fillStyle = this.color;
	    canvas.strokeStyle=this.color;
	    canvas.save() // pre rotate & translate
	    canvas.textBaseline="middle";
	    canvas.font="20px Arial";
	    canvas.translate(canvas_width/2, canvas_height/2);
	    // circle clip
	    canvas.beginPath()
	    canvas.arc(0,0,Math.min(canvas_width, canvas_height)/3,0,Math.PI*2,true); // clip diameter is 2/3 of the smallest dim 
	    canvas.clip();
	    // end circle clip
	    // hud ref point
	    canvas.beginPath()
	    canvas.moveTo(this.rung_width*0.5,0)
		canvas.lineTo(5,0)
	    canvas.arc(0, 0, 5, 0, Math.PI, true);
	    canvas.moveTo(-5,0)
		canvas.lineTo(-this.rung_width*0.5,0)
	    canvas.stroke()
	    // end hud ref point
	    // pitch ladder
	    canvas.rotate(-aircraft.roll);
	    canvas.translate(0, ((180/Math.PI)*aircraft.pitch / this.pitch_interval)*this.vertical_spacing);
	    
	    
	    for (rung = -this.rungs; rung < this.rungs; rung++) {
	    	if (rung%2 == 0) {
	    		width_multi = 1.5
	    	} else {
	    		width_multi = 1
	    	}
	    	
	    	if (-rung*this.pitch_interval < 0 ) {
	    		if (canvas.setLineDash) {
	    			canvas.setLineDash([5, 15]) // set line style to dash
	    		}
	    		rung_end = this.rung_end_height
	    	} else if (-rung*this.pitch_interval > 0 ) {
	    		if (canvas.setLineDash) {
		    	    canvas.setLineDash([]) // set line style to solid
		    	}
	    		rung_end = -this.rung_end_height
	    	} else {
	    		if (canvas.setLineDash) {
		    	    canvas.setLineDash([]) // set line style to solid
		    	}
	    		
	    		rung_end = 0
	    		
	    	}
	    	
	    	canvas.beginPath();
	    	canvas.textAlign="right";
	    	canvas.fillText(-rung*this.pitch_interval, -this.rung_width*width_multi-this.text_spacing,rung*this.vertical_spacing+0.5*rung_end)
	    	
		    canvas.moveTo(-this.rung_width*width_multi,rung*this.vertical_spacing)
		    canvas.lineTo(-this.rung_width*width_multi*0.5,rung*this.vertical_spacing)
		    
		    canvas.moveTo(this.rung_width*width_multi,rung*this.vertical_spacing)
		    canvas.lineTo(this.rung_width*width_multi*0.5,rung*this.vertical_spacing)
		    
		    
		    canvas.textAlign="left";
		    canvas.fillText(-rung*this.pitch_interval, this.rung_width*width_multi+this.text_spacing,rung*this.vertical_spacing+0.5*rung_end)
		    canvas.stroke()
		    
		    if (canvas.setLineDash) {
		    	canvas.setLineDash([]) // set line style to solid
		    }
		    canvas.beginPath();
		    canvas.moveTo(-this.rung_width*width_multi,rung*this.vertical_spacing+rung_end)
		    canvas.lineTo(-this.rung_width*width_multi,rung*this.vertical_spacing)
		    canvas.moveTo(this.rung_width*width_multi,rung*this.vertical_spacing)
		    canvas.lineTo(this.rung_width*width_multi,rung*this.vertical_spacing+rung_end)
		    canvas.stroke()
	    }
	    if (canvas.setLineDash) {
    	    canvas.setLineDash([]) // set line style to solid
    	}
	    // end pitch ladder
	    // begin nav pitch target
	    if (data_stream.NAV_CONTROLLER_OUTPUT) {
	    	canvas.translate(0, -(data_stream.NAV_CONTROLLER_OUTPUT.nav_pitch / this.pitch_interval)*this.vertical_spacing);
		    canvas.beginPath();
		    canvas.arc(0,0,3,0,Math.PI*2,true);
		    canvas.stroke()
	    }
	    // end nav pitch target
	    
	    canvas.restore() // post rotate & translate
	 }
}

var roll_guage = {
	//TODO log scale tick option
	color: "#FFF",
	vertical_offset:10,
	radius:400,
	roll_interval: 10,
	angle_spacing:10,
	ticks: 11,
	tick_length:10,
	marker_size:15,
	text_offset: 5,
	draw: function() {
		this.radius = (Math.min(canvas_width, canvas_height)*0.40)
		canvas.fillStyle = this.color;
	    canvas.strokeStyle=this.color;
	    canvas.save() // pre rotate & translate
	    canvas.textBaseline="bottom";
	    canvas.font="20px Arial";
	    canvas.translate(canvas_width/2, canvas_height/2);
	    
	    canvas.beginPath()
	    canvas.rotate(1.5*Math.PI)
	    canvas.arc(0, 0, this.radius, -((this.ticks-1)*this.angle_spacing*(Math.PI/180))/2, ((this.ticks-1)*this.angle_spacing*(Math.PI/180))/2, false);
	    canvas.stroke()
	    
	    canvas.rotate((-Math.PI/2))
	    canvas.rotate(-((this.ticks-1)*this.angle_spacing*(Math.PI/180))/2); // pre rotate to the leftmost roll mark
	    
	    canvas.beginPath();
	    
	    for (tick = 0; tick < this.ticks; tick++) {
	    	if (tick%2 == 0){
	    		length_multi = 1
	    	} else {
	    		length_multi = 1.5
    		
	    	}
	    	canvas.moveTo(0,this.radius)
		    canvas.lineTo(0,this.radius+(this.tick_length*length_multi))
	    	canvas.rotate(this.angle_spacing*(Math.PI/180))
	    }
	    
	    canvas.stroke()
	    
	    canvas.rotate(-this.angle_spacing*(Math.PI/180)*(this.ticks+1)/2) // un-rotate from before
	    canvas.rotate(aircraft.roll)
	    
	    canvas.beginPath();
	    canvas.moveTo(0,this.radius)
	    canvas.lineTo(this.marker_size/2,this.radius-this.marker_size)
	    canvas.lineTo(-this.marker_size/2,this.radius-this.marker_size)
	    canvas.closePath();
	    
	    canvas.stroke();
	    
	    if (data_stream.NAV_CONTROLLER_OUTPUT) {
	    	canvas.rotate(-aircraft.roll)
		    canvas.rotate(data_stream.NAV_CONTROLLER_OUTPUT.nav_roll*(Math.PI/180))
		    canvas.beginPath();
	    	canvas.arc(0, this.radius+this.marker_size/2, 3,0,Math.PI*2,true);
		    canvas.stroke()
	    }
	    
	    canvas.restore() // post rotate & translate
	    canvas.save()
	    
	    canvas.translate(canvas_width/2, canvas_height/2);
	    canvas.rotate(aircraft.roll)
	    canvas.textAlign="center";
	    canvas.textBaseline="top";
	    canvas.font="20px Arial";
	    canvas.fillText((aircraft.roll*(180/Math.PI)).toFixed(1),0, -this.radius+this.marker_size)
	    canvas.rotate(-aircraft.roll)    
	    
	    canvas.restore() // post rotate & translate
    }

}

var compass = {
	color: "#FFF",
	vertical_offset:400,
	width:800,
	tick_spacing:50,
	tick_interval:5,
	tick_length:10,
	marker_size:15,
	marker_offset:10,
	draw: function() {
		this.vertical_offset = canvas_height*0.45
		canvas.fillStyle = this.color;
	    canvas.strokeStyle=this.color;
	    canvas.save() // pre rotate & translate
	    canvas.textBaseline="bottom";
	    canvas.textAlign="center";
	    canvas.font="20px Arial";
	    canvas.translate(canvas_width/2, canvas_height/2);
	    
	    canvas.beginPath()
	    canvas.moveTo(-this.width/2,-canvas_height/2);
	    canvas.lineTo(-this.width/2,canvas_height/2);
	    canvas.lineTo(this.width/2,canvas_height/2);
	    canvas.lineTo(this.width/2,-canvas_height/2);
	    canvas.closePath()
	    canvas.clip();
	    
	    canvas.translate(0, this.vertical_offset)
	    // we are now at the bottom middle
	    
	    canvas.beginPath();
	    canvas.moveTo(-canvas_width/2,this.tick_length)
	    canvas.lineTo(canvas_width/2,this.tick_length)
	    canvas.moveTo(-this.width/2,0)
	    canvas.moveTo(0, -1.5*this.tick_length-this.marker_offset)
	    canvas.lineTo(-this.marker_size/2, (-1.5*this.tick_length)-this.marker_size-this.marker_offset)
	    canvas.lineTo(this.marker_size/2, (-1.5*this.tick_length)-this.marker_size-this.marker_offset)
	    canvas.closePath()
	    canvas.stroke()
	    aircraft_val = wrap_360(aircraft.yaw*(180/Math.PI))
	    local_offset = aircraft_val%this.tick_interval
	    left_val = aircraft_val-local_offset
	    
	    
	    canvas.fillText(aircraft_val.toFixed(1), 0, -40)
	    
	    canvas.translate(-(local_offset/this.tick_interval)*this.tick_spacing, 0);
	    
	    
	    total_ticks = 360/this.tick_interval
	    lower_ticks = Math.floor(total_ticks/2)
	    upper_ticks = total_ticks - lower_ticks
	    canvas.beginPath();
	    for (tick = 0; tick < lower_ticks; tick++) {
	    	canvas.moveTo(-tick*this.tick_spacing,0)
	    	canvas.lineTo(-tick*this.tick_spacing,this.tick_length)
	    	text_val = left_val-(tick*this.tick_interval)
	    	if (text_val<0){
	    		text_val+=360
	    	}
	    	if (text_val == 0 || text_val == 360) {
	    		text_val = 'N'
	    	} else if (text_val == 180) {
	    		text_val = 'S'
	    	} else if (text_val == 90) {
	    		text_val = 'E'
	    	} else if (text_val == 270) {
	    		text_val = 'W'
	    	} else{
	    		// dont worry
	    	}
	    	canvas.fillText(text_val, -tick*this.tick_spacing, 0)
	    	
	    }
	    for (tick = 1; tick <= upper_ticks; tick++) {
	    	canvas.moveTo(tick*this.tick_spacing,0)
	    	canvas.lineTo(tick*this.tick_spacing,this.tick_length)
	    	text_val = left_val+(tick*this.tick_interval)
	    	if (text_val>360){
	    		text_val-=360
	    	}
	    	if (text_val == 0 || text_val == 360) {
	    		text_val = 'N'
	    	} else if (text_val == 180) {
	    		text_val = 'S'
	    	} else if (text_val == 90) {
	    		text_val = 'E'
	    	} else if (text_val == 270) {
	    		text_val = 'W'
	    	} else{
	    		// dont worry
	    	}
	    	canvas.fillText(text_val, tick*this.tick_spacing, 0)

	    }
	    canvas.stroke()
	    canvas.restore() // post rotate & translate
	}	
}

var flight_vector = {
		color: "#FFF",
		marker_size: 10,
		draw: function() {
			canvas.fillStyle = this.color;
		    canvas.strokeStyle = this.color;
		    canvas.save() // pre translate
		    canvas.translate(canvas_width/2, canvas_height/2);
		    if (data_stream.LOCAL_POSITION_NED){
		    	x = data_stream.LOCAL_POSITION_NED.vx //north is +ve
		    	y = data_stream.LOCAL_POSITION_NED.vy //east is +ve
		    	data_stream.LOCAL_POSITION_NED.vz //down is +ve
		    	// console.log((aircraft.yaw - Math.atan2(y,x))*(180.0/Math.PI))
			    canvas.beginPath();
		    	x_val = (wrap_360(Math.atan2(y,x)*(180.0/Math.PI)) - wrap_360((aircraft.yaw)*(180.0/Math.PI)))
		    	if (x_val>180){
		    		x_val = x_val -360
		    	} else if (x_val<-180){
		    		x_val = x_val + 360
		    	}
		    	
		    	y_val = Math.atan2(-data_stream.LOCAL_POSITION_NED.vz, Math.sqrt(Math.pow(x,2)+Math.pow(y,2)))*(180.0/Math.PI)
//		    	console.log(y_val)
		    	x_loc = x_val*27
		    	y_loc = y_val*10
		    	canvas.arc(x_loc, y_loc, this.marker_size ,0,Math.PI*2,true);
			    canvas.stroke()
			    canvas.beginPath()
			    
			    canvas.moveTo(x_loc, y_loc-this.marker_size);
			    canvas.lineTo(x_loc, y_loc-this.marker_size*2);
			    
			    canvas.moveTo(x_loc+this.marker_size*2, y_loc);
			    canvas.lineTo(x_loc+this.marker_size, y_loc);
			    
			    canvas.moveTo(x_loc-this.marker_size, y_loc);
			    canvas.lineTo(x_loc-this.marker_size*2, y_loc);
			    canvas.stroke();
			    
			    
//			    //if the airspeed is low or high we draw the rect
//			    canvas.beginPath();
//			    airspeed_offset_y = 0
//			    canvas.rect(x_loc-this.marker_size*2.5, y_loc, this.marker_size*0.5, airspeed_offset_y); //the last term defines the rec height. modify it
//			    //show the airspeed rate indicator
//			    airspeed_rate_offset_y = 0
//			    canvas.moveTo(x_loc-this.marker_size*2.5-this.marker_size, y_loc-this.marker_size/2-airspeed_rate_offset_y);
//			    canvas.lineTo(x_loc-this.marker_size*2.5, y_loc-airspeed_rate_offset_y);
//			    canvas.lineTo(x_loc-this.marker_size*2.5-this.marker_size, y_loc+this.marker_size/2-airspeed_rate_offset_y);
//			    canvas.stroke();
		    }
		    
		    canvas.restore()
			
		}
}

var text_guage = {
		color: "#FFF",
		draw: function() {
			canvas.fillStyle = this.color;
		    canvas.strokeStyle = this.color;
		    canvas.save() // pre rotate & translate
		    top_offset = canvas_height*0.1
		    canvas.textBaseline="middle";
		    canvas.textAlign="left";
		    canvas.font="30px Arial";
		    
		    curr_offset = 80;
		    large_offset = 60;
		    small_offset = 40;
		    
		    if (flightmode) {
		    	if (flightmode == 'RTL') {
		    		canvas.fillStyle = "#FF0000"; // set the text colour to be red
		    	} else if (flightmode == 'AUTO') {
		    		canvas.fillStyle = "#0000CD"; // set the text colour to be dark blue
		    	} else{
		    		// do nothing...
		    	}
		    	
		    	canvas.fillText(flightmode, 15, curr_offset);
		    	canvas.fillStyle = this.color // restore the fill style
		    	
		    	status_text.draw(curr_offset) // draw the status_text (if updated) to the right of the flight mode 
		    	curr_offset += large_offset
		    }
		    
		    if (data_stream.MISSION_CURRENT && data_stream.NAV_CONTROLLER_OUTPUT) {
		    	canvas.fillText('WP: '+(data_stream.MISSION_CURRENT.seq)+' < '+data_stream.NAV_CONTROLLER_OUTPUT.wp_dist+' m', 15, curr_offset);
		    	curr_offset += large_offset
		    }
		    
			if (data_stream.VFR_HUD) {
			    canvas.font="30px Arial";
			    canvas.fillText('Speed', 15, curr_offset);
			    curr_offset += small_offset
			    canvas.font="20px Arial";
			    canvas.fillText('Air Speed: '+(data_stream.VFR_HUD.airspeed).toFixed(1)+' m/s', 15, curr_offset);
			    curr_offset += small_offset
			    canvas.font="20px Arial";
			    canvas.fillText('Ground Speed: '+(data_stream.VFR_HUD.groundspeed).toFixed(1)+' m/s', 15, curr_offset);
			    curr_offset += large_offset
			    
			    canvas.font="30px Arial";
			    canvas.fillText('Altitude: '+(data_stream.VFR_HUD.alt).toFixed(1)+' m', 15, curr_offset);
			    curr_offset += large_offset
			    
			    canvas.font="30px Arial";
			    canvas.fillText('Throttle: '+(data_stream.VFR_HUD.throttle).toFixed(0)+' %', 15, curr_offset);
			    curr_offset += large_offset
			}
		    
		    if (data_stream.NAV_CONTROLLER_OUTPUT) {
			    canvas.font="30px Arial";
			    canvas.fillText('Nav Error', 15, curr_offset);
			    curr_offset += small_offset
			    canvas.font="20px Arial";
			    canvas.fillText('Air Speed Err: '+(data_stream.NAV_CONTROLLER_OUTPUT.aspd_error*0.01).toFixed(1)+' m/s', 15, curr_offset);
			    curr_offset += small_offset
			    canvas.fillText('Altitude Err: '+(data_stream.NAV_CONTROLLER_OUTPUT.alt_error).toFixed(1)+' m', 15, curr_offset);
			    curr_offset += small_offset
			    canvas.fillText('Xtrack Err: '+(data_stream.NAV_CONTROLLER_OUTPUT.xtrack_error).toFixed(1)+' m', 15, curr_offset);
			    curr_offset += large_offset
		    }
		    
		    if (data_stream.WIND) {
			    canvas.font="30px Arial";
			    canvas.fillText('Wind', 15, curr_offset);
			    curr_offset += small_offset
			    canvas.font="20px Arial";
		    	canvas.fillText('Direction: '+(data_stream.WIND.direction).toFixed(1), 15, curr_offset);
			    curr_offset += small_offset
			    canvas.fillText('Speed: '+(data_stream.WIND.speed).toFixed(1)+' m/s', 15, curr_offset);
			    curr_offset += large_offset
		    }
			
		    canvas.restore() 
		}
}


var status_text = {
	// TODO: display this here on as a notification like gitter, etc...
	// TODO: colour and display time based on severity
	color: "#FFF",
	last_change_time: 0,
	display_time:0,
	display_duration: 5, // seconds
	draw: function(curr_offset) {
		if (data_stream.STATUSTEXT) {
			d = new Date()
			curr_time = d.getTime() 
			if (data_stream.STATUSTEXT.timestamp > this.last_change_time){
				console.log(data_stream.STATUSTEXT)
				this.last_change_time = data_stream.STATUSTEXT.timestamp
				this.display_time = curr_time + (this.display_duration*1000)
			}
			if (curr_time < this.display_time) {
				// show the text
				canvas.font="30px Arial";
				canvas.textBaseline="middle";
			    canvas.textAlign="left";
			    if (flightmode) {
			    	offset = canvas.measureText(flightmode+"__").width
			    } else {
			    	offset = 15
			    }
			    canvas.font="20px Arial";
				canvas.fillText(data_stream.STATUSTEXT.text, offset, curr_offset); // display to the right of the current mode
			}
		}
	}
}

function arc_guage(variable_name, multi) {
	this.multi = multi;
	this.color = "#FFFFFF";
	this.nominal_color = "#23A127";
	this.warning_color = "#FF7701";
	this.danger_color = "#FF291C";
	this.setpoint_color = "#FFFFFF"//"#FF00FF";
	this.variable_name = variable_name;
	this.radius = 90;
	this.min_display = 24;
	this.warning_low = 25;
	this.nominal_low = 27;
	this.nominal_high = 37;
	this.warning_high = 39;
	this.max_display = 40;
	this.start_angle = 0.7 * Math.PI; //1.1
	this.end_angle = 2.3* Math.PI;
	this.marker_size= 20;
	this.guage_line_width =10;
	this.location_x = canvas_width-1.5*(this.radius+this.marker_size);
	this.location_y = 2*(this.radius+this.marker_size)
	this.offset_y = 1;
	
	this.draw = function(guage_data, guage_setpoint, setpoint_multi) {
		canvas.fillStyle = this.color;
	    canvas.strokeStyle = this.color;
	    canvas.save() // pre rotate & translate
	    canvas.translate(this.location_x , this.offset_y*this.location_y);
	    canvas.beginPath()
	    
	    total_angle = this.end_angle - this.start_angle
	    total_range = this.max_display - this.min_display
	    angle_per_unit = total_angle / total_range;
	    finish_angle_low_danger = this.start_angle+angle_per_unit*(this.warning_low-this.min_display);
	    finish_angle_low_warning = finish_angle_low_danger+angle_per_unit*(this.nominal_low-this.warning_low)
	    finish_angle_high_nominal = finish_angle_low_warning+angle_per_unit*(this.nominal_high-this.nominal_low)
	    finish_angle_high_warning = finish_angle_high_nominal+angle_per_unit*(this.warning_high -this.nominal_high)
	    finish_angle_high_danger = finish_angle_high_warning+angle_per_unit*(this.max_display -this.warning_high)
	    
	    canvas.lineWidth = this.guage_line_width;
	    canvas.strokeStyle = this.danger_color;
	    canvas.arc(0, 0, this.radius, this.start_angle, finish_angle_low_danger, false);
	    canvas.stroke();
	    
	    canvas.beginPath()
	    canvas.strokeStyle = this.warning_color;
	    canvas.arc(0, 0, this.radius, finish_angle_low_danger, finish_angle_low_warning, false);
	    canvas.stroke();
	    
	    canvas.beginPath()
	    canvas.strokeStyle = this.nominal_color;
	    canvas.arc(0, 0, this.radius, finish_angle_low_warning, finish_angle_high_nominal, false);
	    canvas.stroke();
	    
	    canvas.beginPath()
	    canvas.strokeStyle = this.warning_color;
	    canvas.arc(0, 0, this.radius, finish_angle_high_nominal, finish_angle_high_warning, false);
	    canvas.stroke();
	    
	    canvas.beginPath()
	    canvas.strokeStyle = this.danger_color;
	    canvas.arc(0, 0, this.radius, finish_angle_high_warning, finish_angle_high_danger, false);
	    canvas.stroke();
	    
	    	    
	    // add the external pointer as a solid triangle that changes color
	    // calculate where the pointer needs to go
	    
	    if (guage_data) {
	    	if (this.multi){
	    		guage_value = (guage_data * this.multi).toFixed(1)
	    	} else {
	    		guage_value = (guage_data).toFixed(1)
	    	}
	    	
	    	if (guage_value >= this.max_display){
	    		pointer_value = this.max_display
	    		pointer_color = this.danger_color
	    	} else if (guage_value > this.warning_high){
	    		pointer_value = guage_value
	    		pointer_color = this.danger_color
	    	} else if (guage_value > this.nominal_high){
	    		pointer_value = guage_value
	    		pointer_color = this.warning_color
	    	} else if (guage_value > this.nominal_low){
	    		pointer_value = guage_value
	    		pointer_color = this.nominal_color
	    	} else if (guage_value > this.warning_low){
	    		pointer_value = guage_value
	    		pointer_color = this.warning_color
	    	} else if (guage_value > this.min_display){
	    		pointer_value = guage_value
	    		pointer_color = this.danger_color
	    	} else {
	    		pointer_value = this.min_display
	    		pointer_color = this.danger_color
	    	}
	    	
		    canvas.beginPath();
		    rect_width = 100;
		    rect_height = 50;
		    canvas.rect(-rect_width/2, -rect_height/2, rect_width, rect_height);
		    canvas.lineWidth = 1;
		    canvas.strokeStyle = "#000000";
		    canvas.fillStyle = pointer_color;
		    canvas.fill();
		    canvas.stroke();
		    
		    canvas.textBaseline="middle";
		    canvas.textAlign="center";
		    canvas.font="30px Arial";
		    canvas.fillStyle = this.color;
		    canvas.strokeStyle = this.color;
		    canvas.fillText(guage_value, 0, 0);
		    
		    canvas.fillStyle = this.color;
		    canvas.strokeStyle = this.color;
		    canvas.textBaseline="bottom";
		    canvas.fillText(this.variable_name, 0, -rect_height/2);
		    
		    //show setpoint value
		    if (guage_setpoint) {
		    	if (setpoint_multi) {
		    		guage_setpoint = guage_setpoint * setpoint_multi
		    	}
			    canvas.font="25px Arial";
			    canvas.fillStyle = this.setpoint_color;
			    canvas.textBaseline="top";
			    canvas.fillText(guage_setpoint, 0, rect_height/2);
		    }
		    
		    
		    //draw a black line around the color arc
		    canvas.beginPath()
		    canvas.lineWidth = 1;
		    canvas.strokeStyle = "#000000";
		    canvas.arc(0, 0, this.radius+this.guage_line_width/2, this.start_angle, this.end_angle, false);
		    canvas.stroke();
		    canvas.beginPath()
		    canvas.arc(0, 0, this.radius-this.guage_line_width/2, this.start_angle, this.end_angle, false);
		    canvas.stroke();
		    
		    canvas.beginPath()
		    canvas.rotate(-1.5* Math.PI + this.start_angle)
		    
		    
		    canvas.moveTo(0,-this.radius-this.guage_line_width/2);
		    canvas.lineTo(0,-this.radius+this.guage_line_width/2);
		    canvas.stroke();
		    canvas.beginPath()
		    canvas.rotate(angle_per_unit*(this.max_display-this.min_display))
		    canvas.moveTo(0,-this.radius-this.guage_line_width/2);
		    canvas.lineTo(0,-this.radius+this.guage_line_width/2);
		    canvas.stroke();
		    canvas.rotate(-angle_per_unit*(this.max_display-this.min_display))
		    
//		    canvas.rotate(-1.5* Math.PI + this.start_angle)
		    
		    canvas.rotate(angle_per_unit*(pointer_value-this.min_display))
		    canvas.beginPath();
		    canvas.strokeStyle = "#000000";
		    canvas.fillStyle = pointer_color;
		    canvas.lineWidth = 1;
		    canvas.moveTo(0,-this.radius-this.guage_line_width/2)
		    canvas.lineTo(this.marker_size/2,-this.radius-this.marker_size-this.guage_line_width/2)
		    canvas.lineTo(-this.marker_size/2,-this.radius-this.marker_size-this.guage_line_width/2)
		    canvas.closePath();
		    canvas.fill();
		    canvas.stroke();
		    canvas.rotate(-angle_per_unit*(pointer_value-this.min_display))
		    
		    //show setpoint marker
		    if (guage_setpoint) {
			    canvas.rotate(angle_per_unit*(guage_setpoint-this.min_display))
			    canvas.beginPath();
			    canvas.strokeStyle = this.setpoint_color;
			    canvas.fillStyle = this.setpoint_color;;
			    canvas.lineWidth = 2;
			    canvas.moveTo(0,-this.radius-this.guage_line_width/2)
			    canvas.lineTo(this.marker_size/2,-this.radius-this.marker_size-this.guage_line_width/2)
			    canvas.moveTo(0,-this.radius-this.guage_line_width/2)
			    canvas.lineTo(-this.marker_size/2,-this.radius-this.marker_size-this.guage_line_width/2)
			    canvas.stroke();
			    canvas.rotate(-angle_per_unit*(guage_setpoint-this.min_display))
		    }
		    
	    }
	    
	    
	    canvas.restore();
	
	}
}

function wrap_360(angle) {
	if (angle < 0) {
		angle = angle + 360
	}
	return angle
}





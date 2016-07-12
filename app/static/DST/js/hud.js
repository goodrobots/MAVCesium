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

function draw_hud() {
	canvas.clearRect(0, 0, canvas_width, canvas_height);
	if (hud.show){
		// update hud elements here...
		if (data_stream.ATTITUDE) {
			pitch_ladder.draw()
			roll_guage.draw()
			compass.draw()
		}
		status_text.draw()
		text_guage.draw()
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
	    
	    if (flightmode) {
	    	if (flightmode == 'RTL') {
	    		canvas.fillStyle = "#FF0000"; // set the text colour to be red
	    	} else if (flightmode == 'AUTO') {
	    		canvas.fillStyle = "#0000CD"; // set the text colour to be dark blue
	    	} else{
	    		// do nothing...
	    	}
	    	
	    	canvas.fillText(flightmode, 15, top_offset);
	    	canvas.fillStyle = this.color // restore the fill style
	    }
	    
	    if (data_stream.VFR_HUD) {
		    canvas.font="30px Arial";
		    canvas.fillText('AS: '+(data_stream.VFR_HUD.airspeed).toFixed(1)+' m/s', 15, top_offset+50);
		    canvas.font="20px Arial";
		    canvas.fillText('GS: '+(data_stream.VFR_HUD.groundspeed).toFixed(1)+' m/s', 15, top_offset+80);
		    canvas.font="30px Arial";
		    canvas.fillText('Alt: '+(data_stream.VFR_HUD.alt).toFixed(1)+' m', 15, top_offset+175);
		    canvas.font="20px Arial";
		    canvas.fillText('dAlt: '+(data_stream.VFR_HUD.climb).toFixed(1)+' m/s', 15, top_offset+205);
		    canvas.font="30px Arial";
		    canvas.fillText('Thr: '+(data_stream.VFR_HUD.throttle).toFixed(0)+' %', 15, top_offset+300);
	    }
	    
	    if (data_stream.MISSION_CURRENT && data_stream.NAV_CONTROLLER_OUTPUT) {
	    	canvas.fillText('WP: '+(data_stream.MISSION_CURRENT.seq)+' < '+data_stream.NAV_CONTROLLER_OUTPUT.wp_dist+' m', 15, top_offset+350);
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
	draw: function() {
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
				canvas.fillText(data_stream.STATUSTEXT.text, offset, top_offset); // display to the right of the current mode
			}
		}
	}
}

function wrap_360(angle) {
	if (angle < 0) {
		angle = angle + 360
	}
	return angle
}





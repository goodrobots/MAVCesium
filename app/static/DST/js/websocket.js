var socket = null;
var isopen = false;
if ("WebSocket" in window) {
	// If WebSockets are supported by the users browser...
	window.setInterval(function(){
		check_websocket()
		}, 1000);
	// Attempt a connect / reconnect every second
} else {
	alert("WebSocket is required but is NOT supported by your Browser!");
}

function check_websocket(){
	if (isopen == false && socket == null) {
		open_websocket()
	}
};

function open_websocket() {
	socket = new WebSocket(websocket);
	socket.binaryType = "arraybuffer";
	socket.onopen = function() {
		console.log("WebSocket connected!");
		isopen = true;
	}
	socket.onerror = function(e) {
		console.log("WebSocket connection error:", e);
		socket = null;
        isopen = false;
	}
//	socket.onmessage = function(event) {
//		if (typeof event.data == "string") {
//			    try {
//			    	response = JSON.parse(event.data);
//			    } catch (e) {
//			    	console.log(event.data)
//			        return false;
//			    }
//			console.log(response);
//			if (response.mavlink_data) {
//				update_data_stream(response.mavlink_data);
//			}
//			if (response.json_data) {
//			    func = response.json_data.replyto
//			    args = response.json_data
//				window[func](args); // execute the name of the function that came from the json as 'replyto', pass it the json-as-javascript.
//			}			
//		}
//	}
	socket.onmessage = function(e) {
		if (typeof e.data == "string") {
			response = JSON.parse(e.data)
			if (response.pos_target_data) {
				update_pos_target_data(response.pos_target_data)
			} else if (response.mission_data) {
				update_mission_data(response.mission_data)
			} else if (response.fence_data) {
				update_fence_data(response.fence_data)
			} else if (response.defines) {
				update_defines(response.defines)
			} else if (response.mav_data) {
				update_data_stream(response.mav_data)
			} else if (response.flightmode) {
				update_flightmode(response.flightmode)
			} else {
				// Do nothing...
			}

		}
	}
	socket.onclose = function(e) {
        console.log("WebSocket connection closed.");
        socket = null;
        isopen = false;
     }
};

function send(payload) {
	if (isopen && socket.readyState == 1) {
		socket.send(payload);
		console.log("WebSocket sent data.");               
	} else {
		console.log("WebSocket connection not avalable for send.")
    }
};

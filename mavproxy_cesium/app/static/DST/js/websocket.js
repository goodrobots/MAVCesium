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
	socket = new WebSocket("ws://127.0.0.1:9000");
	socket.binaryType = "arraybuffer";
	socket.onopen = function() {
		console.log("WebSocket connected!");
		isopen = true;
	}
	socket.onerror = function(e) {
		console.log("WebSocket connection error.");
		socket = null;
        isopen = false;
	}
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

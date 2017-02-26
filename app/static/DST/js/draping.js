


var video = document.getElementById('vid');
    
//var video = document.querySelector("#videoElement");
 
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia || navigator.oGetUserMedia;
 
if (navigator.getUserMedia) {       
    navigator.getUserMedia({video: true}, handleVideo, videoError);
}
 
function handleVideo(stream) {
    video.src = window.URL.createObjectURL(stream);
}
 
function videoError(e) {
    // do something
}
// this is called from the hud resize callback
function updateVideoDiv(x_pos = false, y_pos = false , show = true) {
	var d = document.getElementById('vid_div');
	d.style.position = "absolute";
	
	if (x_pos) {
		d.style.left = x_pos +'px';
	} else {
		d.style.left = window.innerWidth - d.offsetWidth +'px';
	}
	
	if (y_pos) {
		d.style.top = y_pos +'px';
	} else {
		d.style.top = 100 +'px';
	}
	
	if (show) {
		d.style.visibility = 'visible';
	} else {
		d.style.visibility = 'hidden';
	}
	
	
}

var oldPrimitive;

function updateSensorFootprint() {

	var camPos = aircraft.position
    var camQuat = Cesium.Transforms.headingPitchRollQuaternion(camPos, aircraft.yaw+Math.PI/2.0, -aircraft.pitch, -aircraft.roll+Cesium.Math.toRadians(-180));
	var camRot = Cesium.Matrix3.fromQuaternion(camQuat);
    //var camRot = Cesium.Matrix4.getRotation(Cesium.Transforms.northEastDownToFixedFrame(camPos), new Cesium.Matrix3());
    var camProj = new Cesium.Matrix3(0.5,  0.0,  0.5,
                                     0.0,  1.0,  0.5,
                                     0.0,  0.0,  1.0);
    var camDistR = new Cesium.Cartesian3(-2.60e-01, 8.02e-02, 0.0);
    var camDistT = new Cesium.Cartesian2(-2.42e-04, 2.61e-04);

    if (oldPrimitive !== null) {
        viewer.scene.primitives.remove(oldPrimitive);
    }

    oldPrimitive = viewer.scene.primitives.add(new Cesium.ImageDrapingPrimitive({
        imageSrc: video,
        camPos: camPos,
        camRot: camRot,
        camProj: camProj,
        camDistR: camDistR,
        camDistT: camDistT,
        asynchronous : false
    }));
    
}

var stillCapturePrimitive;

function updateStillCaptureSensorFootprint() {

	var camPos = aircraft.position
    var camQuat = Cesium.Transforms.headingPitchRollQuaternion(camPos, aircraft.yaw+Math.PI/2.0, -aircraft.pitch, -aircraft.roll+Cesium.Math.toRadians(-180));
	var camRot = Cesium.Matrix3.fromQuaternion(camQuat);
    //var camRot = Cesium.Matrix4.getRotation(Cesium.Transforms.northEastDownToFixedFrame(camPos), new Cesium.Matrix3());
    var camProj = new Cesium.Matrix3(0.5,  0.0,  0.5,
                                     0.0,  1.0,  0.5,
                                     0.0,  0.0,  1.0);
    var camDistR = new Cesium.Cartesian3(-2.60e-01, 8.02e-02, 0.0);
    var camDistT = new Cesium.Cartesian2(-2.42e-04, 2.61e-04);

    if (stillCapturePrimitive !== null) {
        viewer.scene.primitives.remove(stillCapturePrimitive);
    }

    stillCapturePrimitive = viewer.scene.primitives.add(new Cesium.ImageDrapingPrimitive({
        imageSrc: '/static/top.png', // '/static/big-buck-bunny_trailer.mp4'
        camPos: camPos,
        camRot: camRot,
        camProj: camProj,
        camDistR: camDistR,
        camDistT: camDistT,
        asynchronous : false
    }));
    
}


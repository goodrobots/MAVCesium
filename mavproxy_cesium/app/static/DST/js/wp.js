//var wp = (function($) {
//	var self = this;
//	
//	self.add = function(data) {
//        var obj;
//	}
//}


//------------start wp marker ----//
    var alt_lines = scene.primitives.add(new Cesium.PolylineCollection)
    var markers = scene.primitives.add(new Cesium.BillboardCollection)
    var paths = scene.primitives.add(new Cesium.PolylineCollection)

    
    function make_id(){
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        
        for( var i=0; i < 5; i++ )
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        
        return text;
    }
    
    function create_wp(id, lat, lon, alt){
    	destroy_wp(id)
        alt_lines.add({
            id : id,
            positions : Cesium.Cartesian3.fromDegreesArrayHeights( [lon, lat, alt,   lon, lat, 0]  ),
            width : 1,
            material : Cesium.Material.fromType('Color', {
                color : Cesium.Color.BLACK
                }) //DODGERBLUE
        });
        
        markers.add({
            id : id,
            position : Cesium.Cartesian3.fromDegrees(lon, lat, alt),
            image : '/static/DST/wp_icons/blu-blank.png',
            verticalOrigin : Cesium.VerticalOrigin.BOTTOM
        
        });
    	
    }
    
    function destroy_wp(id){
    	var wp_alt_line = get_by_id(alt_lines, id)
    	alt_lines.remove(wp_alt_line)
        var wp_marker = get_by_id(markers, id)
    	markers.remove(wp_marker)
    }
//------------end  wp marker ----//
    
    
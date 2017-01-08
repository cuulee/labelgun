console.log("Openlayers3 Example");

SystemJS.config({
    map : {
        rbush : "/../../node_modules/rbush/rbush.js",
        labelgun : "/../../lib/labelgun.js"
    }
});

SystemJS.import('labelgun').then(function(labelgun) {

    var labels = [];
    var labelCache = {}; // We can save cycles by caching the labels!
    var labelEngine = new labelgun.default(hideLabel, showLabel);

    var geojson = new ol.source.Vector({
        url: '/examples/geojson/cupcakes.geojson',
        format: new ol.format.GeoJSON()
    });

    var cupcakesLayer = new ol.layer.Vector({
        title: 'added Layer',
        source: geojson,
        style: createLabel
    });

    var map = new ol.Map({
        layers: [
            new ol.layer.Tile({
                    source: new ol.source.OSM()
            }),
            cupcakesLayer
        ],
        target: 'map',
        view: new ol.View({
            center: ol.proj.transform([-122.676201, 45.523375], 'EPSG:4326', 'EPSG:3857'),
            zoom: 4
        })
    });

    var marker = new ol.style.Style({
        image: new ol.style.Icon({
            anchor: [0.5, 0.5],
            opacity: 0.9,
            src: 'marker.png'
        })
    });

    var ghostZoom = map.getView().getZoom();
    map.getView().on('change:resolution',function(){
        if (ghostZoom != map.getView().getZoom()) {
            ghostZoom = map.getView().getZoom();
            updateLabels();
        }
    });

    cupcakesLayer.on('postcompose', function(){
         if (cupcakesLayer.getVisible()) {
            updateLabels();
        }
    });


    function hideLabel(label) {
         label.labelObject.getImage().setOpacity(0);
    } 

    function showLabel(label) { 
        label.labelObject.getImage().setOpacity(1);
    }

    function updateLabels() {
        labels.forEach(function(label, i) {
            var boundingBox = getBoundingBox(label.center, label.width);
            labelEngine.ingestLabel(
                boundingBox,
                i,
                1, // Weight
                label.iconStyle, // LabelObject
                label.text,
                false
            );
        });
        labelEngine.update();
        labelEngine.destroy();
        labels = [];
    }

    function getTextWidth (text, fontStyle) {

        var canvas = undefined,
            context = undefined,
            metrics = undefined;

        canvas = document.createElement( "canvas" );

        context = canvas.getContext( "2d" );

        context.font = fontStyle;
        metrics = context.measureText( text );

        return metrics.width;

    }

    function createLabel(geojsonFeature){

        var text = geojsonFeature.get("name");
        var center = geojsonFeature.getGeometry().getCoordinates();
        var labelFontStyle = "Normal 12px Arial";
        var xPadding = 10;
        var labelWidth = getTextWidth(text, labelFontStyle) + xPadding;
        var fillColor = "rgba(255, 255, 255, 0.75)";

        var iconSVG = '<svg ' +
                    'version="1.1" xmlns="http://www.w3.org/2000/svg" ' +
                    'x="0px" y="0px" width="' + labelWidth + 'px" height="16px" ' +
                    'viewBox="0 0 ' + labelWidth + ' 16" enable-background="new 0 0 ' + labelWidth + ' 16" >'+
                        '<g>' +
                        '<rect x="0" y="0" width="' + labelWidth + '" height="16" stroke="#000000" fill="' + fillColor + '" stroke-width="2"></rect>' +
                        '<text x="5" y="13" fill="#000000" font-family="Arial" font-size="12" font-weight="normal">' + text + '</text>' +
                        '</g>' +
                    '</svg>';

        var svgURI = encodeURIComponent(iconSVG);
        var src = 'data:image/svg+xml;charset=utf-8,' + svgURI;
        var iconStyle;

        // Use the label cache if we can
        if (labelCache[text]) {
            iconStyle = labelCache[text];
        } else {
            iconStyle = new ol.style.Style({
                "image": new ol.style.Icon({
                    src : src,
                    "imgSize":[labelWidth, 16],
                    "anchor": [0.5, 0.5],
                    "offset": [0, 0]
                }),
                "zIndex": 1000
            });
            labelCache[text] = iconStyle;
        }

        labels.push({center: center, width: labelWidth, iconStyle: iconStyle, text: text});

        return [marker, iconStyle]

    };

    function getBoundingBox(center, labelWidth) {

        var pixelCenter = map.getPixelFromCoordinate(center);

        // XY starts from the top right corner of the screen
        var bl = [pixelCenter[0] - labelWidth, pixelCenter[1] + 16] ;
        var tr = [pixelCenter[0] + labelWidth, pixelCenter[1] - 16];

        var bottomLeft =  map.getCoordinateFromPixel(bl);
        var topRight =  map.getCoordinateFromPixel(tr);

        return boundingBox =  {
            bottomLeft :  bottomLeft,
            topRight : topRight
        };
    }

});
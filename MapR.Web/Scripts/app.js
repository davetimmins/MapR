var locationConnection, map, locator, myGeometry, graphicsLayer, lineSymbol;

require(["dojo/ready", "dijit/layout/BorderContainer", "dijit/layout/ContentPane", "esri/map",
         "esri/tasks/locator", "esri/geometry", "esri/dijit/Scalebar"], function (ready) {

             ready(function () {

                 esri.config.defaults.io.proxyUrl = '/proxy.ashx';

                 map = new esri.Map("map", { basemap: "gray" });

                 graphicsLayer = new esri.layers.GraphicsLayer();
                 lineSymbol = new esri.symbol.SimpleLineSymbol();

                 dojo.connect(map, 'onLoad', function (theMap) {

                     var scalebar = new esri.dijit.Scalebar({ map: theMap, scalebarUnit: "metric" });
                     theMap.addLayer(graphicsLayer);

                     // when the user hovers over the graphic, draw a line connecting it with their location 
                     // and show some information in the title bar
                     dojo.connect(theMap.graphics, "onMouseOver", function (evt) {

                         $("#hoverText").text(evt.graphic.attributes["Address"]);

                         if (evt.graphic.attributes["id"] == locationConnection.connection.id) return;

                         var polyline = new esri.geometry.Polyline(new esri.SpatialReference({ wkid: 4326 }));
                         polyline.addPath([myGeometry, esri.geometry.webMercatorToGeographic(evt.mapPoint)]);
                         // evt.graphic.geometry was throwing an error for some reason

                         var graphic = new esri.Graphic(esri.geometry.geodesicDensify(polyline, 10000), lineSymbol);
                         graphicsLayer.add(graphic);

                         var lengths = esri.geometry.geodesicLengths([polyline], esri.Units.KILOMETERS);
                         $("#hoverText").text(evt.graphic.attributes["Address"] + ", " + parseFloat(lengths).toFixed(2) + "km from your current location");
                     });

                     dojo.connect(theMap.graphics, "onMouseOut", function (evt) {
                         $("#hoverText").text("");
                         graphicsLayer.clear();
                     });

                     locator = new esri.tasks.Locator("http://tasks.arcgis.com/ArcGIS/rest/services/WorldLocator/GeocodeServer");

                     dojo.connect(locator, "onLocationToAddressComplete", function (candidate) {

                         if (!candidate.address) return;

                         var item = getMyGraphic(null);
                         item.attributes["Address"] = candidate.address.Street;
                         locationConnection.invoke('Update', locationConnection.connection.id, item.toJson());
                     });

                     var connection = $.hubConnection();
                     locationConnection = connection.createHubProxy('locationHub');

                     locationConnection.on('addGraphic', function (id, json) {
                         var graphic = new esri.Graphic(json);
                         theMap.graphics.add(graphic);
                         updateHeaderText();
                     });

                     locationConnection.on('updateGraphic', function (id, graphic) {
                         var item = getMyGraphic(id);
                         item.geometry = graphic.geometry;
                         item.attributes["Address"] = graphic.attributes["Address"];
                     });

                     locationConnection.on('leave', function (id) {
                         theMap.graphics.remove(getMyGraphic(id));
                         updateHeaderText();
                     });

                     connection.start().done(function () {
                         //Check if browser supports W3C Geolocation API
                         if (navigator.geolocation)
                             navigator.geolocation.getCurrentPosition(getCurrentPositionSuccess);
                     });
                 });
             });

             function updateHeaderText() {
                 $("#connectionCount").text(map.graphics.graphics.length + ' connected');
                 updateExtent();
             }

             function updateExtent() {

                 var extent = null;
                 dojo.forEach(map.graphics.graphics, function (graphic) {
                     if (extent == null)
                         extent = new esri.geometry.Extent(graphic.geometry.x - 1, graphic.geometry.y - 1, graphic.geometry.x + 1, graphic.geometry.y + 1, new esri.SpatialReference({ wkid: 102100 }));
                     else
                         extent = extent.union(new esri.geometry.Extent(graphic.geometry.x - 1, graphic.geometry.y - 1, graphic.geometry.x + 1, graphic.geometry.y + 1, new esri.SpatialReference({ wkid: 102100 })));
                 });
                 if (extent != null) map.setExtent(extent, true);
             }

             function getCurrentPositionSuccess(position) {

                 var r = Math.floor(Math.random() * 256);
                 var g = Math.floor(Math.random() * 256);
                 var b = Math.floor(Math.random() * 256);
                 var symbol = new esri.symbol.SimpleMarkerSymbol(esri.symbol.SimpleMarkerSymbol.STYLE_CIRCLE, 16,
                   new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID,
                   new dojo.Color([r, g, b, 1]), 4),
                   new dojo.Color([r, g, b, 0.7]));

                 myGeometry = new esri.geometry.Point(position.coords.longitude, position.coords.latitude);
                 var graphic = new esri.Graphic(esri.geometry.geographicToWebMercator(myGeometry), symbol, { "id": locationConnection.connection.id });
                 map.graphics.add(graphic);
                 updateHeaderText();

                 locationConnection.invoke('add', graphic.toJson());
                 locator.locationToAddress(myGeometry, 100);

                 navigator.geolocation.watchPosition(watchPositionSuccess);
             }

             function watchPositionSuccess(position) {
                 myGeometry = new esri.geometry.Point(position.coords.longitude, position.coords.latitude);

                 var me = getMyGraphic(null);
                 me.geometry = esri.geometry.geographicToWebMercator(myGeometry);
                 updateExtent();
                 locator.locationToAddress(me.geometry, 100);
             }

             function getMyGraphic(id) {
                 if (id == null) id = locationConnection.connection.id;
                 var filteredArr = dojo.filter(map.graphics.graphics, function (existingGraphic) {
                     return existingGraphic.attributes["id"] == id;
                 });
                 return filteredArr[0];
             }
         });

function showToast() {
    toastr.info('This sample shows the use of SignalR and the Esri JS API to show the reverse geocoded location of users accessing the page in realtime. The app.js file contains all the code for ease of understanding if you want to take a look. The server side Hub is very basic, it manages a concurrent dictionary of connection ids and graphics as Json and invokes connected clients to add, update or remove connections.',
                '',
                {
                    positionClass: 'toast-top-left',
                    timeOut: 7000
                });
}
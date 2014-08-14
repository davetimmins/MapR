
define([
    'esri/map',
    'esri/geometry/Extent',
    'esri/geometry/Point',
    'esri/geometry/Polyline',
    'esri/SpatialReference',
    'esri/graphic',
    'esri/layers/GraphicsLayer',
    'esri/geometry/webMercatorUtils',
    'esri/geometry/geodesicUtils',
    'esri/graphicsUtils',
    'esri/dijit/Scalebar',
    'esri/tasks/locator',
    'esri/symbols/SimpleLineSymbol',
    'esri/symbols/SimpleMarkerSymbol',
    'esri/units',
    'esri/Color',
    'dojo/dom',
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/on',
    'dojo/_base/array',
    'dojo/domReady!'],
    function (
      Map,
      Extent,
      Point,
      Polyline,
      SpatialReference,
      Graphic,
      GraphicsLayer,
      webMercatorUtils,
      geodesicUtils,
      graphicsUtils,
      Scalebar,
      Locator,
      SimpleLineSymbol,
      SimpleMarkerSymbol,
      units,
      Color,
      dom,
      declare,
      lang,
      on,
      array
    ) {
        return declare("mapr", null, {

            map: null,
            graphicsLayer: null,
            lineSymbol: null,
            locator: null,
            locationConnection: null,
            myGeometry: null,

            addGraphic: function (graphic) {
                this.map.graphics.add(graphic);
                this._updateHeaderText();
            },

            removeGraphic: function (id) {
                this.map.graphics.remove(this.getMyGraphic(id));
                this._updateHeaderText();
            },

            _updateHeaderText: function () {
                dom.byId("connectionCount").innerHTML = this.map.graphics.graphics.length;
                this._updateExtent(this.map);
            },

            _updateExtent: function (map) {
                if (!map.graphics || !map.graphics.graphics || map.graphics.graphics.length === 0) return;
                var extent = null;
                array.forEach(map.graphics.graphics, function (graphic) {
                    if (graphic.geometry) {
                        if (extent == null)
                            extent = new Extent(graphic.geometry.x - 1, graphic.geometry.y - 1, graphic.geometry.x + 1, graphic.geometry.y + 1, map.spatialReference);
                        else
                            extent = extent.union(new Extent(graphic.geometry.x - 1, graphic.geometry.y - 1, graphic.geometry.x + 1, graphic.geometry.y + 1, map.spatialReference));
                    }
                });
                if (extent != null) map.setExtent(extent, true);
            },

            _watchPositionSuccess: function (position) {
                this.myGeometry = new Point(position.coords.longitude, position.coords.latitude);

                var me = lang.hitch(this, this.getMyGraphic(null));
                me.geometry = webMercatorUtils.geographicToWebMercator(this.myGeometry);
                this._updateExtent(this.map);
                this.locator.locationToAddress(me.geometry, 1000);
            },

            getMyGraphic: function (id) {
                if (id === null) id = this.locationConnection.connection.id;

                var filteredArr = array.filter(this.map.graphics.graphics, function (existingGraphic) {
                    return (existingGraphic.attributes && existingGraphic.attributes["id"] === id);
                });
                return filteredArr[0];
            },

            updateGraphic: function (id, updateGraphic) {
                var item = this.getMyGraphic(id);
                if (!item) return;
                item.geometry = updateGraphic.geometry;
                item.attr("Address", updateGraphic.attributes["Address"]);
            },

            constructor: function (params) {
                lang.mixin(this, params);

                if (!this.map) this.map = new Map("map", { basemap: "gray" });
                if (!this.graphicsLayer) this.graphicsLayer = new GraphicsLayer();
                if (!this.lineSymbol) this.lineSymbol = new SimpleLineSymbol();
                if (!this.locator) this.locator = new Locator('http://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer');

                this.map.on('load', lang.hitch(this, function (e) {

                    new Scalebar({
                        map: this.map,
                        scalebarUnit: 'dual'
                    });

                    this.map.addLayer(this.graphicsLayer);

                    if (this.myGeometry) {
                        var r = Math.floor(Math.random() * 256);
                        var g = Math.floor(Math.random() * 256);
                        var b = Math.floor(Math.random() * 256);
                        var symbol = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 16,
                          new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                          new Color([r, g, b, 1]), 4),
                          new Color([r, g, b, 0.7]));
                        var graphic = new Graphic(webMercatorUtils.geographicToWebMercator(this.myGeometry), symbol, { "id": this.locationConnection.connection.id, "Address": "" });
                        this.map.graphics.clear();
                        this.map.graphics.add(graphic);
                        this._updateHeaderText();

                        this.locationConnection.invoke('add', graphic.toJson());
                        this.locator.locationToAddress(this.myGeometry, 1000);

                        navigator.geolocation.watchPosition(lang.hitch(this, this._watchPositionSuccess));
                    }

                    this.map.graphics.on('mouse-over', lang.hitch(this, function (overEvt) {
                        var addressText = overEvt.graphic.attributes["Address"];
                        if (addressText) dom.byId("addressText").innerHTML = '<i class="fa fa-thumb-tack"></i> ' + addressText

                        if (overEvt.graphic.attributes["id"] === this.locationConnection.connection.id) return;

                        var polyline = new Polyline(new SpatialReference({ wkid: 4326 }));

                        try {
                            polyline.addPath([this.myGeometry, webMercatorUtils.webMercatorToGeographic(overEvt.graphic.geometry)]);
                        }
                        catch (ex) {
                            polyline.addPath([this.myGeometry, webMercatorUtils.webMercatorToGeographic(overEvt.mapPoint)]);
                        }// evt.graphic.geometry was throwing an error for some reason

                        var graphic = new Graphic(geodesicUtils.geodesicDensify(polyline, 10000), this.lineSymbol);
                        this.graphicsLayer.add(graphic);

                        var lengths = geodesicUtils.geodesicLengths([polyline], units.KILOMETERS);
                        dom.byId("distanceText").innerHTML = '<i class="fa fa-info-circle"></i> ' +
                            parseFloat(lengths).toFixed(2) + 'km from your current location';
                    }));

                    this.map.graphics.on('mouse-out', lang.hitch(this, function (outEvt) {
                        dom.byId("addressText").innerHTML = '';
                        dom.byId("distanceText").innerHTML = '';
                        this.graphicsLayer.clear();
                    }));

                    this.locator.on('error', function (error) {
                        console.log(error)
                    });

                    this.locator.on('location-to-address-complete', lang.hitch(this, function (candidate) {

                        if (!candidate.address) return;

                        var item = this.getMyGraphic(null);
                        item.attributes["Address"] = candidate.address.address.Address;
                        this.locationConnection.invoke('Update', this.locationConnection.connection.id, item.toJson());
                    }));
                }));
            }
        });
    });
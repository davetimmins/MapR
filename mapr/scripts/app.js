var appR;
(function () {
    'use strict';

    require({
        async: true,
        parseOnLoad: true,
        packages: [
        {
            name: 'app',
            location: '/scripts/app',
        }
    });

    require(['app/mapr', 'esri/graphic', 'esri/geometry/Point', 'dojo/on', 'dojo/_base/lang'], function (mapr, Graphic, Point, on) {

        var connection = $.hubConnection();
        var locationConnection = connection.createHubProxy('locationHub');

        locationConnection.on('addGraphic', function (json) {
            appR.addGraphic(new Graphic(json));
        });

        locationConnection.on('updateGraphic', function (id, graphic) {
            appR.updateGraphic(id, graphic);
        });

        locationConnection.on('leave', function (id) {
            appR.removeGraphic(id);
        });

        connection.start({ transport: ['serverSentEvents', 'webSockets', 'longPolling'] })
            .done(function () {
                //Check if browser supports W3C Geolocation API
                if ("geolocation" in navigator) {
                    navigator.geolocation.getCurrentPosition(function (position){
                        appR = new mapr(
                            {
                                myGeometry: new Point(position.coords.longitude, position.coords.latitude),
                                locationConnection: locationConnection
                            });
                    });
                }
            })
            .fail(function () {
                console.log('Could not connect');
            });
    });
}).call(this);
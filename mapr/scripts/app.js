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

    require(['app/mapr', 'esri/graphic', 'dojo/on', 'dojo/_base/lang'], function (mapr, Graphic, on, lang) {

        var connection = $.hubConnection();
        var locationConnection = connection.createHubProxy('locationHub');

        locationConnection.on('addGraphic', function (id, json) {
            appR.addGraphic(new Graphic(json));
        });

        locationConnection.on('updateGraphic', function (id, graphic) {
            appR.updateGraphic(id, graphic);
        });

        locationConnection.on('leave', function (id) {
            appR.removeGraphic(id);
        });

        connection.start()
            .done(function () {
                //Check if browser supports W3C Geolocation API
                if (navigator.geolocation) {
                    appR = new mapr({ locationConnection: locationConnection });
                    navigator.geolocation.getCurrentPosition(lang.hitch(appR, appR.showCurrentPosition));
                }
            })
            .fail(function () {
                console.log('Could not connect');
            });
    });
}).call(this);
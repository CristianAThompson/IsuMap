"use strict";
let Model = function() {
    "use strict";
    let self = this;
    self.place = ko.observableArray();//holds the places
    self.markers = ko.observableArray();//holds the markers
    self.shown = ko.observableArray();//holds the visible places
};//shown and markers should be the same length
let model = new Model();
let ViewModel = function() {
    "use strict";
    let self = this;
    let infoWindow;
    self.map = new google.maps.Map(document.getElementById('map'), {});//makes a new google map
    self.typed = ko.observable("");//holds the typed value in the search box
    self.list = ko.observableArray();//list these in the list view
    self.init = function() {
        self.getLoc();
        //self.pos will be the pos while model.shown should be the visible place
    };
    self.getLoc = function() {
        navigator.geolocation.getCurrentPosition(self.makeMarkers);//get user's location
    };
    self.makeMarkers = function(pos) {
        self.map.setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });//set the center of the map
        $.ajax({//gets data from the foursquare api regarding places near the user's location
            type: "GET",
            url: "https://api.foursquare.com/v2/venues/explore?ll=" + pos.coords.latitude + "," + pos.coords.longitude + "&client_id=JXT5UDU55NGTZEKRTFHYQ1VHDEZG2QEPGSBU3OKC4KIEO0RF&client_secret=GQQVHCUA125JOV0GTFV4AMNOIMB0PZUQISEV402XPZWTO0NF&v=20160613&radious = 2000",
            success: function(data) {
                let places = data.response.groups[0].items;
                for (let i = 0; i < places.length; i++) {
                    model.place().push(places[i]);//sends the data to the model in the place array
                }
                console.log(model.place());
                self.checkVisible();//calls checkVisible which checks if the places match the typed value in the search box
            }
        });
    };
    self.updateCheck = self.typed.subscribe(function(){
        self.checkVisible();
    })
    self.checkVisible = function() {
        if (self.typed() == "") {//if nothing is typed
            model.shown(model.place());//all the markers are shown
        } else {//if there is something in the search box
            model.shown(_.filter(model.place(), function(obj) {
                let name = obj.venue.name;
                return name.indexOf(self.typed()) != -1;
            }))//shown will be an array of all the possible places
        }
        if (model.shown().length == 0) {//if the user inputed gibberish in the search box, hence if there is no match
            model.shown(model.place());//all the markers are shown
            console.log("no match was found");
        }
        self.deploy();//deploy the markers
    };
    self.deploy = function() {
        let bounds = new google.maps.LatLngBounds();//to control the zoom and the "bounds" of the map
        //courtesy of http://stackoverflow.com/questions/19304574/center-set-zoom-of-map-to-cover-all-visible-place
        if(model.markers().length > 0) {
            for (let i = 0; i < model.markers().length; i++) {
                model.markers()[i].setMap(null);//first don't show any markers on the map
            }
        }
        if (model.markers().length < model.shown().length) {
            model.markers([]);//clear markers
            for (let i = 0; i < model.shown().length; i++) {//for every specified seeable marker
                let obj = model.shown()[i];
                let marker = new google.maps.Marker({
                    position: { lat: obj.venue.location.lat, lng: obj.venue.location.lng },
                    title: obj.venue.name,
                    map: self.map
                });
                model.markers().push(marker);//create markers and send them to markers
                bounds.extend(marker.getPosition());//extend the bounds accordingly
            }
        } else {
            for (let i = 0; i < model.markers().length; i++) {
                let markerName = model.markers()[i].getTitle();
                for (let j = 0; j < model.shown().length; j++) {//should be the same length
                    if (markerName == model.shown()[j].venue.name) {//for every marker, iterate over model.shown() and see if they match
                        model.markers()[i].setMap(self.map);//for those that match make them visible in the map
                        bounds.extend(model.markers()[i].getPosition());//extend the bound accordingly
                    }
                }
            }
        }
        for(let i = 0; i < model.markers().length; i++) {
            self.list().push(model.markers()[i].getTitle());//send the names to list view
            infoWindow = new google.maps.InfoWindow({
                    content: '<div>' + model.markers()[i].getTitle() + '</div>'
            });
            model.markers()[i].addListener('click', (function(dog) {//add an info window to each element
              return function() {
                infoWindow.open(self.map, dog);//problem: Uncaught TypeError: Cannot read property 'apply' of undefined whenever I want a infoWindow reopened
              }
            })(model.markers()[i]));
            //infoWindow.close(); if all the opend markers are annoying
        }

        self.map.setCenter(bounds.getCenter());
        self.map.fitBounds(bounds);
    }
};


function initMap() {
    let vm = new ViewModel();
    vm.init();
    ko.applyBindings(vm);
}

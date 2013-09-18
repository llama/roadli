var G_API_KEY = 'AIzaSyBFp14Fv8ZVBJe7nrdRXcnGnTA-4WpcjX8';
var ADSENSE_PUBLISHER_ID = 'pub-1528594420112252';
var GMAPS_VISUAL_REFRESH = true;
var DISTANCE_FROM_RT = 4; // km
var boxes = null;
var placemarkers = {};
var selectedplaceinfo;
var ginfowindow;
var $is_mobile;

calcRoute = function(viaplace,vianame) {

  // if (!document.getElementById('from-place')) return;
  var start = document.getElementById('from-place').value;
  var end = document.getElementById('to-place').value;

  if (!start || !end) return;

 
  console.log('calcing route');


  var waypts = [];

  if (start) updateQueryStringParameter('start',start);
  if (end) updateQueryStringParameter('end',end);

  if (viaplace) {
    waypts.push({location:viaplace,stopover:true});
  };

  var dest = end;
  if (viaplace) {
    dest = vianame + ', '+viaplace + ' to:' + dest;
  }

  window._gaq.push(['_trackEvent','CalcRoute','','']);
  var link = 'https://maps.google.com/maps?saddr=' + encodeURIComponent(start) + '&daddr=' + encodeURIComponent(dest);
  
  var request = {
    origin: start,
    destination: end,
    waypoints: waypts,
    optimizeWaypoints: false, // allow reordering
    travelMode: google.maps.TravelMode[Session.get('selected-tmode')]
  };
  directionsService.route(request, function(response, status) {
    // console.log(response,status);
    if (status == google.maps.DirectionsStatus.OK) {
      var route = response.routes[0];
      if (route.legs[0].distance.value > 300000) {
        alert('Roadli currently only supports trips shorter than 300 km');
        return;
      }

      Session.set('mapslink',link);
      directionsDisplay.setDirections(response);
      // var summaryPanel = document.getElementById('directions_panel');
      // summaryPanel.innerHTML = '';

      if (!viaplace) {
        console.log('new main route');
        Session.set('mainRoute',route);
        // Box the overview path of the first route
        var rboxer = new RouteBoxer();
        var path = route.overview_path;
        boxes = rboxer.box(path, DISTANCE_FROM_RT);
        // drawBoxes(boxes); // draw boxes for debug purposes
      }

      Session.set('currentRoute',route);

      // For each route leg, display summary information.
    //   for (var i = 0; i < route.legs.length; i++) {
    //     var routeSegment = i + 1;
    //     summaryPanel.innerHTML += '<b>Route Segment: ' + routeSegment + '</b><br>';
    //     summaryPanel.innerHTML += route.legs[i].start_address + ' to ';
    //     summaryPanel.innerHTML += route.legs[i].end_address + '<br>';
    //     summaryPanel.innerHTML += route.legs[i].distance.text + '<br><br>';
    //   }
  } else {
    console.error("DirectionsService failed with status: " + status);
  };
  });
};

getTimeForVia = function(place,timeTable) {
  var start = document.getElementById('from-place').value;
  var end = document.getElementById('to-place').value;

  var request = {
    origin: start,
    destination: end,
    optimizeWaypoints: false, // allow reordering
    travelMode: google.maps.TravelMode[Session.get('selected-tmode')]
  };
  if (place) {
    request.waypoints = [{location:place,stopover:true}]
  }

  var totalTime = 0;
  directionsService.route(request, function(response, status) {
    if (status == google.maps.DirectionsStatus.OK) {
      var route = response.routes[0];
      // For each leg, display summary information.
      for (var i = 0; i < route.legs.length; i++) {
        totalTime = totalTime + route.legs[i].duration.value;        
      }
      timeTable[place] = totalTime;
    } else {
      console.error("Time for via directions service fail with status: " + status);
    }
  });
};

Template.main.events({
  'click .tmode' : function() {
    Session.set('selected-tmode',this.constant);
    setTimeout(calcRoute,1000);
    Session.set('placeOptions',{});
    setTimeout(findPlaces,2000);
    window._gaq.push(['_trackEvent','ChangeMode',this.constant,'']);
  }
})

Template.route_table.events({
  'click .route-table tr' : function() {
    Session.set('selected-place',this.id);
    window._gaq.push(['_trackEvent','ClickRoute','','']);
  },
  'mouseenter .route-table tr' : function() {
    Session.set('hover-place',this.id);

  },
  'mouseleave .route-table' : function() {
    Session.set('hover-place',null);
  }
});

Deps.autorun(function() {
  if (!$is_mobile) {
    var hid = Session.get('hover-place');
    if (!hid || !placemarkers[hid]) return;
    var icon = placemarkers[hid].icon;
    icon.scaledSize = new google.maps.Size(45, 45);
    icon.anchor = new google.maps.Point(26, 44);
    placemarkers[hid].setIcon(icon);
    Deps.currentComputation.hid = hid;
    Deps.currentComputation.onInvalidate(function(c) {
      var icon = placemarkers[c.hid].icon;
      icon.scaledSize = new google.maps.Size(25,25);
      icon.anchor = new google.maps.Point(17,34);
      placemarkers[c.hid].setIcon(icon);
    });
  }
});

Deps.autorun(function() {
  var spid = Session.get('selected-place');

  if (spid) {
    // updateQueryStringParameter('selected',spid);
  } else if (getParameterByName('selected')) { // not sure why i need this
    // updateQueryStringParameter('selected','');
  }

  if (!spid || !google) {
    // direct route selected
    setTimeout(calcRoute,100);
    return;
  }
  var sp = Session.get('placeOptions')[spid];

  if (selectedplaceinfo) selectedplaceinfo.close();
  selectedplaceinfo = new google.maps.InfoWindow();
  selectedplaceinfo.setContent('<div><strong>' + sp.name + '</strong><br>' + sp.vicinity);
  selectedplaceinfo.open(map, placemarkers[sp.id]);

  calcRoute(sp.vicinity,sp.name);
})

Template.route_table.maybe_selected = function() {
  if (Session.equals('selected-place',this.id)) {
    return 'selected';
  } else if (Session.equals('hover-place',this.id)) {
    return 'hover';
  }
  return '';
}

Handlebars.registerHelper('human_time', function(secs) {
  return secsToStr(secs);
});


Template.route_table.link = function() {
  return Session.get('mapslink');
};

Template.main.place_selected = function() {
  return Session.get('selected-place');
}

Template.main.travel_modes = [
  {image: 'tmodecar.png',constant:'DRIVING',alt:'Car',topmargin:0},
  {image: 'tmodebike.png',constant:'BICYCLING',alt:'Bike',topmargin:0},
  {image: 'tmodewalk.png',constant:'WALKING',alt:'Walking',topmargin:3}
  // {image: 'tmodebus.png',constant:'TRANSIT',alt:'Transit',topmargin:5}
];

Template.main.tmode_selected = function() {
  if (Session.equals('selected-tmode',this.constant)) {
    return 'selected';
  }
  return '';
}

Template.route_table.placeOptions = function() {
  var mr = Session.get('mainRoute');

  var result = [];
  var pdict = Session.get('placeOptions');

  if (!pdict) return;

  for (var key in pdict) {
    var l = pdict[key];
    if (l.durationTo && l.durationFrom) {
      l.totalTime = l.durationTo.value + l.durationFrom.value;
      l.timeAdded = l.totalTime - mr.legs[0].duration.value;
      result.push(pdict[key]); 
    };
  }
  result = result.sort(function(a,b) {return a.totalTime - b.totalTime});

  if (result.length == 0) return;

  var max_time = result[result.length-1].totalTime;

  mr.pctTrip = mr.legs[0].duration.value / max_time * 100;
  Session.set('mainRoute',mr);

  var rres = [];
  for (var i=0,p;p=result[i]; i++) {
    p.pctTrip = p.totalTime/max_time * 100;
    p.pctFirst = p.durationTo.value/p.totalTime * 100;
    p.pctSecond = p.durationFrom.value/p.totalTime * 100;
    rres.push(p);
  }

  return rres;
}

var mainRoute = function() {
  var mr = Session.get('mainRoute');
  if (!mr) return;
  mr.totalTimeText = mr.legs[0].duration.text;
  return mr;
}

Template.route_table.mainRoute = mainRoute;
Template.main.mainRoute = mainRoute;

Template.main.rendered = function() {
  $('h1').fitText();
  $('.instruct').fitText(4);
  $('.form input').fitText(2.5);
}

Meteor.startup( function() {
  var $is_mobile = false;
  if( $('#map-canvas').css('display') == 'none' ) {
      $is_mobile = true;      
  }

  Session.set('selected-tmode','DRIVING');
  console.log('starting up!');

  var s = getParameterByName('start');
  var e = getParameterByName('end');
  var v = getParameterByName('via');
  // var c = getParameterByName('selected');
  if (s) $('#from-place').val(s);
  if (e) {$('#to-place').val(e);setTimeout(calcRoute,1000);}
  if (v) {$('#via-place').val(v);setTimeout(findPlaces,2000);}
  // if (c) {Session.set('selected-place',c)};

  function loadScript() {
    var script = document.createElement("script");
    script.type = "text/javascript";
    script.src = 'http://maps.googleapis.com/maps/api/js?key='+G_API_KEY+'&sensor=false&callback=goog&libraries=places,adsense';
    document.body.appendChild(script);
  }
  window.onload = loadScript;
  Session.set('mapslink',null);
  Session.set('viaplace',null);
  if (!s) $('#from-place').focus();
  
  $('.form a').fitText();

  if (!Session.get('udat')) {
    $.getJSON('http://ip-api.com/json/?callback=?', // NEED NEW SOLUTION for ssl httbin?
      function(data){
        console.log(data)
        Session.set('udat',data);
      });
  }



  $('#from-place').blur(function() {
    // calcRoute(null);
    // setTimeout(findPlaces,100);
  })

  $('#to-place').blur(function() {
    calcRoute(null);
    // setTimeout(findPlaces,100);
  })

  $('#via-place').blur(function() {
    // calcRoute(null);
    setTimeout(findPlaces,100);
  })

  $('#via-place').bind('keypress', function(e) {
    var code = (e.keyCode ? e.keyCode : e.which);
    if (code == 13) {
      hideAndroidKeyboard($(this));
      setTimeout(findPlaces,100); // on enter
    }
  });



});

directionsDisplay = null;
directionsService = null;
map = null;
acs = [];

goog = function() {
  initRB();
  google.maps.visualRefresh = GMAPS_VISUAL_REFRESH;
  directionsService = new google.maps.DirectionsService();
  directionsDisplay = new google.maps.DirectionsRenderer();
  directionsDisplay.setOptions({suppressMarkers:false});


  setTimeout(function() {
    if (typeof google.loader !== 'undefined' && typeof google.loader.ClientLocation !== 'undefined') {
      var center = new google.maps.LatLng(google.loader.ClientLocation.latitude, google.loader.ClientLocation.longitude);
      map.setCenter(center);
    };
  },700);

  var mapOptions = {
    zoom: 10,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    center: new google.maps.LatLng(41.850033, -87.6500523) // chicago
  };
  map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);

  // ads
  var adUnitDiv = document.createElement('div');
  var adUnitOptions = {
    format: google.maps.adsense.AdFormat.WIDE_SKYSCRAPER,
    position: google.maps.ControlPosition.RIGHT_TOP,
    backgroundColor: '#f5f5f5',
    borderColor: '#cccccc',
    titleColor: '#1155cc',
    textColor: '#333333',
    urlColor: '#009900',
    map: map,
    visible: true,
    publisherId: ADSENSE_PUBLISHER_ID
  }
  adUnit = new google.maps.adsense.AdUnit(adUnitDiv, adUnitOptions);
  // / ads

  // Deps.autorun(function() {
  //   var data = Session.get('udat');
  //   // disabled cause clientlocation
  //   // console.log(data);
  //   if (data && data.lon && data.lat) map.setCenter(new google.maps.LatLng(parseFloat(data.lat), parseFloat(data.lon)));
  // });

  directionsDisplay.setMap(map);
  ginfowindow = new google.maps.InfoWindow();

  var addAutocompleteToInput = function(input) {
    autoSelectOnTab(input);
    var ac = new google.maps.places.Autocomplete(input);
    acs.push(ac);

    ac.bindTo('bounds', map);
    // ac.infowindow = new google.maps.InfoWindow();
    // ac.marker = new google.maps.Marker({
    //   map: map,
    //   anchorPoint: new google.maps.Point(0,-33)
    // });

    google.maps.event.addListener(ac, 'place_changed', function() {
      // ac.infowindow.close();
      // ac.marker.setVisible(false);
      input.className = '';
      ac.place = ac.getPlace();
      if (!ac.place.geometry) {
        // Inform the user that the place was not found and return.
        input.className = 'notfound';
        return;
      }

      // If the place has a geometry, then present it on a map.
      if (ac.place.geometry.viewport) {
        map.fitBounds(ac.place.geometry.viewport);
      } else {
        map.setCenter(ac.place.geometry.location);
        map.setZoom(17);  // Why 17? Because it looks good.
      }
      // ac.marker.setIcon(/** @type {google.maps.Icon} */({
      //   url: 'http://maps.gstatic.com/mapfiles/place_api/icons/geocode-71.png', //ac.place.icon,
      //   size: new google.maps.Size(71, 71),
      //   origin: new google.maps.Point(0, 0),
      //   anchor: new google.maps.Point(17, 34),
      //   // anchor: new google.maps.Point(34, 34),
      //   scaledSize: new google.maps.Size(35, 35)
      // }));

      // ac.marker.setPosition(ac.place.geometry.location);
      // ac.marker.setVisible(true);

      // var address = '';
      // if (ac.place.address_components) {
      //   address = [
      //   (ac.place.address_components[0] && ac.place.address_components[0].short_name || ''),
      //   (ac.place.address_components[1] && ac.place.address_components[1].short_name || ''),
      //   (ac.place.address_components[2] && ac.place.address_components[2].short_name || '')
      //   ].join(' ');
      // }

      // ginfowindow.setContent('<div><strong>' + ac.place.name + '</strong><br>' + address);
      // ginfowindow.open(map, ac.place);
      calcRoute(null);
      if (document.getElementById('via-place').value != '') setTimeout(findPlaces,1000);
    });
};

addAutocompleteToInput(document.getElementById('from-place'));
addAutocompleteToInput(document.getElementById('to-place'));


  // setup VIA autocomplete (currently disabled) 
  // var input = (document.getElementById('via-place')); 
  // autoSelectOnTab(input);
  // var searchBox = new google.maps.places.SearchBox(input);
  // searchBox.setTypes(['establishment']);

  // // called whenever user SELECTS a VIA place
  // google.maps.event.addListener(searchBox, 'places_changed', function() {
  //   console.log('places_changed');
  //   findPlaces();
  // });

  // google.maps.event.addListener(map, 'bounds_changed', function() {
  //   var bounds = map.getBounds();
  //   searchBox.setBounds(bounds);
  // });

};


findPlaces = function() {

  var start = document.getElementById('from-place').value;
  var end = document.getElementById('to-place').value;
  var viaplace = document.getElementById('via-place').value;

  if (!viaplace || !start || !end) return;

  // debounce
  if (viaplace == Session.get('oldfindviaplace') && start == Session.get('oldfindstart') && end == Session.get('oldfindend') && Session.get('selected-tmode') == Session.get('oldtmode')) return;
  Session.set('oldfindstart',start);
  Session.set('oldfindend',end);
  Session.set('oldfindviaplace',viaplace);
  Session.set('oldtmode',Session.get('selected-tmode'));

  updateQueryStringParameter('via',viaplace);

  /*  Clear old places from map. For the current from-place, to-place, via-place, find places along route.  */

  // clear all old markers
  for (var m in placemarkers) {
    placemarkers[m].setMap(null);
  }
  placemarkers = {};

  Session.set('placeOptions',{});

  if (!boxes) return;  

  for (var i = 0; i < boxes.length; i++) {
    var request = {
      bounds: boxes[i],
      keyword: viaplace
        // types: ['store']
    };

    service = new google.maps.places.PlacesService(map);
    service.nearbySearch(request, function(results, status) {
      if (status == google.maps.places.PlacesServiceStatus.OK) {

      results = results.splice(0,25); // truncate at 25 results per box

      var places = Session.get('placeOptions');
      for (var i=0,result;result=results[i];i++) {
        if (places[result.id] == null) {
          places[result.id] = result;

          // draw marker
          var image = {
            // url: result.icon,
            url: 'http://maps.gstatic.com/mapfiles/place_api/icons/generic_business-71.png',
            size: new google.maps.Size(71, 71),
            origin: new google.maps.Point(0, 0),
            anchor: new google.maps.Point(17, 34),
            scaledSize: new google.maps.Size(25, 25)
          };

          var marker = new google.maps.Marker({
            map: map,
            icon: image,
            title: result.name,
            position: result.geometry.location,
            anchorPoint: new google.maps.Point(0,-25)
          });

          var clickForId = function(pid) {
            return function() {
              Session.set('selected-place',pid);
              setTimeout(function(){$('.route-table').scrollTo('.selected')},250);
            };
          };

          var hoverForId = function(pid) {
            return function() {
              Session.set('hover-place',pid);
            };
          };

          google.maps.event.addListener(marker, 'click', clickForId(result.id));
          google.maps.event.addListener(marker, 'mouseover', hoverForId(result.id));
          google.maps.event.addListener(marker, 'mouseout', function() {Session.set('hover-place',null)});

          marker.pid = result.id;
          placemarkers[result.id] = marker;
          // result.mmarker = marker;
        }
      }
      Session.set('placeOptions',places);

      var ids = [];
      var placeLocs = [];
      for (var i=0,place; place=results[i];i++) {
        placeLocs.push(place.geometry.location);
        ids.push(place.id);
      };
      var service = new google.maps.DistanceMatrixService();
      service.getDistanceMatrix(
      {
        origins: [document.getElementById('from-place').value],
        destinations: placeLocs,
        travelMode: google.maps.TravelMode[Session.get('selected-tmode')],
          // unitSystem: google.maps.UnitSystem.IMPERIAL,
          // durationInTraffic: Boolean, // available to maps for business only
          // avoidHighways: false,
          // avoidTolls: false
        }, distanceMatrixCallback(ids,'To'));
      service.getDistanceMatrix(
      {
        destinations: [document.getElementById('to-place').value],
        origins: placeLocs,
        travelMode: google.maps.TravelMode[Session.get('selected-tmode')],
          // unitSystem: google.maps.UnitSystem.IMPERIAL,
          // durationInTraffic: Boolean, // available to maps for business only
          // avoidHighways: false,
          // avoidTolls: false
        },distanceMatrixCallback(ids,'From'));
    } else {
      if (status == "ZERO_RESULTS") return;
      console.error('NearbySearch failed with status: ' + status);
    };
  });
};
};



var distanceMatrixCallback = function(ids,propsToSet) {
  return function(response, status) {
    // console.log('DM RESPONSE:' + JSON.stringify(response));
    // console.log('DM STATUS:' + JSON.stringify(status));

    var placeDict = Session.get('placeOptions');

    if (status !== 'OK') {
      console.error('Distance Matrix Status: ' + status);
      return;
    };
    // fingers crossed order hasnt changed
    for (var i=0,placeid;placeid=ids[i];i++) {
      var el;
      if (propsToSet == 'To') {
        el = response.rows[0].elements[i];
      } else {
        el = response.rows[i].elements[0];
      }
      if (el.status != 'OK') {
        console.error('Distance Matrix Element Status: ' + el.status);
        continue;
      };
      placeDict[placeid]['duration'+propsToSet] = el.duration; // eww, w/e, so this sets either "place.durationTo" or "place.durationFrom"
      placeDict[placeid]['distance'+propsToSet] = el.distance;
    };
    Session.set('placeOptions',placeDict);
  }
};


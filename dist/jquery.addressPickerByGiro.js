/*! * jQuery Address Picker ByGiro v0.0.7 * * Copyright 2015, G. Tomaselli * Licensed under the MIT license. * */ // compatibility for jQuery / jqLitevar bg = bg || false;if(!bg){	if(typeof jQuery != 'undefined'){		bg = jQuery;	} else if(typeof angular != 'undefined'){		bg = angular.element;		bg.extend = angular.extend;	}};(function ($) {    "use strict";    var methods;	var timer = {};	function delay (callback, ms, type){		clearTimeout (timer[type]);		timer[type] = setTimeout(callback, ms);	}		function updateElements(data){					var that = this, data = data || this.addressMapping[this.$element.val()],$sel, resetTask = false;		if(!data) resetTask = true;				for ( var k in this.settings.boundElements) {			var dataProp = this.settings.boundElements[k];						var newValue = '';			if(typeof dataProp == 'function'){				newValue = dataProp.call(that,data);								continue;			}			$sel = $(dataProp);			if(!resetTask && ($(dataProp).length < 0 || !data.cleanData)) continue;						if(!resetTask){								if(k == 'address_components'){					newValue = JSON.stringify(data.cleanData);				} else {					newValue = data.cleanData[k];								}			}							var listCount = $sel.length;			for ( var i = 0; i < listCount; i ++){				var method = 'val',				it = $sel.eq(i);				if(!it.is('input, select, textarea')){					method = 'text';				};				it[method](newValue || '');			}		}		if(!resetTask) that.$element.triggerHandler('selected.addressPickerByGiro', data);			}		function createMarker(){		var that = this, mapOptions = $.extend({}, that.settings.mapOptions);		mapOptions.center = new google.maps.LatLng(mapOptions.center[0], mapOptions.center[1]);				var markerOptions = {			position: mapOptions.center,			draggable: true,			raiseOnDrag: true,			map: that.gmap,			labelContent: that.settings.text.you_are_here,			labelAnchor: new google.maps.Point(0, 0),			labelClass: that.settings.markerLabelClass,			labelStyle: {				opacity: 1			}		};				// marker		if (that.settings.markerType == 'styled' && typeof StyledMarker == "function"){			// styled marker			var styleIcon = new StyledIcon(StyledIconTypes.BUBBLE,{color:"#51A351",fore:'#ffffff',text:that.settings.text.you_are_here});			markerOptions.styleIcon = styleIcon;							that.gmarker = new StyledMarker(markerOptions);						} else if (that.settings.markerType == 'labeled' && typeof MarkerWithLabel == "function"){			// labeled marker			that.gmarker = new MarkerWithLabel(markerOptions);		} else {			// default marker			that.gmarker = new google.maps.Marker(markerOptions);		}								// event triggered when marker is dragged and dropped		google.maps.event.addListener(that.gmarker, "dragend", function () {			that.geocodeLookup(that.gmarker.getPosition(), false, "latLng", true);		});		// event triggered when map is clicked		google.maps.event.addListener(that.gmap, "click", function (event) {			that.gmarker.setPosition(event.latLng);			that.geocodeLookup(event.latLng, false, "latLng", true);			that.resizeMap();		});						this.gmarker.setVisible(false);	}		function createCircle(){				var that = this,radius,		mapOptions = $.extend({}, that.settings.mapOptions);				mapOptions.center = new google.maps.LatLng(mapOptions.center[0], mapOptions.center[1]);				if(radius){			radius = radius * 1000; // Km -> m		}				radius = radius || that.settings.distanceWidgetRadius;		var circle =  new google.maps.Circle({			center: mapOptions.center,			radius: radius, // Km			strokeColor: "#005DE0",			strokeOpacity: 0.8,			strokeWeight: 2,			fillColor: "#005DE0",			fillOpacity: 0.25,			map: that.gmap		}),		handleMouseEnter = function ( event ) {			circle.setEditable( true );		},		handleMouseLeave = function ( event ) {			circle.setEditable( false );		};						that.gcircle = circle;		that.gcircle.setVisible(false);					google.maps.event.addListener(that.gcircle, 'radius_changed', function(){			that.updater();		});		google.maps.event.addListener( that.gcircle, 'mouseover', handleMouseEnter );		google.maps.event.addListener( that.gcircle, 'mouseout' , handleMouseLeave );				// bind circle to marker dragging		that.gcircle.bindTo('center', that.gmarker, 'position');	}		    methods = {        init: function ($element, options) {            var that = this;            that.$element = $element;            that.settings = $.extend({}, {				style: "hidden", // if "hidden" the map will be shown when the user touch the input field                map: false,                mapId: false,				mapWidth: '100%',				mapHeight: '300px',                mapOptions: {                    zoom: 3,                    center: [51.751724, -1.255284],                    scrollwheel: false,                    mapTypeId: "roadmap"                },				makerType: false, /* labeled, styled */				distanceWidget: false,				distanceWidgetRadius: 30000,  /* meters */                appendToAddressString: '',                geocoderOptions: {					language: "en"                },                typeaheadOptions: {                    source: that.source,                    updater: that.updater,                    matcher: function(){return true;}                },                boundElements: {},								// internationalization				text: {					you_are_here: "You are here!",				},				map_rendered: false,            }, options);						for(var key in that.settings.typeaheadOptions){				var method = that.settings.typeaheadOptions[key];                if (typeof method == 'function') {                    that.settings.typeaheadOptions[key] = method.bind(that);                }							}            // hash to store geocoder results keyed by address            that.addressMapping = {};            that.currentItem = '';            that.geocoder = new google.maps.Geocoder();            that.initMap.apply(that, undefined);			if(typeof that.$element.typeahead == 'function'){				that.$element					.attr('autocomplete', 'off')					.typeahead(that.settings.typeaheadOptions);			}			that.$element.on('focusin',function(){				if(that.settings.style == 'hidden'){					that.$mapContainer.show();				}				that.resizeMap();			}).on('focusout',function(){				if(that.settings.style == 'hidden'){					that.geocodeLookup(that.$element.val(), false, '', true);					that.$mapContainer.hide();				}			});						// load current address if any			if(that.$element.val() != ''){				that.geocodeLookup(that.$element.val(), false, '', true);			}        },        initMap: function () {			var that = this;            if (!that.settings.mapId && !(that.settings.map instanceof google.maps.Map)){                // create map and hide it				that.settings.mapId = (new Date).getTime() + Math.floor((Math.random() * 9999999) + 1);				that.$mapContainer = $('<div style="margin: 5px 0; width: '+ that.settings.mapWidth +'; height: '+ that.settings.mapHeight +';" id="'+ that.settings.mapId +'"></div>');				that.$element.after(that.$mapContainer);            } else {				that.$mapContainer = $(that.settings.mapId);			}						if(that.settings.style == 'hidden'){				that.$mapContainer.hide();			}			            if (that.map_rendered == true) {                that.resizeMap.call(that);                return;            }			            var mapOptions = $.extend({}, that.settings.mapOptions),                baseQueryParts, markerOptions;			if(!(this.settings.map instanceof google.maps.Map)){				mapOptions.center = new google.maps.LatLng(mapOptions.center[0], mapOptions.center[1]);				this.gmap = new google.maps.Map(that.$mapContainer[0], mapOptions);			} else {				this.gmap = this.settings.map;			}						// create marker			createMarker.call(this);			// create circle			if (this.settings.distanceWidget){				createCircle.call(this);			}						that.map_rendered = true;        },        source: function (query, process) {            var labels, that = this;						var sourceFunction = function(resolve, reject){								delay(function(){					that.geocodeLookup(query, function (geocoderResults){						that.addressMapping = {};						labels = [];												var listCount = geocoderResults.length;						for ( var i = 0; (i < listCount && i<9); i ++){ // limit to max 9 suggestions							var element = geocoderResults[i];							that.addressMapping[element.formatted_address] = element;							labels.push(element.formatted_address);													}						if(typeof resolve == 'function') resolve(labels);						if(typeof process == 'function'){							return process(labels);						}					});				}, 250, 'source');			};						if(window.Promise){				return new Promise(sourceFunction);			} else {				sourceFunction();			}			        },        updater: function (item) {            var that = this, item = item || that.$element.val(),			data = this.addressMapping[item] || {},			propertiesMap,cleanData = {},latLng = data.geometry.location;            if (!data) {                return;            }						// cleanData			propertiesMap = {				'country': {					'long_name': 'country',					'short_name': 'country_code'				},				'administrative_area_level_1': {					'long_name': 'region',					'short_name': 'region_code'				},				'administrative_area_level_2': {					'long_name': 'county',					'short_name': 'county_code'				},				'locality': {					'long_name': 'city'				},				'sublocality': {					'long_name': 'city_district'				},				'postal_code': {					'long_name': 'zip'				},				'route': {					'long_name': 'street'				},				'street_number': {					'long_name': 'street_number'				}			};					if(data.address_components){				for(var a=0;a<data.address_components.length;a++){					var adr = data.address_components[a];					for(var p in propertiesMap){						if(adr.types.indexOf(p) >= 0){							for(var pp in propertiesMap[p]){								if(typeof adr[pp] != 'undefined'){									cleanData[propertiesMap[p][pp]] = adr[pp];								}															}						}					}				}			}			cleanData.latitude = Number(latLng.lat().toFixed(8));			cleanData.longitude = Number(latLng.lng().toFixed(8));			cleanData.formatted_address = data.formatted_address;            if (that.gmarker) {                that.gmarker.setPosition(data.geometry.location);                that.gmarker.setVisible(true);            }						if(that.gcircle){				that.gcircle.setCenter(data.geometry.location);				that.gcircle.setVisible(true);				cleanData.radius = Math.round(that.gcircle.getRadius()) / 1000;			}			if(that.gcircle){								that.gmap.fitBounds(that.gcircle.getBounds());			} else {				that.gmap.fitBounds(data.geometry.viewport);			}			data.cleanData = cleanData;			updateElements.call(that,data);            return item;        },        currentAddress: function () {            return this.addressMapping[this.$element.val()] || {};        },        geocodeLookup: function (query, callback, type, updateUi) {			updateUi = updateUi || false;			type = type || '';			var that=this,request = $.extend({},that.settings.geocoderOptions);						// immediately reset the input if we are going to perform a geocode lookup			if(updateUi){				// clean previous data				updateElements.call(that);			}										if(type == 'latLng'){				if (typeof query == "string") {					query = query.split(",");					query = new google.maps.LatLng(query[0], query[1]);				}				request.latLng = query;			} else {				request.address = query + that.settings.appendToAddressString;								// if we already have the address, we don't need to call google				if(typeof callback == 'function' && typeof that.addressMapping[query] != 'undefined'){					if(updateUi){						that.updater(query);					}										return;				}							}			            this.geocoder.geocode(request, function (geocoderResults, status) {                if(status !== google.maps.GeocoderStatus.OK) return;								if (typeof callback == 'function') {                    callback.call(that, geocoderResults);                }								if(updateUi){					var address = geocoderResults[0].formatted_address;					that.$element.val(address);					that.addressMapping[address] = geocoderResults[0];					that.updater(address);				}            });        },        resizeMap: function (latitude, longitude) {			var that = this;			delay(function(){				var lastCenter, map_cont = that.$mapContainer ? that.$mapContainer.parent() : $("#" + that.settings.mapId).parent();								if(!map_cont.length) return;								var parent_map_cont = map_cont.parent(),				h = parent_map_cont.height(),				w = parent_map_cont.width();								//map_cont.css("height", h);				//map_cont.css("width", w);				if (typeof latitude != "undefined" && typeof longitude != "undefined") {						lastCenter = new google.maps.LatLng(latitude, longitude);					} else {						lastCenter = that.gmap.getCenter();				}									google.maps.event.trigger(that.gmap, "resize");				that.gmap.setCenter(lastCenter);			},300,'resize');			        },		setRadius: function(radius){ // in km			var that = this;			if(!that.gcircle) return;						that.gcircle.setRadius(radius *1000);			that.gmap.fitBounds(that.gcircle.getBounds());		}    };    var main = function (method) {        var addressPickerByGiro = this.data('addressPickerByGiro');        if (addressPickerByGiro) {            if (typeof method === 'string' && addressPickerByGiro[method]) {                return addressPickerByGiro[method].apply(addressPickerByGiro, Array.prototype.slice.call(arguments, 1));            }            return console.log('Method ' +  method + ' does not exist on jQuery.addressPickerByGiro');        } else {            if (!method || typeof method === 'object') {								var listCount = this.length;				for ( var i = 0; i < listCount; i ++) {					var $this = $(this[i]), addressPickerByGiro;                    addressPickerByGiro = $.extend({}, methods);                    addressPickerByGiro.init($this, method);                    $this.data('addressPickerByGiro', addressPickerByGiro);				};				return this;            }            return console.log('jQuery.addressPickerByGiro is not instantiated. Please call $("selector").addressPickerByGiro({options})');        }    };	// plugin integration	if($.fn){		$.fn.addressPickerByGiro = main;	} else {		$.prototype.addressPickerByGiro = main;	}}(bg));
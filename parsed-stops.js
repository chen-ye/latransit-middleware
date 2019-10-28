const loadArrivalTimes = function (stops) {
  var _arrivalTimes = [];
  var parsers = [
    { regex: /([\S\s]+)\s+to\s+([\S\s]+)\s+from\s+([\S\s]+)\s+like trip\s+([\S\s]+)/g, to: 2, from: 3 },
    { regex: /([\S\s]+)\s+to\s+([\S\s]+)\s+from\s+([\S\s]+)\s+via\s+([\S\s]+)/g, to: 2, from: 3 },
    { regex: /([\S\s]+)\s+to\s+([\S\s]+)\s+from\s+([\S\s]+)/g, to: 2, from: 3 },
    { regex: /([\S\s]+)\s+to\s+([\S\s]+)/g, to: 2, from: null },
  ];
  var regex_stop_id = /(\(\w+:\d+\))/;

  var currentTime = moment();

  return $q.all(stops.map(function (stop) {
    var _routes = {};
    // fill routes hash, with routes of all stops
    stop.routes.forEach(function (val, index) {
      if (!_routes[val.id]) {
        _routes[val.id] = val;
      }
    });
    var params = {
      omitNonPickups: 'true',
      numberOfDepartures: 3,
      startTime: currentTime.unix(),
      timeRange: 2700
    };
    return $http.get(baseUrl + 'routers/default/index/stops/' + stop.idOTP + '/stoptimes/', { params: params }).then(function (response) {
      var _times = [];
      var routeId, routeBits, patternId, patternSegments;
      var _patternTo, _patternFrom;
      response.data.forEach(function (item) {
        patternId = item.pattern.id;
        patternSegments = item.pattern.id.split(':');
        routeBits = patternSegments.slice(0, 2);
        routeId = routeBits.join(':');
        parsers.some(function (parser) {
          parser.regex.lastIndex = 0;
          if (item.pattern.desc.match(parser.regex) !== null) {
            var pattern_bits = parser.regex.exec(item.pattern.desc);
            if (parser.to) {
              _patternTo = pattern_bits[parser.to];
              _patternTo = _patternTo.replace(regex_stop_id, '').trim();
            }
            if (parser.from) {
              _patternFrom = pattern_bits[parser.from];
              _patternFrom = _patternFrom.replace(regex_stop_id, '').trim();
            }
            return true;
          } else {
            return false;
          }
        });
        // get alerts for the route of this arrival
        var match_alerts = [];
        var match_alerts_id = [];
        var cursor_alert, cursor_service;
        for (var i = 0; i < alerts.length; i++) {
          cursor_alert = alerts[i];
          for (var j = 0; j < cursor_alert.affected_services.services.length; j++) {
            cursor_service = cursor_alert.affected_services.services[j];
            if (cursor_service.route_id === routeBits[1] && match_alerts_id.indexOf(cursor_alert.alert_id) === -1) {
              match_alerts.push(cursor_alert);
              match_alerts_id.push(cursor_alert.alert_id);
            }
          }
        }

        item.times.forEach(function (_time) {
          var secondsToScheduleArrival = _time.serviceDay + _time.scheduledArrival - currentTime.unix();
          if (secondsToScheduleArrival >= 0 && secondsToScheduleArrival <= 2700 && _time.stopIndex + 1 < _time.stopCount) {
            _time.secondsToScheduleArrival = secondsToScheduleArrival;
            _time.scheduledArrivalTime = moment.unix(_time.serviceDay + _time.scheduledArrival);
            _time.to = _patternTo;
            _time.from = _patternFrom;
            _time.alerts = match_alerts;
            _time.route = _routes[routeId];
            _time.stop = stop;
            // append time to array of times
            _times.push(_time);
          }
        });

      })
      return _times;
    });
  }))
    .then(function (data) {
      data.forEach(function (item) {
        _arrivalTimes = _arrivalTimes.concat(item);
      });
      _arrivalTimes = _arrivalTimes.sort(function (a, b) {
        var delta = a.secondsToScheduleArrival - b.secondsToScheduleArrival;
        if (delta !== 0) {
          return delta;
        }
        if (a.route.id < b.route.id) {
          return -1;
        }
        if (a.route.id > b.route.id) {
          return 1
        }
        return 0;
      });
      _arrivalTimes = _arrivalTimes.map(function (item, index) {
        item.index = index;
        return item;
      });

      arrivalTimes = _arrivalTimes;
      return arrivalTimes;
    });
},
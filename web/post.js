var request = require("request");
var config = require('../config');
var GCMKey = config.GCMKey;

exports.gcmTopic = function(message, done) {
  var options = {
        method: 'POST',
        url: 'https://gcm-http.googleapis.com/gcm/send',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'key='+GCMKey
        },
        json: true
  };

  options.body = { 
        "to": "/topics/global",
        "data": { "message": JSON.stringify(message) }
  };

  // console.log(options);
  request(options, function(error, response, body){
    if (!error && response.statusCode == 200) {
        console.log(body);
        done(null);
    }
  });
}

exports.gcmTopic_t = function(req, res) {
  var options = {
        method: 'POST',
        url: 'https://gcm-http.googleapis.com/gcm/send',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'key='+GCMKey
        },
        json: true
  };

  options.body = { 
        "to": "/topics/global",
        "data": { "message": "topics from node.js" }
  };

  // console.log(options);
  request(options, function(error, response, body){
    if (!error && response.statusCode == 200) {
        console.log(body);
        res.end(JSON.stringify(body));
    }
  });
}
var request = require("request");
var config = require('../config');
var moment = require("moment");
var dbUser = config.dbUser;
var GCMKey = config.GCMKey;
var dbToday = config.dbToday;
var dbPosition = config.dbPosition;

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
        "data": { "message": 'In: ' + message['In'] +
                  '\nOut: ' + message['Out'] +
                  '\nUp: ' + message['Up'].join(' ') + 
                  '\nDown: ' + message['Down'].join(' ')
        } 
  };

  // console.log(options);
  request(options, function(error, response, body){
    if (!error && response.statusCode == 200) {
        console.log(body);
        done(null);
    }
  });
}

exports.nyTimes = function(req, res) {
  console.log('nyTimes ===============>');
  dbUser.user.find({fbId: req.params.fbId}, function(err, person) {
      if (person) {
        dbUser.user.update({
          fbId: req.params.fbId
        }, {
          $addToSet: {
            nyTimes: {
              headline: req.body['headline'],
              link: req.body['link'],
              picUrl: req.body['picUrl']
            }
          }
        }, function() {
          res.send({
            content: 'post nyTimes finished !!! '
          });
          res.end();
        });
      } else {
        res.end({
          content: 'user not exisit!'
        });
      }
  });
};

exports.register = function(req, res) {
   console.log('register ===============>' + req.params.fbId);
   dbUser.user.findOne({fbId: req.params.fbId}, function(err, person) {
      //console.log(person);
      if (person) {
        res.send({
          content: 'welcom again! ' + person['name']
        });
        res.end();
      } else {
        dbUser.user.insert({
          name: req.params.name,
          fbId: req.params.fbId
        }, function() {
          res.send({
            content: 'regist WorldMoviePro finished !!!'+req.params.name
          });
          res.end();
        });
      }
  });
};

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

  dbToday.today.findOne({'date': moment().format('l')}, function(err, doc) {
      var message = {
        'In': doc['inList'][0]['item'],
        'Out': doc['outList'][0]['item'],
        'Up': [],
        'Down': []
      }

      dbPosition.position.findOne({'date': moment().format('l')}, function(err, doc) {

          // message.Up = JSON.stringify(doc['upItem']);
          doc['upItem'].forEach(function(item, index) {
            console.log(item);
            var str = '【'+ item['position'] +'】'+ ' ' + item['title'] + '\n';
            message.Up.push(str);
          });

          doc['downItem'].forEach(function(item, index) {
            console.log(item);
            var str = '【'+ item['position'] +'】'+ ' ' + item['title'] + '\n';
            message.Down.push(str);
          });

          options.body = { 
                "to": "/topics/global",
                "data": { "message": 'In: ' + message['In'] +
                          '\nOut: ' + message['Out'] +
                          '\nUp: ' + message['Up'].join(' ') + 
                          '\nDown: ' + message['Down'].join(' ')
                }     
          };
        
          request(options, function(error, response, body){
            if (!error && response.statusCode == 200) {
                console.log(body);
                res.end(JSON.stringify(body));
            }
          });
      });
  }); 
};
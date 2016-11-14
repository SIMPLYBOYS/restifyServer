var request = require("request");
var config = require('../config');
var moment = require("moment");
var dbUser = config.dbUser;
var GCMKey = config.GCMKey;
var dbToday = config.dbToday;
var dbPosition = config.dbPosition;
var kue = require('kue');
var jobs = kue.createQueue();

exports.gcmTopic = function(message, done) {
  var options = {
        method: 'POST',
        url: 'https://fcm.googleapis.com/fcm/send',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'key='+GCMKey
        },
        json: true
  };

  options.body = { 
          "to": "/topics/global",
          "priority" : "normal",
          "notification" : {
          "body" : 'In: ' + message['In'] +
                   '\nOut: ' + message['Out'] +
                   '\nUp: ' + message['Up'].join(' ') +
                   '\nDown: ' + message['Down'].join(' '),
          "title" : "最新IMDB排名變動",
          "icon" : "new"
        },
        "data": { "message": 'In: ' + message['In'] +
                  '\nOut: ' + message['Out'] +
                  '\nUp: ' + message['Up'].join(' ') + 
                  '\nDown: ' + message['Down'].join(' ')
        } 
  };

  // console.log(options);
  request(options, function(error, response, body) {
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
              picUrl: req.body['picUrl'],
              timestamp: moment().subtract(10, 'days').calendar()
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

exports.movies = function(req, res) {
  dbUser.user.find({fbId: req.params.fbId}, function(err, person) {
      if (person) {
        dbUser.user.update({
          fbId: req.params.fbId
        }, {
          $addToSet: {
            movies: {
              title: req.body['title'],
              link: req.body['link'],
              picUrl: req.body['picUrl'],
              channel: req.body['channel'],
              timestamp: moment().subtract(10, 'days').calendar()
            }
          }
        }, function() {
          res.send({
            content: 'post movies finished !!! '
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

function newJob (name, fbId, dbUser) {
   var job = jobs.create('register_job', {
     name: name
   });
   
   job.on('complete', function() {
      console.log('Job', job.id, 'with name', job.data.name, 'is done');
   }).on('failed', function() {
      console.log('Job', job.id, 'with name', job.data.name, 'has failed');
   });

   dbUser.user.insert({
      name: name,
      fbId: fbId
   }, function(err, doc) {
      if (!err)
        job.save();
      else
        throw error();
   });
}

jobs.process('register_job', function (job, done){
  /* carry out all the job function here */
  done && done();
});

exports.register = function(req, res) {
   console.log('register ===============>' + req.params.fbId);
   dbUser.user.findOne({fbId: req.params.fbId}, function(err, person) {
      if (person) {
        res.send({
          content: 'welcom again! ' + person['name']
        });
        res.end();
      } else {
        newJob(req.params.name, req.params.fbId, dbUser);
        res.end();
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
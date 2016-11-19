var request = require("request");
var config = require('../config');
var moment = require("moment");
var dbUser = config.dbUser;

exports.nyTimes = function(req, res) {
  console.log('delete nyTimes ===============> ');
  dbUser.user.find({fbId: req.params.fbId}, function(err, person) {
      if (person) {
        dbUser.user.update({
          fbId: req.params.fbId
        }, {
          $pull: {
            nyTimes: {
              headline: req.params.headline
            }
          }
        }, function() {
          res.send({
            content: 'delete nyTimes finished !!! '
          });
          res.end();
        });
      } else {
        res.end({
          content: 'user not exisit!'
        });
      }
  });
}

exports.movies = function(req, res) {
  dbUser.user.find({fbId: req.params.fbId}, function(err, person) {
      if (person) {
        dbUser.user.update({
          fbId: req.params.fbId
        }, {
          $pull: {
            movies: {
              title: req.params.title.split('+').join(" ")
            }
          }
        }, function() {
          res.send({
            content: 'delete movies finished !!! '
          });
          res.end();
        });
      } else {
        res.end({
          content: 'user not exisit!'
        });
      }
  });
}


 

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

exports.trends = function(req, res) {
  dbUser.user.find({fbId: req.params.fbId}, function(err, person) {
      if (person) {
        dbUser.user.update({
          fbId: req.params.fbId
        }, {
          $pull: {
            trends: {
              title: req.params.title
            }
          }
        }, function() {
          res.send({
            content: 'delete trends finished !!! '
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


 

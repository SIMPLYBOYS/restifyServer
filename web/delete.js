var request = require("request");
var config = require('../config');
var moment = require("moment");
var dbUser = config.dbUser;

exports.nyTimes = function(req, res) {
  console.log('delete nyTimes ===============> ' + req.body['headline']);
  dbUser.user.find({fbId: req.params.fbId}, function(err, person) {
      if (person) {
        dbUser.user.update({
          fbId: req.params.fbId
        }, {
          $pull: {
            nyTimes: {
              headline: req.body['headline']
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


 

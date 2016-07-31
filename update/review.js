var config = require('../config');
var dbIMDB = config.dbIMDB;
var dbReview = config.dbReview;
var request = require("request");
var async = require('async');
var moment = require("moment");
var Updater = require('../update/Updater');
var updateMovies = [];

exports.updateReview = function() {
	console.log('updateReview ----->');
	async.series([
      function(callback) {
      	  dbIMDB.imdb.find({top: {$lte:250, $gte:1}}).sort({top:1}, function(err, docs) {
            for (var i=0; i<docs.length; i++) {
                updateMovies.push({
	            	title: docs[i]['title']
	            });
            }
            callback(null);
          });
      },
      function(callback) {
      	updateCastWizard(callback);
      }
  ],
  function(err, results) {
      console.log('updateCastReview finished!');
  });
};

function updateCastWizard(done) {
    if (!updateMovies.length) {
        done(null);
        return console.log('Done!!!!');
    }

    var item = updateMovies.pop();
    console.log('updateCastWizard');
    console.log(item);

    dbReview.reviews.findOne({title: item['title']}, function(err, doc) {
        if (doc) {
            console.log(that.title + ' has review in database!');
            updateCastWizard(done);
        } else {
            var updater = new Updater(item['title'], null, 'cast', null);
            console.log('Requests Left: ' + updateMovies.length);
            updater.on('error', function (error) {
              console.log(error);
              updateCastWizard(done);
            });

            updater.on('complete', function (listing) {
                console.log(listing + ' got complete!');
                updateCastWizard(done);
            });
        }
    });
}
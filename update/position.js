var config = require('../config');
var dbIMDB = config.dbIMDB;
var dbUpComing = config.dbUpComing;
var dbPosition = config.dbPosition;
var dbRecord = config.dbRecord;
var myapiToken = config.myapiToken;
var Updater = require('../update/Updater');
var Creater = require('../update/Creater');
var google = require('google');
var request = require("request");
var async = require('async');
var moment = require("moment");
var updateMovies = [];
var newMovies = []; // not in database before this time

exports.updatePosition = function() {
    
    dbPosition.position.find({date: moment().format('l')}, function(err, doc) {
        
        doc = doc[0];
        
        if (!doc)
            res.end('fail and finished!!');

        async.series([
          function (done) {
            console.log(doc);
            //type A 
            if (doc['newItem']) {
                doc['newItem'].forEach(function(item, index) {
                     newMovies.push({'title': item['title'].split('(')[0].trim(),
                        'position': item['position']
                     });
                })
                done(null);
            } else {
                done(null);
            }
          },
          function (done) {
            //type B
            if (doc['upItem']) {
                doc['upItem'].forEach(function(item, index) {
                    console.log(item['title'].split('(')[0].trim());
                    updateMovies.push({'title': item['title'].split('(')[0].trim(),
                        'position': item['position']
                    });
                })
                done(null);
            } else {
                done(null);
            }
          },
          function (done) {
            //type C
            if (doc['downItem']) {
                doc['downItem'].forEach(function(item, index) {
                    console.log(item['title'].split('(')[0].trim());
                    updateMovies.push({'title': item['title'].split('(')[0].trim(),
                        'position': item['position']
                    });
                })
                done(null);
            } else {
                done(null);
            }
          },
          function (done) {
            // console.log('\n\nnewMovies: =======> ' + newMovies.length);
            var updateItems = updateMovies.length,
                newItems = newMovies.length;

            for (var i = 0; i < updateItems+1; i++) {
              updatePositionWizard();
            }

            for (var i = 0; i < newItems+1; i++) {
              createNewMovieWizard();
            }

          }
        ], function (err) {
          if (err) console.error(err.stack);
          console.log('all finished!!');
        });
    });
    
};

function updatePositionWizard() {
    if (!updateMovies.length) {
        return console.log('Done!!!!');
    }

    var item = updateMovies.pop();
    console.log('updatePositionWizard');
    console.log(item);
    if (item['title'].indexOf(',') != -1) {
        var bar = item['title'].split(',');
        console.log('\n\n----->' + bar[1] + ' ' + bar[0] + '\n\n');
        item['title'] = bar[1] + ' ' + bar[0];
        if (item['title'].trim().indexOf('aboliques') != -1) {
            item['title'] = 'Les diaboliques';
        }
        var updater = new Updater(item.title.trim(), item.position);
    } else {
        var updater = new Updater(item.title, item.position);
    }

    console.log('Requests Left: ' + updateMovies.length);
    updater.on('error', function (error) {
      console.log(error);
      updatePositionWizard();
    });

    updater.on('complete', function (listing) {
        // console.log(listing);
        console.log(listing + ' got complete!');
        updatePositionWizard();
    });
}

function createNewMovieWizard() {
    if (!newMovies.length) {
        return console.log('Done!!!!');
    }
    console.log('newMovies: '+ newMovies);
    var item = newMovies.pop();
    if (item['title'].indexOf(',') != -1) {
        var bar = item['title'].split(',');
        console.log('\n\n----->' + bar[1] + ' ' + bar[0] + '\n\n');
        item['title'] = bar[1] + ' ' + bar[0];
        var creater = new Creater(item.title.trim(), item.position);
    } else {
        var creater = new Creater(item.title, item.position);
    }

    console.log('Requests Left: ' + newMovies.length);
    creater.on('error', function (error) {
      console.log(error);
      updatePositionWizard();
    });

    creater.on('complete', function (listing) {
        // console.log(listing);
        console.log(listing + ' got complete!');
        updatePositionWizard();
    });
}

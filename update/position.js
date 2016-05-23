var config = require('../config');
var dbIMDB = config.dbIMDB;
var dbUpComing = config.dbUpComing;
var dbPosition = config.dbPosition;
var dbRecord = config.dbRecord;
var myapiToken = config.myapiToken;
var dbToday = config.dbToday;
var Updater = require('../update/Updater');
var Creater = require('../update/Creater');
var Remover = require('../update/Remover');
var google = require('google');
var request = require("request");
var async = require('async');
var moment = require("moment");
var updateMovies = [];
var newMovies = []; // not in database before this time
var outMovies = [];

exports.updatePosition = function() {

    dbToday.today.find({date: moment().format('l')}, function(err, doc) {
        // console.log(doc[0]['outList']);
        if (doc[0]['outList']) {
            doc[0]['outList'].forEach(function(movie, index) {
                 if (movie['item'].indexOf(',') !== -1) {
                    var bar = movie['item'].trim().split(',');
                    movie['item'] = bar[1].split('(')[0] + bar[0];
                    outMovies.push({'title': movie['item'].trim()});
                 } else {
                    outMovies.push({'title': movie['item'].split('(')[0].trim()});
                 }
            });
        }
    });
    
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
                    if (item == 'Sunrise (1927)')
                        item['title'] = 'Sunrise: A Song of Two Humans';
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
                newItems = newMovies.length,
                outItems = outMovies.length;

            console.log('\n\n\n'+JSON.stringify(outMovies) + '\n\n\n');

            for (var i = 0; i < updateItems+1; i++) {
              updatePositionWizard();
            }

            for (i = 0; i < newItems+1; i++) {
              createNewMovieWizard();
            }

            for (i = 0; i < outItems+1; i++) {
              removeMovieWizard();
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
        if (bar[1].trim() == 'The')
            item['title'] = bar[1] + ' ' + bar[0];
        else if (item['title'] !== 'Lock, Stock and Two Smoking Barrels')
            item['title'] = bar[1] + ' ' + bar[0].toLowerCase();
        
        /*if (item['title'].trim().indexOf('aboliques') != -1) {
            item['title'] = 'Les diaboliques';
        }*/
        var updater = new Updater(item.title.trim(), item.position);
    } else {
        var updater = new Updater(item.title.trim(), item.position);
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
      createNewMovieWizard();
    });

    creater.on('complete', function (listing) {
        // console.log(listing);
        console.log(listing + ' got complete!');
        createNewMovieWizard();
    });
}

function removeMovieWizard() {
    if (!outMovies.length)
        return console.log('Done!!!!');

    var item = outMovies.pop();
    var remover = new Remover(item.title, item.position);
    // console.log('item ' + item + ' will be removed in top 250');

    remover.on('error', function (error) {
      console.log(error);
      removeMovieWizard();
    });

    remover.on('complete', function (listing) {
        // console.log(listing);
        console.log(listing + ' be moved complete!');
        removeMovieWizard();
    });
}

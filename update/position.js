var config = require('../config');
var dbIMDB = config.dbIMDB;
var dbPosition = config.dbPosition;
var dbToday = config.dbToday;
var Updater = require('../update/Updater');
var Creater = require('../update/Creater');
var Remover = require('../update/Remover');
var request = require("request");
var async = require('async');
var moment = require("moment");
var updateMovies = [];
var newMovies = []; // not in database before this time
var outMovies = [];

exports.updatePosition = function() {
    // console.log(moment().format('l'));
    dbToday.today.find({date: moment().format('l')}, function(err, docs) {
        
        if (docs.length == 0)
            return;

        if (docs[0]['outList']) {
            docs[0]['outList'].forEach(function(movie, index) {
                 outMovies.push({'title': movie['item'].split('(')[0].trim()});
            });
        }
    });
    
    dbPosition.position.find({date: moment().format('l')}, function(err, docs) {
        
        docs = docs[0];
        
        if (!docs) {
            console.log('docs not found!');
            return;
        }

        async.series([
          function (done) {
            console.log(docs);
            //type A 
            if (docs['newItem']) {
                docs['newItem'].forEach(function(item, index) {
                    console.log(item['title'] + '-------> push to creating pool');
                     newMovies.push({'title': item['title'],
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
            if (docs['upItem']) {
                docs['upItem'].forEach(function(item, index) {
                    // console.log(item['title'].split('(')[0].trim());
                    updateMovies.push({'title': item['title'].split('(')[0].trim(),
                        'position': item['position'],
                        'delta': item['delta']
                    });
                });
                done(null);
            } else {
                done(null);
            }
          },
          function (done) {
            //type C
            if (docs['downItem']) {
                docs['downItem'].forEach(function(item, index) {
                    // console.log(item['title'].split('(')[0].trim());
                    updateMovies.push({'title': item['title'].split('(')[0].trim(),
                        'position': item['position'],
                        'delta': item['delta']
                    });
                })
                done(null);
            } else {
                done(null);
            }
          },
          function (done) {
                dbIMDB.imdb.find({'top': {$lte:250, $gte:1}}, function(err, docs) {
                        docs.forEach(function(doc, top){
                            dbIMDB.imdb.update({'title': doc['title']}, {'$unset': {'delta':1}});
                        });
                        done(null);
                });
          },
          function (done) {
            updatePositionWizard(done);
          },
          function(done) {
            createNewMovieWizard(done);
          },
          function(done) {
            removeMovieWizard(done);
          }
        ], function (err) {
          if (err) console.error(err.stack);
          console.log('all finished!!');
        });
    });
    
};

function updatePositionWizard(done) {
    if (!updateMovies.length) {
        done(null);
        return console.log('Done!!!!');
    }

    var item = updateMovies.pop();
    console.log('updatePositionWizard');
    console.log(item);

    var updater = new Updater(item.title, item.position, 'delta', item.delta);
    console.log('Requests Left: ' + updateMovies.length);
    updater.on('error', function (error) {
      console.log(error);
      updatePositionWizard(done);
    });

    updater.on('complete', function (listing) {
        // console.log(listing);
        console.log(listing + ' got complete!');
        updatePositionWizard(done);
    });
}

function createNewMovieWizard(done) {
    if (!newMovies.length) {
        done(null);
        return console.log('Done!!!!');
    }
    
    console.log('newMovies: '+ newMovies);
    var item = newMovies.pop();

    if (item.title.indexOf(',') != -1) {
        item.title = item.title.split('(')[0];
        item.title = item.title.split(',')[1].trim()+" "+item.title.split(',')[0]
    }

    var creater = new Creater(item.title, item.position);
    console.log('Requests Left: ' + newMovies.length);

    creater.on('error', function (error) {
      console.log(error);
      createNewMovieWizard(done);
    });

    creater.on('complete', function (listing) {
        // console.log(listing);
        console.log(listing + ' got complete!');
        createNewMovieWizard(done);
    });
}

function removeMovieWizard(done) {
    if (!outMovies.length)
        return console.log('Done!!!!');

    var item = outMovies.pop();
    
    if (item['title'] == 'La Dolce vita')
        item['title'] = 'La dolce vita';

    var remover = new Remover(item.title, item.position);

    remover.on('error', function (error) {
      console.log(error);
      removeMovieWizard(done);
    });

    remover.on('complete', function (listing) {
        console.log(listing + ' be moved complete!');
        removeMovieWizard(done);
    });
}

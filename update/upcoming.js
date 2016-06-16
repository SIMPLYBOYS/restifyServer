var config = require('../config');
var mongojs = require('mongojs');
var dbIMDB = config.dbIMDB;
var dbUpComing = config.dbUpComing;
var myapiToken = config.myapiToken;
var Updater = require('../update/Updater');
var Scraper = require('../crawler/Scraper');
var Trailer = require('../Trailer');
var MovieInfomer = require('../MovieInfomer');
var upComingReadMoreScraper = require('../crawler/upComingReadMoreScraper');
var upComingGalleryThumbnailScraper = require('../crawler/upComingGalleryThumbnailScraper');
var upComingPosterDescriptionScraper = require('../crawler/upComingPosterDescriptionScraper');
var upComingGalleryScraper = require('../crawler/upComingGalleryScraper');
var upComingPosterScraper = require('../crawler/upComingPosterScraper');
var request = require("request");
var async = require('async');
var moment = require("moment");
var youTube = new config.YouTube;
var upComingPages = [];
var upComingDetailPages = [];
var upComingGalleryPages = [];
var upComingThumbnailPages = [];
var upComingPosterPages = [];
var upComingPosterImageObjs = [];
var start = parseInt(moment().format('M'));
var limit = start + 4;
var monthList = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December"
    ];

youTube.setKey(config.YouTubeKey);

exports.updateupComing = function() {
    async.series([
        function(done) {
             var url = 'http://www.imdb.com/movies-coming-soon/2016-';
             var i;
             for (i=start; i <= limit; i++) {
                if (i<10)
                    upComingPages.push(url + '0'+ i + '/');
                else
                    upComingPages.push(url + i + '/');
            }
            done(null);
        },
        upComingInitWizard,
        prepareDetailPages,
        upComingDetailWizard,
        /*prepareThumbnailPages,
        upComingThumbnailWizard,
        prepareGalleryPages,
        upComingGalleryWizard,*/
        generateUpComingTrailerUrls,
        generateUpComingMovieInfo,
        generateUpComingPosterPages,
        upComingDescriptionWizard,
        prepareUpComingPosterUrls,
        upComingPosterWizard
    ],
    function (err) {
        if (err) console.error(err.stack);
          console.log('All steps for upComing movies are finished!!');
    });
};

function prepareDetailPages(done) {
    var count = start;
    async.whilst(
        function () { console.log('start: ' + start + 'count: ' + count + 'limit: ' + limit); return count <= limit; },
        function (callback) {
            dbUpComing.upComing.findOne({'month': monthList[count-1]}, function(err, doc) {
                if (doc) {
                    for (var j in doc['movies']) {
                        upComingDetailPages.push(doc['movies'][j]['detailUrl']); 
                    }
                    // console.log(upComingDetailPages);
                    count++;
                    callback(null, count);
                } else {
                    console.log('something wrong with the docs in month: ' + monthList[count-1]);
                    return;
                }
            });             
        },
        function (err, n) {
            done(null);
        }
    );
};

function prepareThumbnailPages(done) {
    var count = start;
    async.whilst(
        function () { console.log('start: ' + start + 'count: ' + count + 'limit: ' + limit); return count <= limit; },
        function (callback) {
            console.log('month: ' + monthList[count-1]);
            dbUpComing.upComing.findOne({'month': monthList[count-1]}, function(err, doc) {
                if (doc) {
                    InnerCount = 0;
                    async.whilst(
                        function() { return InnerCount < doc['movies'].length},
                        function(innercallback) {
                            var title = doc['movies'][InnerCount]['title'];
                            title = title.slice(0, title.length-1);
                            if (title == 'Ben-Hur') {
                                dbIMDB.imdb.findOne({'_id': mongojs.ObjectId('5705057233c8ea8e13b62488')}, function(err, item) {
                                    if (err) 
                                        console.log(err);
                                    else {
                                        for (var j=1; j<=item['readMore']['page']; j++) {
                                            var bar = item['readMore']['url'].split('?');
                                            var url = bar[0] + '?page=' +j+'&'+bar[1];
                                            upComingThumbnailPages.push(url);
                                        }
                                        InnerCount++;
                                        innercallback(null, InnerCount);
                                    }
                                });
                            } else {
                                dbIMDB.imdb.findOne({'title': title}, function(err, item) {
                                    for (var j=1; j<=item['readMore']['page']; j++) {
                                        var bar = item['readMore']['url'].split('?');
                                        var url = bar[0] + '?page=' +j+'&'+bar[1];
                                        upComingThumbnailPages.push(url);
                                    }
                                    InnerCount++;
                                    innercallback(null, InnerCount);
                                });
                            }
                        },
                        function(err, n) {
                            count++;
                            callback(null, count);
                        }
                    );
                } else {
                    console.log('something wrong with the docs in month: ' + monthList[count-1]);
                    return;
                }
            });  
        },
        function (err, n) {
            done(null);
        }
    );
};

function prepareGalleryPages(done) {
    var count = start;
    async.whilst(
        function () { console.log('start: ' + start + 'count: ' + count + 'limit: ' + limit); return count <= limit; },
        function (callback) {
            dbUpComing.upComing.findOne({'month': monthList[count-1]}, function(err, doc) {
                if (doc) {
                    var innerCount = 0;
                    console.log('<<prepareGalleryPages>> movies in the month ====> ' + monthList[count-1]);
                    async.whilst(
                        function () { console.log('innerCount: ' + innerCount); return innerCount < doc['movies'].length; },
                        function (innercallback) {
                            var title = doc['movies'][innerCount]['title'];
                            title = title.slice(0, title.length-1);
                            console.log('title: ' + title);

                            if (title == 'Ben-Hur') {
                                dbIMDB.imdb.findOne({_id: mongojs.ObjectId('5705057233c8ea8e13b62488')}, function(err, item) {
                                    for (var j in item['gallery_thumbnail']) {
                                        upComingGalleryPages.push(item['gallery_thumbnail'][j]['detailUrl']);
                                    }
                                    dbIMDB.imdb.update({_id: mongojs.ObjectId('5705057233c8ea8e13b62488')}, {'$unset': {'gallery_full': 1}
                                    }, function() {
                                           innerCount++;
                                           innercallback(null, innerCount); 
                                    });
                                });
                            } else {
                                dbIMDB.imdb.findOne({title: title}, function(err, item) {
                                    console.log(upComingGalleryPages.length);
                                    console.log(item.hasOwnProperty('gallery_thumbnail'));
                                    if (!item.hasOwnProperty('gallery_thumbnail')) {
                                        console.log('---- skip the film without any thumbnail!! -----');
                                        innerCount++;
                                        innercallback(null, innerCount);
                                    } else if (item['gallery_thumbnail'].length >0) {
                                        for (var j in item['gallery_thumbnail']) {
                                            upComingGalleryPages.push(item['gallery_thumbnail'][j]['detailUrl']);
                                        }

                                        dbIMDB.imdb.update({'title': item['title']}, {'$unset': {'gallery_full': 1}
                                        }, function() {
                                               innerCount++;
                                               innercallback(null, innerCount); 
                                        });    
                                    }
                                });
                            }  
                        },
                        function (err, n) {
                            count++;
                            callback(null, count);
                        }
                    );
                } else {
                    console.log('something wrong with the docs in month: ' + monthList[count-1]);
                    return;
                }
            });
            
        },
        function (err, n) {
            done(null);
        }
    );
};

function generateUpComingMovieInfo(done) {
    var count = start;
    async.whilst(
        function () { console.log('start: ' + start + 'count: ' + count + 'limit: ' + limit); return count <= limit; },
        function (callback) {
            dbUpComing.upComing.findOne({'month': monthList[count-1]}, function(err, doc) {
                if (doc) {
                    var innerCount = 0;
                    console.log('<<generateUpComingMovieInfo>> movies in the month ====> ' + monthList[count-1]);
                    async.whilst(
                        function () { console.log('innerCount: ' + innerCount); return innerCount < doc['movies'].length; },
                        function (innercallback) {
                            var title = doc['movies'][innerCount]['title'];
                            title = title.slice(0, title.length-1);
                            innerCount++;
                            new MovieInfomer(title, myapiToken, innerCount, innercallback);
                        },
                        function (err, n) {
                            count++;
                            callback(null, count);
                        }
                    );
                } else {
                    console.log('something wrong with the docs in month: ' + monthList[count-1]);
                    return;
                }
            });
        },
        function (err, n) {
            count++;
            done(null);
        }
    );
}

function generateUpComingTrailerUrls(done) {

    var count = start;
    async.whilst(
        function () { console.log('start: ' + start + 'count: ' + count + 'limit: ' + limit); return count <= limit; },
        function (callback) {
            dbUpComing.upComing.findOne({'month': monthList[count-1]}, function(err, doc) {
                if (doc) {
                    var innerCount = 0;
                    console.log('<<generateUpComingTrailerUrls>> movies in the month ====> ' + monthList[count-1]);
                    async.whilst(
                        function () { console.log('innerCount: ' + innerCount); return innerCount < doc['movies'].length; },
                        function (innercallback) {
                            var title = doc['movies'][innerCount]['title'];
                            title = title.slice(0, title.length-1);
                            innerCount++;
                            new Trailer(title, youTube, innerCount, innercallback);
                        },
                        function (err, n) {
                            count++;
                            callback(null, count);
                        }
                    );
                } else {
                    console.log('something wrong with the docs in month: ' + monthList[count-1]);
                    return;
                }
            });
        },
        function (err, n) {
            count++;
            done(null);
        }
    );
}

function generateUpComingPosterPages(done) {
    var count = start;
    async.whilst(
        function () { console.log('start: ' + start + 'count: ' + count + 'limit: ' + limit); return count <= limit; },
        function (callback) {
            dbUpComing.upComing.findOne({'month': monthList[count-1]}, function(err, doc) {
                if (doc) {
                    var innerCount = 0;
                    console.log('<<generateUpComingPosterPages>> movies in the month ====> ' + monthList[count-1]);
                    async.whilst(
                        function () { console.log('innerCount: ' + innerCount); return innerCount < doc['movies'].length; },
                        function (innercallback) {
                            var title = doc['movies'][innerCount]['title'];
                            title = title.slice(0, title.length-1);
                            console.log('title: ' + title);

                            if (title == 'Ben-Hur') {
                                dbIMDB.imdb.findOne({_id: mongojs.ObjectId('5705057233c8ea8e13b62488')}, function(err, item) {
                                    if (typeof(item['idIMDB']) == 'undefined')
                                        console.log(item['title'] + ' ===> idIMDB field not be defined!!');
                                    console.log(upComingPosterPages.length);
                                    upComingPosterPages.push('http://www.imdb.com/title/' + item['idIMDB'] + '/');
                                    innerCount++;
                                    innercallback(null, innerCount);
                                });
                            } else {
                                dbIMDB.imdb.findOne({title: title}, function(err, item) {
                                    if (typeof(item['idIMDB']) == 'undefined')
                                        console.log(item['title'] + ' ===> idIMDB field not be defined!!');
                                    console.log(upComingPosterPages.length);
                                    upComingPosterPages.push('http://www.imdb.com/title/' + item['idIMDB'] + '/');
                                    innerCount++;
                                    innercallback(null, innerCount);
                                });
                            }    
                        },
                        function (err, n) {
                            count++;
                            callback(null, count);
                        }
                    );
                } else {
                    console.log('something wrong with the docs in month: ' + monthList[count-1]);
                    return;
                }
            });
        },
        function (err, n) {
            count++;
            done(null);
        }
    );
}

function prepareUpComingPosterUrls(done) {
    var count = start;
    async.whilst(
        function () { console.log('start: ' + start + 'count: ' + count + 'limit: ' + limit); return count <= limit; },
        function (callback) {
            dbUpComing.upComing.findOne({'month': monthList[count-1]}, function(err, doc) {
                if (doc) {
                    var innerCount = 0;
                    console.log('<<prepareUpComingPosterUrls>> movies in the month ====> ' + monthList[count-1]);
                    async.whilst(
                        function () { console.log('innerCount: ' + innerCount); return innerCount < doc['movies'].length;},
                        function (innercallback) {
                            var title = doc['movies'][innerCount]['title'];
                            title = title.slice(0, title.length-1);
                            console.log('title: ' + title);
                            if (title == 'Ben-Hur') {
                                dbIMDB.imdb.findOne({_id: mongojs.ObjectId('5705057233c8ea8e13b62488')}, function(err, item) {
                                    console.log(item['posterUrl']);
                                    console.log(upComingPosterImageObjs.length);
                                    if (typeof(item['posterUrl']) != 'undefined') {
                                        upComingPosterImageObjs.push({
                                            url: item['posterUrl'], 
                                            hash: item['posterHash']
                                        });
                                    }
                                    innerCount++;
                                    innercallback(null, innerCount);
                                });
                            } else {
                                dbIMDB.imdb.findOne({title: title}, function(err, item) {
                                    console.log(item['posterUrl']);
                                    console.log(upComingPosterImageObjs.length);
                                    if (typeof(item['posterUrl']) != 'undefined') {
                                        upComingPosterImageObjs.push({
                                            url: item['posterUrl'], 
                                            hash: item['posterHash']
                                        });
                                    }
                                    innerCount++;
                                    innercallback(null, innerCount);
                                });
                            }
                        },
                        function (err, n) {
                            count++;
                            callback(null, count);
                        }
                    );
                } else {
                    console.log('something wrong with the docs in month: ' + monthList[count-1]);
                    return;
                }
            });
        },
        function (err, n) {
            done(null);
        }
    );
}

function upComingInitWizard(done) {
  // if the Pages array is empty, we are Done!!
  if (!upComingPages.length) {
    done(null);
    return console.log('Done!!!!');
  }
  var url = upComingPages.pop();
  var scraper = new Scraper(url);
  console.log('Requests Left: ' + upComingPages.length);
  // if the error occurs we still want to create our
  // next request
  scraper.on('error', function (error) {
    console.log(error);
    upComingInitWizard(done);
  });

  // if the request completed successfully
  // we want to store the results in our database
  scraper.on('complete', function (listing) {
    // console.log(listing['groups'][0]['month'].split(' ')[0]);
    var month = listing['groups'][0]['month'].split(' ')[0];
    dbUpComing.upComing.findOne({'month': month}, function(err, doc) {
        if (!doc) {
            dbUpComing.upComing.insert({'month': month}, function() {
                dbUpComing.upComing.update({'month': month}, {'$set': {'movies': listing['movies']}});
            })
        } else {
            dbUpComing.upComing.update({'month': month}, {'$set': {'movies': listing['movies']}}, function(err, doc) {
                if (!err) {
                    console.log('got complete and update successfully!');
                    upComingInitWizard(done);   
                } else {
                    console.log('got complete but update fail!');
                }
            });
        }
    }); 
  });
}

function upComingDetailWizard(done) {

    if (!upComingDetailPages.length) {
        done(null);
        return console.log('Done!!!!');
    }

    var url = upComingDetailPages.pop();
    console.log(url);
    var scraper = new upComingReadMoreScraper(url);
    console.log('Requests Left: ' + upComingDetailPages.length);
    scraper.on('error', function (error) {
      console.log(error);
      upComingDetailWizard(done);
    });

    scraper.on('complete', function (listing) {
        console.log(listing);
        console.log('got complete!');
        if (listing['title'] == 'Ben-Hur') {
            dbIMDB.imdb.findAndModify({
                query: { _id: mongojs.ObjectId('5705057233c8ea8e13b62488')},
                update: { $set: {'readMore': listing} },
                new: false
            }, function (err, doc, lastErrorObject) {
                if (err)
                  console.log(err);
                else {
                  console.log('update ----> ' + doc['title']);
                  upComingDetailWizard(done);
                }
            });
        } else {
            dbIMDB.imdb.findOne({title: listing['title']}, function(err, doc) {
                if (!doc) {
                    console.log('\n\nfirst insert doc ----> ' + listing['title']);
                    dbIMDB.imdb.insert({ title: listing['title']}, function(err, doc) {
                        dbIMDB.imdb.update({'title': listing['title']}, {'$set': {'readMore': listing}}, function(err, doc) {
                            upComingDetailWizard(done);
                        });
                    });
                } else {
                    dbIMDB.imdb.update({'title': listing['title']}, {'$set': {'readMore': listing}}, function(err, doc) {
                        upComingDetailWizard(done);
                    });
                }
            });
        }
    });
}

function upComingThumbnailWizard(done) {

    if (!upComingThumbnailPages.length) {
        done(null);
        return console.log('Done!!!!');
    }

    var url = upComingThumbnailPages.pop();
    console.log(url);
    var scraper = new upComingGalleryThumbnailScraper(url);
    console.log('Requests Left: ' + upComingThumbnailPages.length);
    scraper.on('error', function (error) {
      console.log(error);
      upComingThumbnailWizard(done);
    });

    scraper.on('complete', function (listing) {
        if (listing['title'] == 'Ben-Hur') {
            dbIMDB.imdb.findAndModify({
                query: { _id: mongojs.ObjectId('5705057233c8ea8e13b62488')},
                update: { $set: {'gallery_thumbnail': listing['picturesUrl']} },
                new: false
            }, function (err, doc, lastErrorObject) {
                if (err)
                  console.log(err);
                else {
                  console.log('update ----> ' + doc['title']);
                  upComingThumbnailWizard(done);
                }
            });
        } else {
            console.log(listing);
            console.log('got complete!');

            if (listing['picturesUrl'].length == 0) {
                upComingThumbnailWizard(done);
                return console.log('---- skip the film without any thumbnail!! -----');
            }
            dbIMDB.imdb.findOne({title: listing['title']}, function(err, doc) {
                if (!doc) {
                    dbIMDB.imdb.insert({ title: listing['title'] }, function(err, doc) {
                        dbIMDB.imdb.update({'title': listing['title']}, {'$set': {'gallery_thumbnail': listing['picturesUrl']}},
                        function(err, doc) {
                            upComingThumbnailWizard(done);
                        });
                    });
                } else {
                    dbIMDB.imdb.update({'title': listing['title']}, {'$set': {'gallery_thumbnail': listing['picturesUrl']}},
                        function(err, doc){
                            upComingThumbnailWizard(done);
                        });
                }
            });  
        }   
    });
}

function upComingGalleryWizard(done) {

    if (!upComingGalleryPages.length) {
        done(null);
        return console.log('Done!!!!');
    }

    var url = upComingGalleryPages.pop();
    console.log(url);
    var scraper = new upComingGalleryScraper(url);
    console.log('Requests Left: ' + upComingGalleryPages.length);
    scraper.on('error', function (error) {
      console.log(error);
      upComingGalleryWizard(done);
    });

    scraper.on('complete', function (listing) {

        if (listing['title'] == 'Ben-Hur') {
            dbIMDB.imdb.findAndModify({
                query: { _id: mongojs.ObjectId('5705057233c8ea8e13b62488')},
                update: { $push: {'gallery_full': { type: 'full', url: listing['picturesUrl']}} },
                new: false
            }, function (err, doc, lastErrorObject) {
                if (err)
                  console.log(err);
                else {
                  console.log('update ----> ' + doc['title']);
                  upComingGalleryWizard(done);
                }
            });
        } else {
            console.log(listing);
            console.log('got complete!');

            dbIMDB.imdb.update({'title': listing['title']}, {$push: {'gallery_full': { type: 'full', url: listing['picturesUrl']}
                }
            }, function() {
                upComingGalleryWizard(done);
            });
        }
    });
}

function upComingDescriptionWizard(done) {
    if (!upComingPosterPages.length) {
        done(null);
        return console.log('Done!!!!');
    }

    var url = upComingPosterPages.pop();
    console.log(url);
    var scraper = new upComingPosterDescriptionScraper(url);
    console.log('Requests Left: ' + upComingPosterPages.length);

    scraper.on('error', function (error) {
      console.log(error);
      upComingDescriptionWizard(done);
    });

    scraper.on('complete', function (listing) {
        console.log(listing);
        console.log('complete!');
        if (listing['title'] == 'Ben-Hur') {
            async.series([
                function(callback) {
                    dbIMDB.imdb.findAndModify({
                        query: { '_id': mongojs.ObjectId('5705057233c8ea8e13b62488') },
                        update: { '$set': {'description': listing['description']} },
                        new: false
                    }, function (err, doc, lastErrorObject) {
                        if (err)
                          console.log(err);
                        else {
                          console.log('update ----> ' + doc['title']);
                          callback(null, 'one');
                        }
                    });
                },
                function(callback) {
                    dbIMDB.imdb.findAndModify({
                        query: { '_id': mongojs.ObjectId('5705057233c8ea8e13b62488') },
                        update: { '$set': {'posterUrl': listing['url']}},
                        new: false
                    }, function (err, doc, lastErrorObject) {
                        if (err)
                          console.log(err);
                        else {
                          console.log('update ----> ' + doc['title']);
                          callback(null, 'one');
                        }
                    });
                },
                function(callback) {
                    dbIMDB.imdb.findAndModify({
                        query: { '_id': mongojs.ObjectId('5705057233c8ea8e13b62488') },
                        update: { '$set': {'posterHash': listing['hash']}},
                        new: false
                    }, function (err, doc, lastErrorObject) {
                        if (err)
                          console.log(err);
                        else {
                          console.log('update ----> ' + doc['title']);
                          callback(null, 'one');
                        }
                    });
                }
            ],
            function(err, results) {
                upComingDescriptionWizard(done);
            });
            
        } else {
            async.series([
                function(callback) {
                    dbIMDB.imdb.update({'title': listing['title']}, {'$set': {'description': listing['description']}},
                    function() {
                        callback(null, 'one');
                    });
                },
                function(callback) {
                    if (listing.hasOwnProperty('url')) {
                        dbIMDB.imdb.update({'title': listing['title']}, {'$set': {'posterUrl': listing['url']}},
                        function() {
                            callback(null, 'two');
                        });
                    } else {
                        callback(null, 'two');
                    }
                },
                function(callback) {
                    if (listing.hasOwnProperty('hash')) {
                        dbIMDB.imdb.update({'title': listing['title']}, {'$set': {'posterHash': listing['hash']}},
                        function() {
                            callback(null, 'three');
                        });
                    } else {
                        callback(null, 'three');
                    } 
                }
            ],
            // optional callback
            function(err, results){
                upComingDescriptionWizard(done);
            });
        }
    });
}

function upComingPosterWizard(done) {

    if (!upComingPosterImageObjs.length) {
        done(null);
        return console.log('Done!!!!');
    }

    var obj = upComingPosterImageObjs.pop();
    var scraper = new upComingPosterScraper(obj);
    console.log('Requests Left: ' + upComingPosterImageObjs.length);
    scraper.on('error', function (error) {
      console.log(error);
      upComingPosterWizard(done);
    });

    scraper.on('complete', function (listing) {
        console.log(listing);
        console.log('complete!');
        if (listing['title'] == 'Ben-Hur') {
            dbIMDB.imdb.findAndModify({
                query: { '_id': mongojs.ObjectId('5705057233c8ea8e13b62488') },
                update: { '$set': {'posterUrl': listing['url']} },
                new: false
            }, function (err, doc, lastErrorObject) {
                if (err)
                  console.log(err);
                else {
                  console.log('update ----> ' + doc['title']);
                  upComingPosterWizard(done);
                }
            });
        } else {
            dbIMDB.imdb.update({'title': listing['title']}, {'$set': {'posterUrl': listing['url']}}, function() {
                upComingPosterWizard(done);    
            });
        }
    });
}
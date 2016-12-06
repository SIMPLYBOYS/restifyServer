var config = require('../config');
var mongojs = require('mongojs');
var dbIMDB = config.dbIMDB;
var dbUpComing = config.dbUpComing;
var myapiToken = config.myapiToken;
var Scraper = require('../crawler/Scraper');
var Trailer = require('../Trailer');
var usCastAvatarScraper = require('../crawler/usCastAvatarScraper');
var MovieInfomer = require('../MovieInfomer');
var cheerio = require('cheerio');
var upComingReadMoreScraper = require('../crawler/upComingReadMoreScraper');
var upComingGalleryThumbnailScraper = require('../crawler/upComingGalleryThumbnailScraper');
var upComingPosterDescriptionScraper = require('../crawler/upComingPosterDescriptionScraper');
var upComingGalleryScraper = require('../crawler/upComingGalleryScraper');
var upComingPosterScraper = require('../crawler/upComingPosterScraper');
var request = require("request");
var async = require('async');
var moment = require("moment");
var youTube = new config.YouTube;
var finalReviewPages = [];
var finalCastPages = [];
var upComingPages = [];
var avatarUrl = [];
var upComingDetailPages = [];
var upComingGalleryPages = [];
var upComingThumbnailPages = [];
var upComingPosterPages = [];
var upComingPosterImageObjs = [];
var start = parseInt(moment().format('M'));
var limit = start + 5;
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
             for (var i=start; i<=limit; i++) {
                var url = i <= 12 ? 'http://www.imdb.com/movies-coming-soon/2016-' : 'http://www.imdb.com/movies-coming-soon/2017-';
                if ((i%12)<10)
                    upComingPages.push(url + '0'+ (i%12) + '/');
                else
                    upComingPages.push(url + i + '/');
            }
            done(null);
        },
        upComingInitWizard,
        prepareDetailPages,
        prepareCastPages,
        insertCast,
        insertCastAvatar,
        upComingDetailWizard,
        prepareThumbnailPages,
        upComingThumbnailWizard,
        prepareGalleryPages,
        upComingGalleryWizard,
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
    console.log('prepareDetailPages --->');
    var count = start;
    async.whilst(
        function () { console.log('start: ' + start + 'count: ' + count + 'limit: ' + limit); return count <= limit; },
        function (callback) {
            dbUpComing.upComing.findOne({'month': monthList[(count-1)%12]}, function(err, doc) {
                if (doc) {
                    for (var j in doc['movies']) {
                        upComingDetailPages.push(doc['movies'][j]['detailUrl']); 
                    }
                    // console.log(upComingDetailPages);
                    count++;
                    callback(null, count);
                } else {
                    console.log('something wrong with the docs in month: ' + monthList[(count-1)%12]);
                    return;
                }
            });             
        },
        function (err, n) {
            console.log('prepareDetailPages done!');
            done(null);
        }
    );
};

function prepareCastPages(done) {
    var count = start;
    console.log('prepareCastPages --->');
    async.whilst(
        function () { console.log('start: ' + start + 'count: ' + count + 'limit: ' + limit); return count <= limit; },
        function (callback) {
            console.log('month: ' + monthList[(count-1)%12]);
            dbUpComing.upComing.findOne({'month': monthList[(count-1)%12]}, function(err, doc) {
                if (doc) {
                    InnerCount = 0;
                    async.whilst(
                        function() { return InnerCount < doc['movies'].length},
                        function(innercallback) {
                            var title = doc['movies'][InnerCount]['title'];
                            title = title.slice(0, title.length-1);
                            finalCastPages.push({
                                castUrl: doc['movies'][InnerCount]['detailUrl'].split('?')[0]+'fullcredits?ref_=tt_cl_sm#cast',
                                title: title
                            });
                            InnerCount++;
                            innercallback(null, InnerCount);
                        },
                        function(err, n) {
                            count++;
                            callback(null, count);
                        }
                    );
                } else {
                    console.log('something wrong with the docs in month: ' + monthList[(count-1)%12]);
                    return;
                }
            });  
        },
        function (err, n) {
            console.log('prepareCastPages done!');
            done(null);
        }
    );
};

function insertCast(done) {
    console.log('insertCast -------->');
    var count = 0,
        cast,
        end = finalCastPages.length,
        as = null,
        name,
        link,
        Cast;
    async.whilst(
        function () { return count < end; },
        function (callback) {
            cast = finalCastPages.pop();
            /*if (!cast.hasOwnProperty()) {
              count++;
              callback(null, count);
              return;
            }*/
            Cast = [];
            request({
                url: cast['castUrl'], 
                encoding: "utf8",
                method: "GET"
            }, function(err, response, body) {
                var $ = cheerio.load(body);
                console.log(cast['title']+' --->');
                $('.cast_list tr').each(function(index, item) {
                    if (index > 0) {
                        name = $(item).find('.itemprop span').text();
                        link = 'http://www.imdb.com'+$(item).find('.primary_photo a').attr('href');
                        avatarUrl.push({
                            link: link,
                            cast: name,
                            title: cast['title']
                        });
                        if (typeof($(item).find('.character a')[0])!='undefined')
                            as = $(item).find('.character a').text().trim();
                        Cast.push({
                            cast: name,
                            as: as,
                            link: link,
                            avatar: null
                        });
                    }
                });

                dbIMDB.imdb.findOne({title: cast['title']}, function(err, doc) {
                    if (doc.hasOwnProperty('cast')) {
                        count++;
                        callback(null, count);
                    } else {
                        dbIMDB.imdb.update({title: cast['title']}, {$set: {
                            cast: Cast,
                            review: finalReviewPages
                        }}, function(){
                            count++;
                            callback(null, count);
                        });
                    }
                });
            });
        },
        function (err, n) {
            // avatarUrl = avatarUrl.slice(0,444); TODO breakpoint 
            console.log(avatarUrl);
            console.log('insertCast finished!');
            done(null);
        }
    );
}

function insertCastAvatar(done) {
    console.log('insertCastAvatar --->');
    if (!avatarUrl.length) {
        done(null);
        return console.log('insertCastAvatar Done!!!!');
    }
    var avatar = avatarUrl.pop();
    console.log('avatarPages left: ' + avatarUrl.length);
    var scraper = new usCastAvatarScraper(avatar);
    scraper.on('error', function (error) {
      console.log(error);
      insertCastAvatar(done);
    });

    scraper.on('complete', function (listing) {
        var title = listing['title'];
        console.log(listing['picturesUrl']);
        dbIMDB.imdb.findAndModify({
            query: { 'title': title , 'cast.cast': listing['cast']},
            update: { $set: { 'cast.$.avatar': listing['picturesUrl']} },
            new: true
        }, function (err, doc, lastErrorObject) {
            if (doc) {
                insertCastAvatar(done);
            } else {
                console.log(listing['title'] + 'not found!');
                var title = listing['title'].split('�');
                var foo;
                title.forEach(function(item, index){
                    if (item.length > 0)
                        foo = item;
                });
                var query = {'originTitle': new RegExp(foo, 'i')};
                console.log(query);
                dbIMDB.imdb.findAndModify({
                    query: { 'title': title , 'cast.cast': listing['cast']},
                    update: { $set: { 'cast.$.avatar': listing['picturesUrl']} },
                    new: true
                }, function (err, doc, lastErrorObject) {
                    console.log(doc);
                    insertCastAvatar(done);
                });
            }           
        });
    });
}

function prepareThumbnailPages(done) {
    var count = start;
    console.log('prepareThumbnailPages --->');
    async.whilst(
        function () { console.log('start: ' + start + 'count: ' + count + 'limit: ' + limit); return count <= limit; },
        function (callback) {
            console.log('month: ' + monthList[(count-1)%12]);
            dbUpComing.upComing.findOne({'month': monthList[(count-1)%12]}, function(err, doc) {
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
                    console.log('something wrong with the docs in month: ' + monthList[(count-1)%12]);
                    return;
                }
            });  
        },
        function (err, n) {
            console.log('prepareThumbnailPages done!');
            done(null);
        }
    );
};

function prepareGalleryPages(done) {
    var count = start;
    console.log('prepareGalleryPages --->');
    async.whilst(
        function () { console.log('start: ' + start + 'count: ' + count + 'limit: ' + limit); return count <= limit; },
        function (callback) {
            dbUpComing.upComing.findOne({'month': monthList[(count-1)%12]}, function(err, doc) {
                if (doc) {
                    var innerCount = 0;
                    console.log('<<prepareGalleryPages>> movies in the month ====> ' + monthList[(count-1)%12]);
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
                    console.log('something wrong with the docs in month: ' + monthList[(count-1)%12]);
                    return;
                }
            });
            
        },
        function (err, n) {
            console.log('prepareGalleryPages done!');
            done(null);
        }
    );
};

function generateUpComingMovieInfo(done) {
    console.log('generateUpComingMovieInfo --->');
    var count = start;
    async.whilst(
        function () { console.log('start: ' + start + 'count: ' + count + 'limit: ' + limit); return count <= limit; },
        function (callback) {
            dbUpComing.upComing.findOne({'month': monthList[(count-1)%12]}, function(err, doc) {
                if (doc) {
                    var innerCount = 0;
                    console.log('<<generateUpComingMovieInfo>> movies in the month ====> ' + monthList[(count-1)%12]);
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
                    console.log('something wrong with the docs in month: ' + monthList[(count-1)%12]);
                    return;
                }
            });
        },
        function (err, n) {
            console.log('generateUpComingMovieInfo done!');
            count++;
            done(null);
        }
    );
}

function generateUpComingTrailerUrls(done) {
    console.log('generateUpComingTrailerUrls --->');
    var count = start;
    async.whilst(
        function () { console.log('start: ' + start + 'count: ' + count + 'limit: ' + limit); return count <= limit; },
        function (callback) {
            dbUpComing.upComing.findOne({'month': monthList[(count-1)%12]}, function(err, doc) {
                if (doc) {
                    var innerCount = 0;
                    console.log('<<generateUpComingTrailerUrls>> movies in the month ====> ' + monthList[(count-1)%12]);
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
                    console.log('something wrong with the docs in month: ' + monthList[(count-1)%12]);
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
    console.log('generateUpComingPosterPages --->');
    var count = start;
    async.whilst(
        function () { console.log('start: ' + start + 'count: ' + count + 'limit: ' + limit); return count <= limit; },
        function (callback) {
            dbUpComing.upComing.findOne({'month': monthList[(count-1)%12]}, function(err, doc) {
                if (doc) {
                    var innerCount = 0;
                    console.log('<<generateUpComingPosterPages>> movies in the month ====> ' + monthList[(count-1)%12]);
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
                    console.log('something wrong with the docs in month: ' + monthList[(count-1)%12]);
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
    console.log('prepareUpComingPosterUrls --->');
    var count = start;
    async.whilst(
        function () { console.log('start: ' + start + 'count: ' + count + 'limit: ' + limit); return count <= limit; },
        function (callback) {
            dbUpComing.upComing.findOne({'month': monthList[(count-1)%12]}, function(err, doc) {
                if (doc) {
                    var innerCount = 0;
                    console.log('<<prepareUpComingPosterUrls>> movies in the month ====> ' + monthList[(count-1)%12]);
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
                                    if (item['posterUrl'] != null) {
                                        if (item['posterUrl'].indexOf('?')!= -1) {
                                          upComingPosterImageObjs.push({
                                            url: item['posterUrl'],
                                            hash: item['posterHash']
                                          });
                                        }
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
                    console.log('something wrong with the docs in month: ' + monthList[(count-1)%12]);
                    return;
                }
            });
        },
        function (err, n) {
            console.log('prepareUpComingPosterUrls done!');
            done(null);
        }
    );
}

function upComingInitWizard(done) {
   console.log('upComingInitWizard --->');
  // if the Pages array is empty, we are Done!!
  if (!upComingPages.length) {
    done(null);
    return console.log('upComingInitWizard Done!!!!');
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
    var month = listing['groups'][0]['month'].split(' ')[0];
    dbUpComing.upComing.findOne({'month': month}, function(err, doc) {
        if (!doc) {
            dbUpComing.upComing.insert({
                month: month,
                movies: listing['movies']
            }, function(err, doc) {
                if (!err) {
                    console.log('got complete and update successfully!');
                    upComingInitWizard(done);   
                }
            });
        } else {
            dbUpComing.upComing.update({month: month},
                {'$set': { movies: listing['movies']}}, function(err, doc) {
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
    console.log('upComingDetailWizard --->');
    if (!upComingDetailPages.length) {
        done(null);
        console.log('finalReviewPages --> ' + JSON.stringify(finalReviewPages));
        return console.log('upComingDetailWizard Done!!!!');
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

        finalReviewPages.push(listing['review']);

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
    console.log('upComingThumbnailWizard --->');
    if (!upComingThumbnailPages.length) {
        done(null);
        return console.log('upComingThumbnailWizard Done!!!!');
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
    console.log('upComingGalleryWizard --->');
    if (!upComingGalleryPages.length) {
        done(null);
        return console.log('upComingGalleryWizard Done!!!!');
    }

    console.log('<<upComingGalleryWizard>>');

    var url = upComingGalleryPages.pop();
    console.log(url);
    var scraper = new upComingGalleryScraper(url);
    console.log('Requests Left: ' + upComingGalleryPages.length);
    scraper.on('error', function (error) {
      console.log(error);
      upComingGalleryWizard(done);
    });

    scraper.on('gallery_complete', function (listing) {

        if (listing['title'] == 'Ben-Hur') {
            dbIMDB.imdb.findAndModify({
                query: { _id: mongojs.ObjectId('5705057233c8ea8e13b62488')},
                update: { $push: {'gallery_full': { type: 'full', url: listing['picturesUrl']}} },
                new: false
            }, function (err, doc, lastErrorObject) {
                if (err)
                  console.log(err);
                else {
                  console.log('gallery_complete ----> ' + doc['title']);
                  upComingGalleryWizard(done);
                }
            });
        } else {
            dbIMDB.imdb.update({'title': listing['title']}, { $push: {'gallery_full': { type: 'full', url: listing['picturesUrl']}} }, function() {
                console.log(listing);
                console.log('got complete!\n\n');
                upComingGalleryWizard(done);    
            });
        }
    });
}

function upComingDescriptionWizard(done) {
    console.log('upComingDescriptionWizard --->');
    if (!upComingPosterPages.length) {
        done(null);
        return console.log('upComingDescriptionWizard Done!!!!');
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
                        update: { $set: {
                                description: listing['description'],
                                posterUrl: listing['url'],
                                posterHash: listing['hash']
                            } 
                        },
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
                    dbIMDB.imdb.update({'title': listing['title']}, {
                        $set: {
                            description: listing['description'],
                            posterUrl: listing['url'],
                            posterHash: listing['hash']
                        }
                    },
                    function() {
                        callback(null, 1);
                    });
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
    console.log('upComingPosterWizard --->');
    if (!upComingPosterImageObjs.length) {
        done(null);
        return console.log('upComingPosterWizard Done!!!!');
    }

    var obj = upComingPosterImageObjs.pop();

    if (!obj.url || obj.url.indexOf('.jpg')!= -1) {
        return upComingPosterWizard(done)
    }

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

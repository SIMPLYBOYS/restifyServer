var config = require('../config');
var Updater = require('../update/Updater');
var cheerio = require("cheerio");
var request = require("request");
var async = require('async');
var moment = require("moment")
var TrendsTrailer = require('./TrendsTrailer');
var trendsGalleryScraper = require('../crawler/trendsGalleryScraper');
var youTube = config.YouTube;
var dbJapan = config.dbJapan;
var posterUrl = [];
var galleryUrl = [];
var creditUrl = [];
var releaseUrl = [];
var galleryfullPages = [];
var title = [];
var delta = [];
var originTitle = [];
var score = [];
var votes = [];
var weeks = [];
var link = [];

exports.updateTrends = function() {
    async.series([
        resetPosition,
        insertTitle,
        insertRating,
        inserDelta,
        insertDetail,
        insertPoster,
        insertRadar,
        insertOriginTitle,
        insertAvatar,
        insertTrailer,
        prepareGalleryPages,
        resetGallery,
        GalleryWizard,
        InsertReleaseDatePages
    ],
    function (err) {
        if (err) console.error(err.stack);
          console.log('all jobs for trends update finished!!');
    });
};

function resetPosition (done) {
    dbJapan.japan.find({'top': {$lte:10, $gte:1}}, function(err, docs) {
        if (docs) {
            docs.forEach(function(doc, top){
                dbJapan.japan.update({'title': doc['title']}, {'$unset': {'top':1}});
            });
            done(null);
        } else {
            done(null);
        }
    });
}

function resetGallery (done) {
    
    dbJapan.japan.find({'top': {$lte:10, $gte:1}}, function(err, docs) {
        if (docs) {
            docs.forEach(function(doc, top){
                dbJapan.japan.update({'title': doc['title']}, {$unset: {gallery_full: 1}})
            });
            done(null);
        } else {
            done(null);
        }
    });
}

function insertTitle(done) {
    request({
        url: 'http://movie.walkerplus.com/ranking/',
        encoding: "utf8",
        method: "GET"
    }, function(err, response, body) {
        var $ = cheerio.load(body);
        
        $('.japanRanking table tr').each(function(index, item){ //fetch japan movie trends
            title.push($(item).find('a').text());
            link.push($(item).find('a').attr('href'));
        });
        var count = 0;
        console.log('insertTitle -------->')
        async.whilst(
            function() { return count < title.length},
            function(callback) {
                dbJapan.japan.findOne({'title': title[count]}, function(err, doc){
                    if (doc) {
                        dbJapan.japan.update({'title': title[count]}, {'$set': {'top': count+1}}, function(){
                            count++;
                            callback(null, count);
                        });
                    } else {
                        dbJapan.japan.insert({
                            'title': title[count],
                            'detailUrl': 'http://movie.walkerplus.com'+link[count],
                            'top': count+1
                        }, function() {
                            count++;
                            callback(null, count);
                        });
                    }
                });
            },
            function(err, n) {
                console.log('insertTitle finish ' + n);
                done(null);
            }
        );  
    });
}

function insertOriginTitle(done) {
    request({
        url: 'http://movies.yahoo.co.jp/ranking/',
        encoding: "utf8",
        method: "GET"
    }, function(err, response, body) {
        var $ = cheerio.load(body);
        
        $('#ranklst h3').each(function(index, item){ //fetch japan movie trends
            originTitle.push($(item).text());
        });
        var count = 0;
        console.log('insertOriginTitle -------->')
        async.whilst(
            function() { return count < title.length},
            function(callback) {
                dbJapan.japan.findOne({'title': title[count]}, function(err, doc){
                    if (doc) {
                        dbJapan.japan.update({'title': title[count]}, {'$set': {'originTitle': originTitle[count]}}, function(){
                            count++;
                            callback(null, count);
                        });
                    } 
                });
            },
            function(err, n) {
                console.log('insertOriginTitle finish ' + n);
                done(null);
            }
        );  
    });
}

function insertRating(done) {
    request({
        url: 'http://movies.yahoo.co.jp/ranking/',
        encoding: "utf8",
        method: "GET"
    }, function(err, response, body) {
        var $ = cheerio.load(body);
        
        $('#ranklst .rating-score').each(function(index, item){
            score.push($(item).text())
        });

        $('#ranklst .text-xxsmall').each(function(index, item){
            votes.push($(item).text().slice(1))
        });

        $('#ranklst .pl1em .label').each(function(index, item){
            weeks.push($(item).text())
        });

        var count = 0;
        console.log('insertRating -------->')
        async.whilst(
            function() { return count < title.length},
            function(callback) {
                dbJapan.japan.findOne({'title': title[count]}, function(err, doc){
                    if (doc) {
                        dbJapan.japan.update({'title': title[count]}, {'$set': {'rating': {
                            'score' : score[count],
                            'votes' : votes[count],
                            'weeks' : weeks[count],
                        }}}, function(){
                            count++;
                            callback(null, count);
                        });
                    } 
                });
            },
            function(err, n) {
                console.log('insertRating finish ' + n);
                done(null);
            }
        );  
    });
}



function inserDelta(done) {
    request({
        url: 'http://movie.walkerplus.com/ranking/japan/',
        encoding: "utf8",
        method: "GET"
    }, function(err, response, body) {
        var $ = cheerio.load(body);
        
        $('#rankingMovieList .mwb').each(function(index, item){
            if ($(item).find('.down').length != 0) {
                delta.push({
                    trends: "down",
                    message: $(item).find('.down span').text()
                })
            } else if ($(item).find('.up').length != 0) {
                delta.push({
                    trends: "up",
                    message: $(item).find('.up span').text()
                })
            } else {
                delta.push({
                    trends: "new",
                    message: $(item).find('.new span').text()
                })
            }
            
        });

        var count = 0;
        console.log('inserDelta -------->');
        async.whilst(
            function() { return count < delta.length},
            function(callback) {
                console.log(delta[count]);
                dbJapan.japan.findOne({'title': title[count]}, function(err, doc){
                    if (doc) {
                        dbJapan.japan.update({'title': title[count]}, {'$set': {'delta': delta[count]}}, function() {
                            count++;
                            callback(null, count);
                        });
                    } else {
                        console.log('doc not found in')
                    }
                });
            },
            function(err, n) {
                console.log('inserDelta finish ' + n);
                done(null);
            }
        );  
    });
}

function insertPoster(done) {
    request({
        url: 'http://movies.yahoo.co.jp/ranking/',
        encoding: "utf8",
        method: "GET"
    }, function(err, response, body) {
        var $ = cheerio.load(body);
        $('#yjMain .listview li a').each(function(index, item){
            // console.log($(item).attr('href'));
            posterUrl.push('http://movies.yahoo.co.jp' + $(item).attr('href'));
            galleryUrl.push('http://movies.yahoo.co.jp' + $(item).attr('href') + 'photo');
            creditUrl.push('http://movies.yahoo.co.jp' + $(item).attr('href') + 'credit')
        });
        var count = 0;
        async.whilst(
                function() { return count < posterUrl.length},
                function(callback) {
                    request({
                        url: posterUrl[count],
                        encoding: "utf8",
                        method: "GET"
                    }, function(err, response, body) {
                        if (err || !body) { count++; callback(null, count);}
                        var $ = cheerio.load(body);
                        $('.relative .thumbnail__figure ').each(
                            function(index, item) {
                                var url = $(item).attr('style').split('url(')[1].split(')')[0].slice(0);
                                url = url.slice(0, url.length);
                                console.log(url.trim());
                                dbJapan.japan.update({'title': title[count]}, {'$set': {'posterUrl': url.trim()}}, function(){
                                    count++;
                                    callback(null, count);
                                });
                            }
                        );
                    });
                },
                function(err, n) {
                    console.log('job3 finish ' + n);
                    done(null);
                }
        );
    });
}

function prepareGalleryPages(done) {
    var count = 0;
    async.whilst(
            function() { return count < galleryUrl.length},
            function(callback) {
                request({
                    url: galleryUrl[count],
                    encoding: "utf8",
                    method: "GET"
                }, function(err, response, body) {
                    if (err || !body) { count++; callback(null, count);}
                    var $ = cheerio.load(body);
                
                    for (i=1; i<=$('#pctrlst li').length; i++) {
                        galleryfullPages.push(galleryUrl[count]+'/?page=' + i);
                    }
                    count++;
                    callback(null, count);
                });
            },
            function(err, n) {
                console.log('prepareGalleryPages finish ' + n);
                done(null);
            }
    );
}

function InsertReleaseDatePages(done) {
    request({
        url: 'http://eiga.com/ranking/',
        encoding: "utf8",
        method: "GET"
    }, function(err, response, body) {
        var $ = cheerio.load(body);
        var foo = $('table tbody')[0];
        $(foo).find('em a').each(function(index, item){
            releaseUrl.push('http://eiga.com'+$(item).attr('href'));
        });
        
        var count = 0;
        async.whilst(
                function() { return count < releaseUrl.length},
                function(callback) {
                    request({
                        url: releaseUrl[count],
                        encoding: "utf8",
                        method: "GET"
                    }, function(err, response, body) {
                        if (err || !body) { count++; callback(null, count);}
                        var $ = cheerio.load(body);
                        var date = $('.opn_date').text();
                        dbJapan.japan.update({'title': title[count]}, {'$set': {'releaseDate': date}}, function(){
                            count++;
                            callback(null, count);
                        });
                    });
                },
                function(err, n) {
                    console.log('job3 finish ' + n);
                    done(null);
                }
        );
    });
}

function insertAvatar(done) {
    var count = 0;
    console.log('insertAvatar -------->' + creditUrl.length);
    async.whilst(
            function() { return count < creditUrl.length},
            function(callback) {
                request({
                    url: creditUrl[count],
                    encoding: "utf8",
                    method: "GET"
                }, function(err, response, body) {
                    if (err || !body) { console.log('body not found: ' + creditUrl[count]); count++; callback(null, count);}
                    var $ = cheerio.load(body);
                    var bar;
                    var cast = [];
                    var Cast,
                        As,
                        Link,
                        Avatar;
                        
                    $('.container .listview').each(function(index, item) {
                        if(index ==0) {
                            bar = item;
                        }
                    });

                    $(bar).each(function(index, item){
                        $(item).find('.pl1em').each(function(index, item) {
                            console.log($(item).find('h3').text().trim());
                            Cast = $(item).find('h3').text().trim();
                            console.log($(item).find('p').text().trim());
                            As = $(item).find('p').text().trim();
                            cast.push({
                                'cast': Cast,
                                'as': As
                            });
                        });
                        $(item).find('a').each(function(index, item) {
                            console.log('http://movies.yahoo.co.jp' + $(item).attr('href'));
                            Link = 'http://movies.yahoo.co.jp' + $(item).attr('href');
                            cast[index]['link'] = Link;
                        }); 
                        $(item).find('.thumbnail__figure').each(function(index, item){
                            console.log($(item).attr('style'));
                            if (typeof($(item).attr('style')) != 'undefined') {
                                var bar = $(item).attr('style').split('(')[1];
                                Avatar = bar.slice(0, bar.length-1);
                            } else {
                                Avatar = null;
                            }
                            cast[index]['avatar'] = Avatar;
                        });                     
                    });
                              
                    dbJapan.japan.update({'originTitle': originTitle[count]}, {'$set': {'cast': cast}}, function(){
                        count++;
                        callback(null, count);
                    });
                });
            },
            function(err, n) {
                console.log('insertAvatar finish ' + n);
                done(null);
            }
    );
}

function insertRadar(done) {
    var count = 0;
    async.whilst(
            function() { return count < posterUrl.length},
            function(callback) {
                request({
                    url: posterUrl[count],
                    encoding: "utf8",
                    method: "GET"
                }, function(err, response, body) {
                    if (err || !body) { count++; callback(null, count);}
                    var $ = cheerio.load(body);
                
                    var values = $('.rader-chart .rader-chart__figure')[0]['attribs']['data-chart-val-total'].split(',');
                    var points = []; //物語,配役,演出,映像,音楽 order in points 
                    values.forEach(function(item, index){
                        console.log(parseFloat(item));
                        points.push(item);
                    });
                    dbJapan.japan.update({'title': title[count]}, {'$set': {'radar': {
                        "points" : points
                    }}}, function(){
                        count++;
                        callback(null, count);
                    });
                });
            },
            function(err, n) {
                console.log('prepareGalleryPages finish ' + n);
                done(null);
            }
    );
}

function GalleryWizard(done) {

    if (!galleryfullPages.length) {
        done(null);
        return console.log('Done!!!!');
    }

    var url = galleryfullPages.pop();
    console.log(url);
    var scraper = new trendsGalleryScraper(url);
    console.log('Requests Left: ' + galleryfullPages.length);
    scraper.on('error', function (error) {
      console.log(error);
      GalleryWizard(done);(done);
    });

    scraper.on('complete', function (listing) {
        var title = listing['title'];
        dbJapan.japan.findAndModify({
            query: { 'originTitle': title },
            update: { $push: { gallery_full: { type: 'full', url: listing['picturesUrl']} }},
            new: true
        }, function (err, doc, lastErrorObject) {
            if (doc) {
                GalleryWizard(done);
            } else {
                console.log(listing['title'] + 'not found!');
                var title = listing['title'].split('�');
                var foo;
                title.forEach(function(item, index){
                    if (item.length > 0)
                        foo = item;
                });
                var query = {'originTitle': new RegExp(foo, 'i') };
                console.log(query);

                dbJapan.japan.findAndModify({
                    query: query,
                    update: { $push: { gallery_full: { type: 'full', url: listing['picturesUrl']} }},
                    new: true
                }, function (err, doc, lastErrorObject) {
                    console.log(doc);
                    GalleryWizard(done);
                });
            }           
        });
    });
}

function insertTrailer(done) {
    var count = 0;
    async.whilst(
        function() { return count < title.length},
        function(callback) {
            dbJapan.japan.findOne({title: title[count]}, function(err, doc) {
                if (doc) {
                    new TrendsTrailer(title[count], youTube, count, callback);
                    count++;
                } else {
                    count++;
                    callback(null, count);
                }
            });
        },
        function(err, n) {
            console.log('insertTrailer finish ' + n);
            done(null);
        }
    ); 
}

function insertDetail(done) {
    var count = 0;
        console.log('insertDetail -------->');
        async.whilst(
                function() { return count < title.length},
                function(callback) {
                    dbJapan.japan.findOne({'title': title[count]}, function(err, doc){
                        if (doc) {                           
                            request({
                                url: doc['detailUrl'],
                                encoding: "utf8",
                                method: "GET"
                            }, function(err, response, body) {
                                if (err || !body) { count++; callback(null, count);}
                                var $ = cheerio.load(body);
                                var staff = []
                                $('#staffTable tr').each(function(index, item){
                                    var title = $(item).find('th').text();
                                    if (index < 2) {
                                        $(item).find('a').each(function(index, item) {
                                            staff.push({'staff': title + ':' + $(item).text(),
                                                'link' : 'http://movie.walkerplus.com' + $(item).attr('href')
                                            });
                                        });
                                    }                                    
                                });

                                var data = [];
                                $('#infoBox table').each(function(index, item){$(item).find('tr').each(
                                    function(index, item){
                                        if ($(item).find('th').text() != '') {
                                            console.log($(item).find('th').text() +':' + $(item).find('td').text())
                                            data.push({
                                                'data': $(item).find('th').text() +':' + $(item).find('td').text()
                                            });
                                        }
                                    });
                                });

                                console.log(data);

                                var radar = $('.rader-chart__figure');
                                console.log('radar: ' + radar)

                                async.series([
                                    function(Innercallback) {
                                        dbJapan.japan.update({'title': title[count]}, {'$set': {'mainInfo': $('#mainInfo p').text()}},
                                        function() {
                                            Innercallback(null, 1);
                                        });
                                    },
                                    function(Innercallback) {
                                       dbJapan.japan.update({'title': title[count]}, {'$set': {'story': $('#strotyText').text()}},
                                       function() {
                                            Innercallback(null, 2);
                                       });
                                    },
                                    function(Innercallback) {
                                       dbJapan.japan.update({'title': title[count]}, {'$set': {'staff': staff}},
                                       function() {
                                            Innercallback(null, 3);
                                       });
                                    },
                                    function(Innercallback) {
                                       dbJapan.japan.update({'title': title[count]}, {'$set': {'data': data}},
                                       function() {
                                            Innercallback(null, 5);
                                       });
                                    }
                                ],
                                // optional callback
                                function(err, results){
                                    count++;
                                    callback(null, count);
                                });
                            });
                        }
                    });
                },
                function(err, n) {
                    console.log('insertDetail finish ' + n);
                    done(null);
                }
        );
}

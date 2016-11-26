var http = require('http');
var cheerio = require('cheerio');
var util = require('util');
var config = require('../config');
var myapiToken = config.myapiToken;
var dbIMDB = config.dbIMDB;
var youTube = config.youTube;
var dbRecord = config.dbRecord;
var dbReview = config.dbReview;
var async = require('async');
var request = require("request");
var MovieInfomer = require('../MovieInfomer');
var Trailer = require('../Trailer');
var Thumbnail = require('./Thumbnail');
var EventEmitter = require('events').EventEmitter;
var usCastAvatarScraper = require('../crawler/usCastAvatarScraper');
var trendsGalleryScraper = require('../crawler/trendsUsGalleryScraper');
var updateThumbnail = [];
var posterPages = [];
var finalCastPages = [];
var avatarUrl = [];
var finalReviewPages = [];
var GalleryPages = [];
var GalleryfullPages = [];

/*
 * Scraper Constructor
**/
function Creater (title, position) {
    this.title = title.split('(')[0].trim();
    this.position = parseInt(position);
    this.init();
}
/*
 * Make it an EventEmitter
**/
util.inherits(Creater, EventEmitter);

/*
 * Initialize scraping
**/
Creater.prototype.init = function () {
    this.on('updated', function (title) {
        console.log('\n====> \"'+title + '\" got updated!!!');
        this.emit('complete', title);
    });
    this.updateMovie();
};

/*
 * Parse html and return an object
**/
Creater.prototype.updateMovie = function () {
  
  var that = this;
  if (that['title'] == 'Дети небес')
    that['title'] = 'Bacheha-Ye aseman';

  dbIMDB.imdb.findOne({'title': that['title']}, function(err, doc) {

      if (!doc) {
        console.log('\n\n' + that['title'] + ' not found!');
        that.createMovie();
        return;     
      }

      dbIMDB.imdb.update({'title': that['title']}, {'$set': {'top': parseInt(that['position'])}}, function() {
        that.emit('updated', that.title);
      });
  });
};

Creater.prototype.createMovie = function () {
  var that = this;
  async.series([
      function(done){ return that.insertTitle(done);},
      function(done) { return that.fetchMovieInfo(done);},
      function(done) { return that.insertDetail(done);},
      insertCast,
      insertCastAvatar,
      // insertReview,
      prepareGalleryPages,
      GalleryWizard,
      function(done) { return that.insertPoster(done);},
      function(done) { return that.insertTrailer(done);},
      function(done) { return that.prepareRecords(done);},
      function(done) { return that.insertRecords(done);}
  ], function (err) {
        if (err) console.error(err.stack);
        console.log('\n\n-------- 2016 0520 final step ---------' + that.title );
        that.emit('updated', that.title);
        console.log('all finished!!');
  }); 
};

function insertReview(done) {
    console.log('insertReview -------->');
    var count = 0,
        end = finalReviewPages.length,
        cast;
    async.whilst(
        function () { return count < end; },
        function (callback) {
            var innerCount = 0,
                reviewer = [],
                name,
                avatar,
                topic,
                text = [],
                point = null,
                date,
                url;
            review = finalReviewPages.pop();

            if (typeof(review['votes']) == 'undefined') {
                console.log(review['title']+ ' no reviews!!');
                callback(null);
            }

            async.whilst(
                function () { console.log('innerCount: ' + innerCount); return innerCount < parseInt(review['votes']); },
                function (innercallback) {  
                    url = review['reviewUrl'].split('reviews?')[0]+'reviews?start='+innerCount;
                    console.log('reviewUrl: '+ url);
                    request({
                        url: url,   
                        encoding: "utf8",
                        method: "GET"
                    }, function(err, response, body) {
                        var $ = cheerio.load(body);
                        $('#tn15content div').each(function(index, item) { 

                            if (index%2 ==0) {
                                topic = $(item).find('h2').text().trim();
                                avatar = $(item).find('img')[0]['attribs']['src'];
                                name = $(item).find('a')[1]['children'].length != 0 ? $(item).find('a')[1]['children'][0]['data'] : '';

                                if (typeof($(item).find('img')[1])!='undefined')
                                    point = parseInt($(item).find('img')[1]['attribs']['alt'].split('/')[0]);
                                if ($(item).find('small').length == 2)
                                    date = $(item).find('small')[1]['children'][0]['data'];
                                else if ($(item).find('small').length == 3)
                                    date = $(item).find('small')[2]['children'][0]['data'];

                                reviewer.push({
                                    name: name,
                                    avatar: avatar,
                                    topic: topic,
                                    text: null,
                                    point: point,
                                    date: date
                                });
                            }
                        });
                         
                        $('#tn15content p').each(function(index, item) {
                            if($(item).text().indexOf('***') !=0 && $(item).text() !='Add another review')
                                text.push($(item).text().trim().replace(/(\n)/g," "));
                        });
                        innerCount+=10;
                        innercallback(null, innerCount);  
                    });
                },
                function (err, n) {
                    console.log(review['title'] + '-------->');
                    text.forEach(function(item, index) {
                        reviewer[index]['text'] = item
                    });

                    // console.log(JSON.stringify(reviewer));  
                    dbIMDB.imdb.findOne({title: review['title']}, function(err, doc) {
                        if (doc) {
                            dbReview.reviews.insert({
                                title: doc['title'],
                                review: reviewer
                            }, function(err, doc) {
                                if (!err) {
                                    console.log(review['title'] + 'finished insert review');
                                    count++;
                                    callback(null);
                                } else {
                                    console.log(review['title'] + 'fail to insert review');
                                    count++;
                                    callback(null);
                                }
                            });
                        } else {
                            console.log(review['title'] + ' not found!');
                            count++;
                            callback(null);
                        }
                    });       
                }
            );
        },
        function (err, n) {
            console.log('insertReview finished!');
            done(null);
        }
    );
}

function insertCast(done) {
    console.log('insertCast -------->');
    var count = 0,
        end = finalCastPages.length,
        cast,
        as = null,
        name,
        link,
        Cast;
    async.whilst(
        function () { return count < end; },
        function (callback) {
            cast = finalCastPages.pop();
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

                dbIMDB.imdb.findOne({title: cast['title']}, function(err, docs) {
                    if (typeof(docs['cast'])!='undefined') {
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
                var query = {'originTitle': new RegExp(foo, 'i') };
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

Creater.prototype.insertTitle = function(done) {
    var that = this;
    request({
        url: "http://www.imdb.com/chart/top",
        encoding: "utf8",
        method: "GET"
    }, function(err, response, body) {
        if (err || !body) { return; }

        var imdb_baseUrl = 'http://www.imdb.com';
        var $ = cheerio.load(body);
        var poster = {},
            title = {},
            rating = {},
            year = {};

        poster = $('.lister-list tr .posterColumn img');
        title = $('.lister-list tr .titleColumn a');
        rating = $('.lister-list tr .imdbRating strong');
        year = $('.lister-list tr .titleColumn .secondaryInfo');
        detailUrl = $('.titleColumn a');
        console.log('\n\n-------- 2016 0520 title --------- : ' + $(title[that.position-1]).text() + '\n' + that.title);
        dbIMDB.imdb.insert({
            'top': parseInt(that.position), 
            'title': $(title[that.position-1]).text(),
            'year': $(year[that.position-1]).text().slice(1,5),
            'rating': $(rating[that.position-1]).text(),
            'description': title[that.position-1]['attribs']['title'],
            'detailUrl': imdb_baseUrl + detailUrl[that.position-1]['attribs']['href'],
            'Infotitle': that.title
        }, function() {
            done(null);
        });  
    });
}

Creater.prototype.fetchMovieInfo = function(done) {
    var that = this;
    console.log('\n\n-------- 2016 0520 step2 --------- ' + that.title );
    dbIMDB.imdb.findOne({title: that.title}, function(err, doc) {
        if (doc) {
            new MovieInfomer(that.title, myapiToken, 0, done);
        } else {
            console.log(that.title + ' not found!');
            done(null);
        }
    });
}

Creater.prototype.insertDetail = function(done) {
    var that = this;
    console.log('\n\n-------- 2016 0520 step3 ---------' + that.title);
    dbIMDB.imdb.findOne({title: that.title}, function(err, doc) {
        if (doc) {
            request({
                url: doc['detailUrl'],
                encoding: "utf8",
                method: "GET" }, function(err, res, body) {

                    if (err || !body) 
                        return;

                    var $ = cheerio.load(body);
                    var url = $('.slate_wrapper .poster a img')[0];
                    var foo = $('.minPosterWithPlotSummaryHeight .poster img')[0];
                    var originTitle = $('.originalTitle').text().split('(')[0].trim();
                    var votes = $('.imdbRating a').text();
                    var title = originTitle == "" ? doc['title'] : originTitle;
                    var hash = $('.slate_wrapper .poster img')[0];
                    var rating = parseFloat($('.imdbRating .ratingValue strong span').text());
                    that.title = title;

                    finalCastPages.push({
                        castUrl: doc['detailUrl'].split('?')[0]+'fullcredits?ref_=tt_cl_sm#cast',
                        title: title
                    });

                    if (typeof(hash)!='undefined') {

                        hash = hash['attribs']['src'].split('images')[3].split('._V1')[0].slice(3);

                        if (hash.indexOf('@')!= -1) {
                            hash = hash.split('@')[0];
                        }

                        posterPages.push({
                            detailUrl: $('.slate_wrapper .poster a').length > 0 ? 'http://www.imdb.com'+$('.slate_wrapper .poster a')[0]['attribs']['href'] : 'http://ia.media-imdb.com/images/G/01/imdb/images/nopicture/180x268/film-173410679._CB282471105_.png',
                            posterHash: hash,
                            title: that.title
                        });

                    } else if ($('.minPosterWithPlotSummaryHeight .poster img') !=  null) {
                        obj = $('.minPosterWithPlotSummaryHeight .poster img')[0];

                        if (typeof(obj) != 'undefined') {
                            hash = obj['attribs']['src'].split('images')[3].split('._V1')[0].slice(3);

                            if (hash.indexOf('@')!= -1) {
                                hash = hash.split('@')[0];
                            }

                            var detailUrl = obj['attribs']['src'];

                            posterPages.push({
                                detailUrl: 'http://www.imdb.com'+$('.minPosterWithPlotSummaryHeight .poster a')[0]['attribs']['href'],
                                posterHash: hash,
                                title: that.title
                            });
                        }  
                    } else {
                        obj = $('.poster img')[0];

                        if (typeof(obj) != 'undefined') {
                            hash = obj['attribs']['src'].split('images')[3].split('._V1')[0].slice(3);

                            if (hash.indexOf('@')!= -1) {
                                hash = hash.split('@')[0];
                            }

                            var detailUrl = obj['attribs']['src'];

                            posterPages.push({
                                detailUrl: 'http://www.imdb.com'+$('.minPosterWithPlotSummaryHeight .poster a')[0]['attribs']['href'],
                                posterHash: hash,
                                title: that.title 
                            });
                        }  
                    }

                    var length = $('.titleReviewBarItem').length,
                        reviewUrl,
                        votes;

                    $('.titleReviewBarItem').each(function(index, item) {
                        if (length == 2 && $(item).find('.subText a').length == 2) {
                            console.log($(item).find('.subText a')[0]['attribs']['href']);
                            reviewUrl = doc['detailUrl'].split('?')[0]+$(item).find('.subText a')[0]['attribs']['href'];
                            votes = parseInt($(item).find('.subText a')[0]['children'][0]['data'].split('user')[0].trim().split(',').join(''));
                        } else if (length == 3 && index == 1) {
                            reviewUrl = doc['detailUrl'].split('?')[0]+$(item).find('.subText a')[0]['attribs']['href'];
                            votes = parseInt($(item).find('.subText a')[0]['children'][0]['data'].split('user')[0].trim().split(',').join('')); 
                        } else if (length == 1 && $(item).find('.subText a').length != 0) {
                            reviewUrl = doc['detailUrl'].split('?')[0]+$(item).find('.subText a')[0]['attribs']['href'];
                            votes = parseInt($(item).find('.subText a')[0]['children'][0]['data'].split('user')[0].trim().split(',').join('')); 
                        }
                    });

                    if (typeof(reviewUrl) !='undefined') {
                            finalReviewPages.push({
                            reviewUrl: reviewUrl,
                            title: title,
                            votes: votes
                        });
                    }

                    if ($('.combined-see-more a').length > 1) {
                        GalleryPages.push({
                            photoUrl: 'http://www.imdb.com'+$('.combined-see-more a')[1]['attribs']['href'],
                            page: Math.ceil(parseInt($('.combined-see-more a').text().split('photos')[0])/48),
                            title: title
                        });
                    }

                    if (typeof(url)!=='undefined') {
                        console.log(title);
                        console.log('.1-->'+url['attribs']['src']);
                        var poster = url['attribs']['src'];
                        var slate = $('.slate_wrapper .slate a img')[0]['attribs']['src'];
                        var summery = $('.plot_summary .summary_text').text().trim();

                        if ($($('#titleDetails .txt-block')[0]).find('.inline').text() == 'Country:')
                            var country = $('#titleDetails .txt-block')[0];
                        else
                            var country = $('#titleDetails .txt-block')[1];

                        var $country = $(country);

                        if ($country.find('a').length == 1)
                            country = $country.find('a').text();
                        else
                            country = $($country.find('a')[0]).text();

                        doc['detailContent'] = {
                            "slate": slate,
                            "summery": summery,
                            "country": country
                        };

                        dbIMDB.imdb.update({'title':doc['title']}, doc);
                        var bar = $('.slate_wrapper .poster a')[0];
                        var path = 'http://www.imdb.com' + bar['attribs']['href'];
                        console.log(path);
                        var hash = $('.slate_wrapper .poster img')[0];
                        hash = hash['attribs']['src'].split('images')[1].split('._V1')[0].slice(3);

                        if (hash.indexOf('@')!= -1) {
                            hash = hash.split('@')[0];
                        }

                        console.log('hash: ' + hash);
                        dbIMDB.imdb.update({title: doc['title']}, {$set: {
                            posterUrl: path,
                            posterHash: hash,
                            title: title,
                            votes: votes
                        }});

                    } else {
                        console.log(title);
                        var poster = foo['attribs']['src'];
                        var summery = $('.minPosterWithPlotSummaryHeight .summary_text').text().trim();

                        if ($($('#titleDetails .txt-block')[0]).find('.inline').text() == 'Country:')
                            var country = $('#titleDetails .txt-block')[0];
                        else
                            var country = $('#titleDetails .txt-block')[1];
                        var $country = $(country);
                        if ($country.find('a').length == 1)
                            country = $country.find('a').text();
                        else
                            country = $($country.find('a')[0]).text()

                        doc['detailContent'] = {
                            "summery": summery,
                            "country": country
                        };
                    
                        dbIMDB.imdb.update({'title':doc['title']}, doc);
                        var bar = $('.minPosterWithPlotSummaryHeight .poster a')[0];
                        var path = 'http://www.imdb.com' + bar['attribs']['href'];
                        console.log(path);
                        var hash = $('.minPosterWithPlotSummaryHeight .poster img')[0];
                        hash = hash['attribs']['src'].split('images')[1].split('._V1')[0].slice(3);

                        if (hash.indexOf('@')!= -1) 
                            hash = hash.split('@')[0];

                        dbIMDB.imdb.update({title: doc['title']}, {$set: {
                            posterUrl: path,
                            posterHash: hash,
                            title: title,
                            rating: {
                                score: rating,
                                votes: votes
                            }
                        }});
                    }
                    done(null);
          });
        } else {
            console.log(that.title + ' not found!');
            done(null);
        }
    });
}

function prepareGalleryPages(done) {
    console.log('prepareGalleryPages -------->');
    var count = 0,
        end = GalleryPages.length,
        gallery;
    async.whilst(
        function () { return count < end; },
        function (callback) {
            var innerCount = 0;
            gallery = GalleryPages.pop(); 
            dbIMDB.imdb.findOne({title: gallery['title']}, function(err, doc) {
                if (doc.hasOwnProperty('gallery_full')) {
                    count++;
                    callback(null, count);
                } else {
                    async.whilst(
                        function () { console.log('innerCount: ' + innerCount); return innerCount < gallery['page']; },
                        function (innercallback) {  
                            url = gallery['photoUrl'].split('?')[0]+'?page=' +(innerCount+1)+'&'+gallery['photoUrl'].split('?')[1];
                            console.log('detailUrl: '+ url);
                            request({
                                    url: url,   
                                    encoding: "utf8",
                                    method: "GET"
                            }, function(err, response, body) {
                                var $ = cheerio.load(body);
                                $('.media_index_thumb_list a').each(function(index, item) {
                                    if ($(item).attr('href') != '/register/login') {
                                        GalleryfullPages.push({
                                            photoUrl: 'http://www.imdb.com'+$(item).attr('href'),
                                            title: gallery['title']
                                        });
                                    }
                                });
                                innerCount++;
                                innercallback(null, innerCount);  
                            });

                        },
                        function (err, n) {
                            console.log(gallery['title'] + '=====> ready!');
                            count++;
                            callback(null, count);
                        }
                    );
                }
            });
        },
        function (err, n) {
            console.log(GalleryfullPages);
            console.log('prepareGalleryPages finished!');
            done(null);
        }
    );
}

Creater.prototype.insertPoster =function(done) {

    var that = this;
    console.log('\n\n-------- 2016 0520 step6 ---------' + that.title );

     dbIMDB.imdb.findOne({title: that.title}, function(err, doc) {

        if (doc) {
            var poster = posterPages.pop(); 
            console.log(poster['title'] + '---->');
            var path = poster['detailUrl'];
            var bar = path.split('title')[1];
            var posterUrl;
            path = path.split('title')[0] + '_json/title' + bar.split('mediaviewer')[0] + 'mediaviewer';
        
            request({
                url: path,
                encoding: "utf8",
                method: "GET"
            }, function(err, response, body) {
                var json = JSON.parse(body)['allImages'];

                json.forEach(function(item, index) {
                   if (item['src'].indexOf(poster['posterHash']) != -1) {
                        posterUrl = item['src'];
                   } 
                });

                dbIMDB.imdb.update({'title': poster['title']}, {'$set': {'posterUrl': posterUrl}}, function() {
                    console.log('posterUrl: ' + posterUrl);
                    done(null);
                });
            });    
        } else {
            console.log(that.title + ' not found!');
            done(null);
        }

    });
}

function GalleryWizard(done) {
    console.log('GalleryWizard --->');

    if (!GalleryfullPages.length) {
        done(null);
        return console.log('insert Gallery Done!!!!');
    }

    var gallery = GalleryfullPages.pop();
    var scraper = new trendsGalleryScraper(gallery);
    console.log('Requests Left: ' + GalleryfullPages.length);

    scraper.on('error', function (error) {
      console.log(error);
      GalleryWizard(done);
    });

    scraper.on('complete', function (listing) {
        var title = listing['title'];
        console.log(listing['picturesUrl']);
        dbIMDB.imdb.findAndModify({
            query: { 'title': title },
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
                dbIMDB.imdb.findAndModify({
                    query: query,
                    update: { $push: { gallery_full: { type: 'full', url: listing['picturesUrl']} }},
                    new: true
                }, function (err, doc, lastErrorObject) {
                    // console.log(doc);
                    GalleryWizard(done);
                });
            }           
        });
    });
}

Creater.prototype.insertTrailer = function(done) {
    var that = this;
    console.log('\n\n-------- 2016 0520 step8 --------- ' + that.title );
    dbIMDB.imdb.findOne({title: that.title}, function(err, doc) {
        if (doc) {
            new Trailer(that.title, youTube, 0, done);
        } else {
            console.log(that.title + ' not found!');
            done(null);
        }
    });
}

Creater.prototype.prepareRecords = function(done) {
    var that = this;
    console.log('\n\n-------- 2016 0520 step9 --------- ' + that.title );
    dbIMDB.imdb.findOne({title: that.title}, function(err, doc) {
        if (doc) {
            dbRecord.records.insert({
                'title': doc['title']
            }, function() {
                done(null);
            });
        } else {
            console.log(that.title + ' not found!');
            done(null);
        }
    });
}

Creater.prototype.insertRecords = function(done) {
    var that = this;
    console.log('\n\n-------- 2016 0520 step10 --------- ' + that.title );
    dbIMDB.imdb.findOne({title: that.title}, function(err, doc) {
        if (doc) {
            Url = "http://top250.info/movie/?" + doc['idIMDB'].slice(2)+'/full';
            request({
                url: Url,
                encoding: "utf8",
                method: "GET"
            }, function(err, response, body) {
                if (err || !body) { return; }
                var $ = cheerio.load(body);
                var movieRight = {},
                    token,
                    year,
                    month,
                    date,
                    position,
                    rating,
                    votes,
                    cast = [];

                movieRight = $('.movie_right');
                //fetch record
                var collecton = $(movieRight).find('table').find('tr');
                
                var records = [];

                for (i=0; i< collecton.length; i++) {
                    token = $(collecton[i]).find('td').text();
                    
                    if (!token.replace(/\s/g, '').length) {
                        console.log('got space string');
                        continue;
                    } else {
                        /*console.log(token.lastIndexOf('.') - findposition(token))
                        console.log(token);*/
                        year = token.substring(0,4);
                        month = token.substring(5,7);
                        date = token.substring(8,10);
                        position = token.substring(10, findposition(token));
                        rating = token.substring(token.lastIndexOf('.')-1,token.lastIndexOf('.')+2);
                        votes = token.substring(token.lastIndexOf('.')+2,token.length);
                        records.push({
                            'position': position, 
                            'year': year,
                            'month': month,
                            'date': date,
                            'rating': rating,
                            'votes': votes
                        });
                        console.log(year+' ' + month + ' ' + date + ' ' + position + ' ' + rating + ' ' + votes + '\n');
                    }
                }

                dbRecord.records.findOne({'title': doc['title']}, function(err, doc) {
                    dbRecord.records.update({'title': doc['title']}, {'$set': {'records': records}}, function() {
                        done(null);
                    });
                });
            });
        } else {
            console.log(that.title + ' not found!');
            done(null);
        }
    });
}

var findposition = function(token) {
    if (token.indexOf('*') == -1) {
        if (token.indexOf('↓') == -1) {
            if (token.indexOf('↑') == -1) {
                return token.lastIndexOf('-');
            }
            else {
                return token.indexOf('↑');
            }
        } else {
            return token.indexOf('↓');
        }
    } else { 
        return token.indexOf('*');
    }
}

function updateThumbnailWizard(doc, gallery, done) {
    if (!updateThumbnail.length) {
        doc["gallery_full"] = gallery;
        dbIMDB.imdb.update({
            'title': doc['title']}, doc);
        done(null);
        return console.log('Done!!!!');
    }
    var item = updateThumbnail.pop();
    if (item['title'].indexOf(',') != -1) {
        var bar = item['title'].split(',');
        console.log('\n\n----->' + bar[1] + ' ' + bar[0] + '\n\n');
        item['title'] = bar[1] + ' ' + bar[0];
        var thumbnail = new Thumbnail(item.title.trim(), item.thumbnailUrl);
    } else {
        var thumbnail = new Thumbnail(item.title, item.thumbnailUrl);
    }

    console.log('Requests Left: ' + updateThumbnail.length);
    thumbnail.on('error', function (error) {
      console.log(error);
      updateThumbnailWizard(doc, gallery, done);
    });

    thumbnail.on('complete', function (item) {
        // console.log(listing);
        gallery.push(item);
        console.log(item + ' got complete!');
        updateThumbnailWizard(doc, gallery, done);
    });
}

module.exports = Creater;

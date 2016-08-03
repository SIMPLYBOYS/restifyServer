var config = require('../config');
var Updater = require('../update/Updater');
var cheerio = require("cheerio");
var request = require("request");
var async = require('async');
var moment = require("moment")
var TrendsTrailer = require('../trends/TrendsTrailer');
var trendsGalleryScraper = require('../crawler/trendsUsGalleryScraper');
var usCastAvatarScraper = require('../crawler/usCastAvatarScraper');
var youTube = config.YouTube;
var dbIMDB = config.dbIMDB;
var dbReview = config.dbReview;
var posterPages = [];
var creditUrl = [];
var releaseUrl = [];
var GalleryfullPages = [];
var castPages = [];
var GalleryPages = [];
var finalVotesPages = [];
var finalCastPages = [];
var finalReviewPages = [];
var avatarUrl = [];
var reviewerUrl = [];
var delta = [];
var originTitle = [];
var score = [];
var votes = [];
var weeks = [];
var movieObj = [];
var genreType;

exports.updateGenres = function(type) {
    genreType = type;
    async.series([
        initScrape,
        insertDetail,
        insertCast,
        insertCastAvatar,
        insertReview,
        insertTrailer,
        prepareGalleryPages,
        insertPoster,
        GalleryWizard
    ],
    function (err) {
        if (err) console.error(err.stack);
          console.log('all jobs for updateGenres '+ genreType +' finished!!');
    });
};

function initScrape(done) {
    var count = 0;
    async.whilst(
        function () { return count < 20; },
        function (callback) {
            request({
                url: 'http://www.imdb.com/search/title?genres='+genreType+'&page='+(count+1)+'&sort=boxoffice_gross_us',
                encoding: "utf8",
                method: "GET"
            }, function(err, response, body) {
                var $ = cheerio.load(body);
                var top, link, title;
                // console.log('page '+(count+1)+'\n\n');
                $('.lister-list .lister-item').each(function(index, item) {
                    link = 'http://www.imdb.com'+$(item).find('.lister-item-image a').attr('href');
                    top = parseInt($(item).find('.lister-item-header .lister-item-index').text().split('.')[0]);
                    title = $(item).find('.lister-item-header a').text().trim();
                    console.log('title: '+title);
                    movieObj.push({
                        title: title,
                        top: top,
                        link: link
                    })
                });
                count++;
                callback(null, count);
            });
        },
        function (err, n) {
            // console.log(JSON.stringify(movieObj));
            console.log('initScrape finished!');
            done(null);
        }
    );
}

function insertPoster(done) {
    console.log('insertPoster ---->');
    var count = 0,
        end = posterPages.length;
        poster;
    async.whilst(
        function () { return count < end; },
        function (callback) {
            poster = posterPages.pop(); 
            console.log(poster['title'] + '---->');
            var path = poster['detailUrl'];
            var bar = path.split('title')[1];
            path = path.split('title')[0] + '_json/title' + bar.split('mediaviewer')[0] + 'mediaviewer';
            request({
                url: path,
                encoding: "utf8",
                method: "GET"
            }, function(err, response, body) {
                var json = JSON.parse(body)['allImages'];
                json.forEach(function(item, index){
                   if (item['src'].indexOf(poster['posterHash']) != -1) {
                     var posterUrl = item['src'];
                     dbIMDB.imdb.update({'title': poster['title']}, {'$set': {'posterUrl': posterUrl}}, function() {
                        console.log('posterUrl: ' + posterUrl);
                        count++;
                        callback(null, count);
                     });
                   }
                });
            });
        },
        function (err, n) {
            console.log('insertPoster finished!');
            done(null);
        }
    );
}

function prepareGalleryPages(done) {
    console.log('prepareGalleryPages -------->');
    var count = 0,
        end = GalleryPages.length;
        gallery;
    async.whilst(
        function () { return count < end; },
        function (callback) {
            var innerCount = 0;
            gallery = GalleryPages.pop(); 
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
                    console.log(gallery['title'] + '-------->');
                    count++;
                    callback(null, count);
                }
            );
        },
        function (err, n) {
            console.log(GalleryfullPages);
            console.log('prepareGalleryPages finished!');
            done(null);
        }
    );
}

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
                                console.log($(item).find('a')[1]['children'].length);
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
                                text.push($(item).text().trim());
                        });
                        innerCount+=10;
                        innercallback(null, innerCount);  
                    });
                },
                function (err, n) {
                    text.forEach(function(item, index) {
                        reviewer[index]['text'] = item
                    });
                    // console.log(JSON.stringify(reviewer));
                    dbIMDB.imdb.findOne({title: review['title']}, function(err, doc) {
                        if (doc) {
                            dbReview.reviews.insert({
                                title: doc['title']
                            }, function() {
                                dbReview.reviews.update({'title': doc['title']}, {$set: {review: reviewer}}, function() {
                                    console.log(review['title'] + 'finished insert review');
                                    callback(null);
                                });
                            });
                        } else {
                            console.log(review['title'] + ' not found!');
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
        cast,
        end = finalCastPages.length,
        as = null,
        name,
        link,
        Cast;
    async.whilst(
        function () { return count < end;},
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

                dbIMDB.imdb.findOne({title: cast['title']}, function(err, doc) {
                    if (doc.hasOwnProperty('cast')) {
                        count++;
                        callback(null, count);
                    } else {
                        dbIMDB.imdb.update({title: cast['title']}, {$set: {
                            cast: Cast
                        }}, function() {
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
    console.log('avatarPages left: '+avatarUrl.length);
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

function GalleryWizard(done) {
    console.log('GalleryWizard --->');
    if (!GalleryfullPages.length) {
        done(null);
        return console.log('Done!!!!');
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
                    console.log(doc);
                    GalleryWizard(done);
                });
            }           
        });
    });
}

function insertTrailer(done) {
    console.log('insertTrailer -------->');
    var count = 0;
    async.whilst(
        function() { return count < movieObj.length},
        function(callback) {
            dbIMDB.imdb.findOne({title: movieObj[count]['title']}, function(err, doc) {
                if (doc) {
                    new TrendsTrailer('us', movieObj[count]['title'], youTube, count, callback);
                    count++;
                } else {
                    count++;
                    callback(null, count);
                }
            });
        },
        function(err, n) {
            console.log('insert kr Trailer finish ' + n);
            done(null);
        }
    ); 
}

function insertDetail(done) {
    var count = 0;
        console.log('insertDetail -------->');
        async.whilst(
                function() { return count < movieObj.length; },
                function(callback) {
                    console.log(movieObj[count]['title']);
                    request({
                        url: movieObj[count]['link'],
                        encoding: "utf8",
                        method: "GET"
                    }, function(err, response, body) {
                        if (err || !body) { count++; callback(null, count);}
                        var $ = cheerio.load(body);
                        var originTitle = $('.originalTitle').text().split('(')[0].trim(),
                            genre = [],
                            releaseDate,
                            runTime,
                            type,
                            country,
                            budget,
                            cross,
                            story = "",
                            staff = [],
                            year,
                            studio = [],
                            cast = [],
                            rating,
                            votes,
                            mainInfo,
                            gallerySize,
                            data = [];

                        year = $('#titleYear a').text();
                        type = $('.subtext meta').attr('content');
                        runTime = $('.subtext time').text().trim();
                        mainInfo = $('.summary_text').text().trim();
                        story = $('.article .inline p').text().split('Written by')[0].trim();
                        rating = parseInt($('.imdbRating .ratingValue strong span').text());
                        votes = parseInt($('.imdbRating a').text());
                        
                        var end = $('.subtext a').length;
                        $('.subtext a').each(function(index, item) {
                            if (index < end-1)
                                genre.push($(item).text().trim());
                            else
                                releaseDate = $(item).text().split('(')[0].trim();
                        });

                        console.log('genre: ' + genre);

                        $('.credit_summary_item').each(function(index, item) {
                            if ($(item).text().trim().indexOf('Director') == 0) {
                                staff.push({
                                    staff: $(item).text().split(':')[1].split(',')[0].trim(),
                                    link: 'http://www.imdb.com'+$(item).find('span a')[0]['attribs']['href']
                                })
                            }
                        });

                        $('#titleDetails .txt-block').each(function(index, item) {
                            if ($(item).text().trim().indexOf('Budget') == 0)
                                budget = $(item).text().trim().split(':')[1].split('(')[0].trim();
                            else if ($(item).text().trim().indexOf('Gross') == 0)
                                cross = $(item).text().trim().split(':')[1].split('(')[0].trim();
                            else if ($(item).text().trim().indexOf('Country') == 0)
                                country = $(item).text().trim().split(':')[1].split('|')[0].trim();
                        });

                        $('.txt-block .itemprop').each(function(index, item) {
                            studio.push($(item).text());
                        });

                        data.push({
                            data: null
                        });

                        data.push({
                            data: year
                        });

                        data.push({
                            data: country
                        });

                        data.push({
                            data: studio.join(',')
                        });

                        data.push({
                            data: runTime
                        });

                        var length = $('.titleReviewBarItem').length,
                            reviewUrl,
                            votes;

                        $('.titleReviewBarItem').each(function(index, item) {
                            if (index == 0 && length == 2) {
                                reviewUrl = movieObj[count]['link'].split('?')[0]+$(item).find('.subText a')[0]['attribs']['href'];
                                votes = parseInt($(item).find('.subText a')[0]['children'][0]['data'].split('user')[0].trim());   
                            } else if (index == 1 && length == 3) {
                                reviewUrl = movieObj[count]['link'].split('?')[0]+$(item).find('.subText a')[0]['attribs']['href'];
                                votes = parseInt($(item).find('.subText a')[0]['children'][0]['data'].split('user')[0].trim()); 
                            }
                        });

                        finalReviewPages.push({
                            reviewUrl: reviewUrl,
                            title: movieObj[count]['title'],
                            votes: votes
                        });

                        finalCastPages.push({
                            castUrl: movieObj[count]['link'].split('?')[0]+'fullcredits?ref_=tt_cl_sm#cast',
                            title: movieObj[count]['title']
                        });

                        var hash = $('.slate_wrapper .poster img')[0];

                        if (typeof(hash)!='undefined') {
                            hash = hash['attribs']['src'].split('images')[1].split('._V1')[0].slice(3);

                            if (hash.indexOf('@')!= -1) {
                                hash = hash.split('@')[0];
                            }

                            posterPages.push({
                                detailUrl: 'http://www.imdb.com'+$('.slate_wrapper .poster a')[0]['attribs']['href'],
                                posterHash: hash,
                                title: movieObj[count]['title']
                            });
                        } else {
                            obj = $('.minPosterWithPlotSummaryHeight .poster img')[0];
                            hash = obj['attribs']['src'].split('images')[1].split('._V1')[0].slice(3);

                            if (hash.indexOf('@')!= -1) {
                                hash = hash.split('@')[0];
                            }

                            var detailUrl = obj['attribs']['src'];

                            posterPages.push({
                                detailUrl: 'http://www.imdb.com'+$('.minPosterWithPlotSummaryHeight .poster a')[0]['attribs']['href'],
                                posterHash: hash,
                                title: movieObj[count]['title']
                            });
                        }

                        if ($('.combined-see-more a').length!=0) {
                            GalleryPages.push({
                                photoUrl: 'http://www.imdb.com'+$('.combined-see-more a')[1]['attribs']['href'],
                                page: Math.ceil(parseInt($('.combined-see-more a').text().split('photos')[0])/48),
                                title: movieObj[count]['title']
                            });
                        }

                        dbIMDB.imdb.findOne({title: movieObj[count]['title']}, function(err, docs) {
                            if (!docs) {
                                dbIMDB.imdb.insert({
                                    title: movieObj[count]['title'],
                                    originTitle: originTitle,
                                    genre: genre,
                                    releaseDate: releaseDate,
                                    runTime: runTime,
                                    type: type,
                                    country: country,
                                    mainInfo: mainInfo,
                                    staff: staff,
                                    rating: {
                                        score: rating,
                                        votes: votes
                                    },
                                    story: story,
                                    data: data
                                },function() {
                                    console.log(movieObj[count]['title']+' updated!');
                                    count++;
                                    callback(null, count);
                                });
                            } else {
                                dbIMDB.imdb.update({'title': movieObj[count]['title']}, {'$set': {
                                    originTitle: originTitle,
                                    genre: genre,
                                    releaseDate: releaseDate,
                                    runTime: runTime,
                                    type: type,
                                    country: country,
                                    mainInfo: mainInfo,
                                    staff: staff,
                                    rating: {
                                        score: rating,
                                        votes: votes
                                    },
                                    story: story,
                                    data: data
                                }},function() {
                                    console.log(movieObj[count]['title']+' updated!');
                                    count++;
                                    callback(null, count);
                                });
                            }
                        });
                    });
                },
                function(err, n) {
                    console.log('posterPages --> ' + JSON.stringify(posterPages));
                    console.log('finalReviewPages --> ' + JSON.stringify(finalReviewPages));
                    console.log('finalCastPages --> ' + JSON.stringify(finalCastPages));
                    console.log('insertDetail finish ' + n);
                    done(null);
                }
        );
}

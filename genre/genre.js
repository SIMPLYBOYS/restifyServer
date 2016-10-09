var config = require('../config');
var Updater = require('../update/Updater');
var cheerio = require("cheerio");
var request = require("request");
var mongojs = require('mongojs');
var async = require('async');
var moment = require("moment")
var Trailer = require('../Trailer');
var trendsGalleryScraper = require('../crawler/trendsUsGalleryScraper');
var usCastAvatarScraper = require('../crawler/usCastAvatarScraper');
var tomatoKey = config.TomatoKey;
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
var scrapingTasks = [
    initScrape,
    insertDetail,
    insertRottenTomatoes,
    insertCast,
    insertCastAvatar,
    insertReview,
    insertTrailer,
    prepareGalleryPages,
    insertPoster,
    GalleryWizard
];

var cleaningTasks = [
    initClean/*,
    cleanMovie,
    insertDetail,
    insertCast,
    insertCastAvatar,
    insertReview,
    updateReview,
    insertTrailer,
    prepareGalleryPages,
    insertPoster,
    GalleryWizard*/
];

exports.updateGenres = function(type) {
    genreType = type;
    async.series(scrapingTasks, function (err) {
        if (err) console.error(err.stack);
          console.log('all jobs for updateGenres '+ genreType +' finished!!');
    });
};

function initClean(done) {
    dbIMDB.imdb.find({genre: genreType}, function(err, docs) {  
        docs.forEach(function(item, index) {
            if (!item.hasOwnProperty('description')) {
                console.log('removeList: ' + item['title'] + ' ' + item['_id']);
                movieObj.push({
                    title: item['title'],
                    originTitle: item['title'],
                    link: item['detailUrl'],
                    id: item['_id']
                });
            }
        })
        done(null);
    });
}

function insertRottenTomatoes(done) {
    var count = 0,
        url;
        console.log('insertRottenTomatoes -------->');
        async.whilst(
            function() { return count < movieObj.length; },
            function(callback) {
                url = 'http://api.rottentomatoes.com/api/public/v1.0/movies.json?apikey='+tomatoKey+'&q='+movieObj[count]['title'];
                console.log(url);
                request({
                    url: url,
                    encoding: "utf8",
                    method: "GET"
                }, function(err, response, body) {

                    if (err || !body) { 
                        count++; 
                        callback(null, count);
                        return;
                    }

                    console.log(JSON.parse(body)['total']);
                    var result = JSON.parse(body);

                    if (result['total'] == 0 || err) {
                        count++;
                        callback(null, count);
                        return;
                    } 

                    dbIMDB.imdb.update({'title': movieObj[count]}, {'$set': {
                            rottentomatoes: {
                                critics_score: result['movies'][0]['ratings']['critics_score'],
                                audience_score: result['movies'][0]['ratings']['audience_score'],
                                reviews: result['movies'][0]['links']['reviews']
                            }
                        }},function() {
                            console.log(movieObj[count] + ' updated!');
                            count++;
                            callback(null, count);
                    });
                });
            },
            function(err, n) {
                done(null);
            }
        );
}

function cleanMovie(done) {
    console.log('cleanMovie -------->');
    var count = 0;
    async.whilst(
        function() { return count < movieObj.length},
        function(callback) {
            dbIMDB.imdb.remove({_id: mongojs.ObjectId(movieObj[count]['id'])}, function(err, doc) {
                if (!err)
                    console.log('remove ' + movieObj[count]['id']+ 'success!');
                count++
                callback(null, count);
            });
        },
        function(err, n) {
            console.log('cleanMovie finish ' + n);
            done(null);
        }
    ); 
}

function initScrape(done) {
    var count = 0;
    async.whilst(
        function () { return count < 20; },
        function (callback) {
            request({
                url: 'http://www.imdb.com/search/title?genres='+genreType+'&title_type=feature&page='+(count+1)+'&sort=boxoffice_gross_us,desc&ref_=adv_prv',
                encoding: "utf8",
                method: "GET"
            }, function(err, response, body) {
                var $ = cheerio.load(body);
                var top, link, title, description;
                // console.log('page '+(count+1)+'\n\n');
                $('.lister-list .lister-item').each(function(index, item) {
                    description = [];
                    link = 'http://www.imdb.com'+$(item).find('.lister-item-image a').attr('href');
                    top = parseInt($(item).find('.lister-item-header .lister-item-index').text().split('.')[0]);
                    title = $(item).find('.lister-item-header a').text().trim();
                    
                    $(item).find('p').each(function(index, item) {
                        if (item['attribs']['class'] == '') {
                            // console.log($(item).find('a'));
                            $(item).find('a').each(function(innerindex, inneritem) {
                                if (innerindex == 0)
                                    description.push($(inneritem).text()+'(dir)');
                                else
                                    description.push($(inneritem).text());
                            });
                        }
                    });

                    console.log('description: '+description);
                    console.log('title: '+title);

                    movieObj.push({
                        title: title,
                        top: top,
                        link: link,
                        description: description.join(',')
                    });
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
        end = posterPages.length,
        poster;
    async.whilst(
        function () { return count < end; },
        function (callback) {
            poster = posterPages.pop(); 
            console.log(poster['title'] + '---->');

            if (poster['detailUrl'] == 'http://ia.media-imdb.com/images/G/01/imdb/images/nopicture/180x268/film-173410679._CB282471105_.png') {
                return dbIMDB.imdb.update({'title': poster['title']}, {'$set': {'posterUrl': poster['detailUrl']}}, function() {
                    count++;
                    callback(null, count);
                });
            }

            dbIMDB.imdb.findOne({title: poster['title']}, function(err, doc) {
                if (typeof(doc['posterUrl']) != 'undefined') {
                    count++;
                    callback(null, count);
                } else {
                    var path = poster['detailUrl'];
                    var bar = path.split('title')[1];
                    path = path.split('title')[0] + '_json/title' + bar.split('mediaviewer')[0] + 'mediaviewer';

                    request({
                        url: path,
                        encoding: "utf8",
                        method: "GET"
                    }, function(err, response, body) {
                        var json = JSON.parse(body)['allImages'],
                            posterUrl;

                        json.forEach(function(item, index) {
                           if (item['src'].indexOf(poster['posterHash']) != -1) {
                                posterUrl = item['src'];
                           } 
                        });

                        dbIMDB.imdb.update({'title': poster['title']}, {'$set': {'posterUrl': posterUrl}}, function() {
                            console.log('posterUrl: ' + posterUrl);
                            count++;
                            callback(null, count);
                        });
                    });
                }
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
        end = GalleryPages.length,
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
                    console.log(gallery['title'] + '=====> ready!');
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

function updateReview(done) {
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

            dbReview.reviews.findOne({title: review['title']}, function(err, doc) {
                if (doc) {
                    reviewer = doc['review'];
                    reviewer.forEach(function(item, index) {
                        item['text'] = item['text'].replace(/(\n)/g," ");
                    });
                    dbReview.reviews.update({'title': doc['title']}, {$set: {review: reviewer}}, function() {
                        console.log(review['title'] + ' finished insert review');
                        count++;
                        callback(null);
                    });
                } else {
                    count++;
                    callback(null);
                }
            });    
        },
        function (err, n) {
            console.log('updateReview finished!');
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
                                text.push($(item).text().trim().replace(/(\n)/g," "));
                        });

                        innerCount+=10;
                        innercallback(null, innerCount);  
                    });
                },
                function (err, n) {
                    text.forEach(function(item, index) {
                        reviewer[index]['text'] = item
                    });

                    dbReview.reviews.findOne({title: review['title']}, function(err, doc) {
                        if (doc) {
                            dbReview.reviews.update({'title': doc['title']}, {$set: {review: reviewer}}, function() {
                                console.log(review['title'] + ' finished insert review');
                                count++;
                                callback(null);
                            });
                        } else {
                            dbReview.reviews.insert({
                                title: review['title'],
                                review: reviewer
                            }, function(err, doc) {
                                if (!err) {
                                    console.log(review['title'] + ' finished insert review');
                                    count++;
                                    callback(null);
                                } else {
                                    console.log(review['title'] + 'fail to insert review');
                                    count++;
                                    callback(null);
                                }
                            });
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
            dbIMDB.imdb.findOne({title: cast['title']}, function(err, doc) {

                if (typeof(doc['cast'])!='undefined') {
                    console.log(cast['title'] + ' have cast field');
                    count++;
                    callback(null, count);
                    return;
                }

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
                        dbIMDB.imdb.update({title: cast['title']}, {$set: {
                            cast: Cast
                        }}, function() {
                            count++;
                            callback(null, count);
                        });
                    });
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
            var title = movieObj[count]['originTitle'] == "" ? movieObj[count]['title'] : movieObj[count]['originTitle']
            dbIMDB.imdb.findOne({title: title}, function(err, doc) {
                if (doc) {
                    new Trailer(title, youTube, count, callback);
                    count++;
                } else {
                    count++;
                    callback(null, count);
                }
            });
        },
        function(err, n) {
            console.log('insert Trailer finish ' + n);
            done(null);
        }
    ); 
}

function dataClean(done) {
    var count = 0;
        console.log('dataClean -------->');
        async.whilst(
                function() { return count < movieObj.length; },
                function(callback) {
                    console.log(movieObj[count]['title']);
                    dbIMDB.imdb.find({title: movieObj[count]['title']}, function(err, docs) {
                        console.log('length of '+movieObj[count]['title'] +': ========>' + docs.length);
                        count++;
                        callback(null, count);
                    });
                },
                function(err, n) {
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
                            mainInfo,
                            gallerySize,
                            title,
                            data = [],
                            end,
                            description = [];

                        movieObj[count]['originTitle'] = originTitle;
                        title = movieObj[count]['originTitle'] == "" ? movieObj[count]['title'] : movieObj[count]['originTitle'];
                        year = $('#titleYear a').text();
                        type = $('.subtext meta').attr('content');
                        runTime = $('.subtext time').text().trim();
                        mainInfo = $('.summary_text').text().trim();
                        story = $('.article .inline p').text().split('Written by')[0].trim();
                        rating = parseFloat($('.imdbRating .ratingValue strong span').text());
                        end = $('.subtext a').length;

                        $('.plot_summary .credit_summary_item').each(function(index, item) {
                            if ($(item).find('.inline').text() == 'Director:' && index == 0) 
                                description.push($(item).find('.itemprop').text().trim()+'(dir)')
                            else if ($(item).find('.inline').text() == 'Stars:') 
                                description.push($(item).find('.itemprop').text().trim());
                        });

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

                        console.log('budget: ' + budget + ' cross: ' + cross);

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
                            if (length == 2 && $(item).find('.subText a').length == 2) {
                                console.log($(item).find('.subText a')[0]['attribs']['href']);
                                reviewUrl = movieObj[count]['link'].split('?')[0]+$(item).find('.subText a')[0]['attribs']['href'];
                                votes = parseInt($(item).find('.subText a')[0]['children'][0]['data'].split('user')[0].trim().split(',').join(''));
                            } else if (length == 3 && index == 1) {
                                reviewUrl = movieObj[count]['link'].split('?')[0]+$(item).find('.subText a')[0]['attribs']['href'];
                                votes = parseInt($(item).find('.subText a')[0]['children'][0]['data'].split('user')[0].trim().split(',').join('')); 
                            } else if (length == 1 && $(item).find('.subText a').length != 0) {
                                reviewUrl = movieObj[count]['link'].split('?')[0]+$(item).find('.subText a')[0]['attribs']['href'];
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
                        
                        finalCastPages.push({
                            castUrl: movieObj[count]['link'].split('?')[0]+'fullcredits?ref_=tt_cl_sm#cast',
                            title: title
                        });

                        var hash = $('.slate_wrapper .poster img')[0];

                        if (typeof(hash)!='undefined') {
                            hash = hash['attribs']['src'].split('images')[3].split('._V1')[0].slice(3);

                            if (hash.indexOf('@')!= -1) {
                                hash = hash.split('@')[0];
                            }

                            posterPages.push({
                                detailUrl: $('.slate_wrapper .poster a').length > 0 ? 'http://www.imdb.com'+$('.slate_wrapper .poster a')[0]['attribs']['href'] : 'http://ia.media-imdb.com/images/G/01/imdb/images/nopicture/180x268/film-173410679._CB282471105_.png',
                                posterHash: hash,
                                title: title
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
                                    title: title
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
                                    title: title
                                });
                            }  
                        }

                        if ($('.combined-see-more a').length > 1) {
                            GalleryPages.push({
                                photoUrl: 'http://www.imdb.com'+$('.combined-see-more a')[1]['attribs']['href'],
                                page: Math.ceil(parseInt($('.combined-see-more a').text().split('photos')[0])/48),
                                title: title
                            });
                        }

                        dbIMDB.imdb.findOne({title: title}, function(err, doc) {
                            if (!doc) {
                                dbIMDB.imdb.insert({
                                    title: title,
                                    originTitle: originTitle,
                                    genre: genre,
                                    releaseDate: releaseDate,
                                    year: year,
                                    runTime: runTime,
                                    type: type,
                                    budget: budget,
                                    cross: cross,
                                    country: country,
                                    mainInfo: mainInfo,
                                    detailUrl: movieObj[count]['link'],
                                    description: description.join(','),
                                    staff: staff,
                                    rating: {
                                        score: rating,
                                        votes: votes
                                    },
                                    story: story,
                                    data: data
                                },function() {
                                    console.log(title+' updated!');
                                    count++;
                                    callback(null, count);
                                });
                            } else {
                                dbIMDB.imdb.update({'title': title}, {'$set': {
                                    title: title,
                                    originTitle: originTitle,
                                    genre: genre,
                                    releaseDate: releaseDate,
                                    runTime: runTime,
                                    year: year,
                                    type: type,
                                    country: country,
                                    budget: budget,
                                    cross: cross,
                                    mainInfo: mainInfo,
                                    detailUrl: movieObj[count]['link'],
                                    description: description.join(','),
                                    staff: staff,
                                    rating: {
                                        score: rating,
                                        votes: votes
                                    },
                                    story: story,
                                    data: data
                                }},function() {
                                    console.log(title+' updated!');
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

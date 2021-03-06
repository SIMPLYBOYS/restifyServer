var config = require('../config');
var Updater = require('../update/Updater');
var cheerio = require("cheerio");
var request = require("request");
var async = require('async');
var moment = require("moment")
var TrendsTrailer = require('./TrendsTrailer');
var trendsGalleryScraper = require('../crawler/trendsUsGalleryScraper');
var usCastAvatarScraper = require('../crawler/usCastAvatarScraper');
var tomatoKey = config.TomatoKey;
var youTube = config.YouTube;
var dbUSA = config.dbUSA;
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
        insertDetail,
        // insertRottenTomatoes,
        insertCast,
        insertCastAvatar,
        insertReview,
        insertTrailer,
        prepareGalleryPages,
        insertPoster,
        resetGallery,
        GalleryWizard
    ],
    function (err) {
        if (err) console.error(err.stack);
          console.log('all jobs for usTrends update finished!!');
    });
};

function insertRottenTomatoes(done) {
    var count = 0,
        url;
        console.log('insertRottenTomatoes -------->');
        async.whilst(
                function() { return count < 10; },
                function(callback) {
                    url = 'http://api.rottentomatoes.com/api/public/v1.0/movies.json?apikey='+tomatoKey+'&q='+title[count];
                    console.log(url);
                    request({
                        url: url,
                        encoding: "utf8",
                        method: "GET"
                    }, function(err, response, body) {
                        if (err || !body) { count++; callback(null, count);}
                        console.log(JSON.parse(body)['total']);
                        var result = JSON.parse(body);

                        if (result['total'] == 0) {
                            count++;
                            callback(null, count);
                            return;
                        } 

                        dbUSA.usa.update({'title': title[count]}, {'$set': {
                                rottentomatoes: {
                                    critics_score: result['movies'][0]['ratings']['critics_score'],
                                    audience_score: result['movies'][0]['ratings']['audience_score'],
                                    reviews: result['movies'][0]['links']['reviews']
                                }
                            }},function() {
                                count++;
                                console.log(title[count] + ' updated!');
                                callback(null, count);
                        });
                    });
                },
                function(err, n) {
                    done(null);
                }
        );
}

function resetPosition (done) {
    console.log('resetPosition ---->');
    dbUSA.usa.find({'top': {$lte:10, $gte:1}}, function(err, docs) {
        if (docs) {
            docs.forEach(function(doc, top){
                dbUSA.usa.update({'title': doc['title']}, {'$unset': {'top':1}});
            });
            done(null);
        } else {
            done(null);
        }
    });
}

function resetGallery (done) {
    console.log('resetGallery ---->');
    dbUSA.usa.find({'top': {$lte:10, $gte:1}}, function(err, docs) {
        if (docs) {
            docs.forEach(function(doc, top) {
                dbUSA.usa.update({'title': doc['title']}, {$unset: {gallery_full: 1}})
            });
            done(null);
        } else {
            done(null);
        }
    });
}

function insertTitle(done) {
    console.log('insertTitle ---->');
    request({
        url: 'http://www.imdb.com/chart/boxoffice',
        encoding: "utf8",
        method: "GET"
    }, function(err, response, body) {

        var $ = cheerio.load(body);

        $('#boxoffice tbody tr').each(function(index, item) {
            title.push($(item).find('.titleColumn a').text().trim());
            link.push('http://www.imdb.com'+$(item).find('.posterColumn a').attr('href'));
        });

        var count = 0;
        async.whilst(
            function() { return count < 10; },
            function(callback) {
                dbUSA.usa.findOne({'title': title[count]}, function(err, doc){
                    if (doc) {
                        dbUSA.usa.update({'title': title[count]}, {'$set': {'top': count+1}}, function(){
                            count++;
                            callback(null, count);
                        });
                    } else {
                        dbUSA.usa.insert({
                            'title': title[count],
                            'detailUrl': link[count],
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

function insertPoster(done) {
    console.log('insertPoster ---->');
    var count = 0,
        poster;
    async.whilst(
        function () { return count < 10; },
        function (callback) {
            poster = posterPages.pop(); 
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
                   console.log(item['src'].indexOf(poster['posterHash']) !== -1);
                   if (item['src'].indexOf(poster['posterHash']) != -1) {
                        posterUrl = item['src'];
                   } 
                });

                // console.log('posterUrl: ' + posterUrl);

                dbUSA.usa.update({'title': poster['title']}, {'$set': {'posterUrl': posterUrl}}, function() {
                    console.log('posterUrl: ' + posterUrl);
                    count++;
                    callback(null, count);
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
        gallery;
    async.whilst(
        function () { return count < 10; },
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
                    url = review['reviewUrl'].split('reviews?')[0]+'/reviews?start='+innerCount;
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
                                name = $(item).find('a')[1]['children'][0]['data'];

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
                    dbUSA.usa.update({'title': review['title']}, {'$set': {'review': reviewer}}, function() {
                        count++;
                        callback(null, count);
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
        as = null,
        name,
        link,
        Cast;
    async.whilst(
        function () { return count < 10; },
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

                dbUSA.usa.findOne({title: cast['title']}, function(err, docs) {
                    if (typeof(docs['cast'])!='undefined') {
                        count++;
                        callback(null, count);
                    } else {
                        dbUSA.usa.update({title: cast['title']}, {$set: {
                            cast: Cast
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
    console.log('avatarPages left: '+avatarUrl.length);
    var scraper = new usCastAvatarScraper(avatar);
    scraper.on('error', function (error) {
      console.log(error);
      insertCastAvatar(done);
    });

    scraper.on('complete', function (listing) {
        var title = listing['title'];
        console.log(listing['picturesUrl']);
        dbUSA.usa.findAndModify({
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
                dbUSA.usa.findAndModify({
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
        dbUSA.usa.findAndModify({
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
                dbUSA.usa.findAndModify({
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
        function() { return count < title.length},
        function(callback) {
            dbUSA.usa.findOne({title: title[count]}, function(err, doc) {
                if (doc) {
                    new TrendsTrailer('us', title[count], youTube, count, callback);
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
                function() { return count < 10; },
                function(callback) {
                    dbUSA.usa.findOne({'title': title[count]}, function(err, doc) {
                        if (doc) {                           
                            request({
                                url: doc['detailUrl'],
                                encoding: "utf8",
                                method: "GET"
                            }, function(err, response, body) {
                                if (err || !body) { count++; callback(null, count);}
                                var $ = cheerio.load(body),
                                    originTitle = $('.txt_origin').text(),
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
                                    data = [],
                                    end = $('.subtext a').length,
                                    description = [];

                                year = $('#titleYear a').text();
                                type = $('.subtext meta').attr('content');
                                runTime = $('.subtext time').text().trim();
                                mainInfo = $('.summary_text').text().trim();
                                story = $('.article .inline p').text().split('Written by')[0].trim();
                                rating = parseFloat($('.imdbRating .ratingValue strong span').text()); 
                                
                                $('.subtext a').each(function(index, item) {
                                    if (index < end-1)
                                        genre.push($(item).text().trim());
                                    else
                                        releaseDate = $(item).text().split('(')[0].trim();
                                });

                                $('.credit_summary_item').each(function(index, item) {
                                    if ($(item).text().trim().indexOf('Director') == 0) {
                                        staff.push({
                                            staff: $(item).text().split(':')[1].split(',')[0].trim(),
                                            link: 'http://www.imdb.com'+$(item).find('span a')[0]['attribs']['href']
                                        })
                                    }
                                });

                                $('.plot_summary .credit_summary_item').each(function(index, item) {
                                    if ($(item).find('.inline').text() == 'Director:' && index == 0) 
                                        description.push($(item).find('.itemprop').text().trim()+'(dir)')
                                    else if ($(item).find('.inline').text() == 'Stars:') 
                                        description.push($(item).find('.itemprop').text().trim());
                                });

                                console.log('description ----> ' + description);

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
                                        title: title[count],
                                        votes: votes
                                    });
                                }

                                finalCastPages.push({
                                    castUrl: doc['detailUrl'].split('?')[0]+'fullcredits?ref_=tt_cl_sm#cast',
                                    title: doc['title']
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
                                        title: title[count]
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
                                            title: title[count]
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
                                            title: title[count]
                                        });
                                    }  
                                }

                                if ($('.combined-see-more a').length > 1) {
                                    GalleryPages.push({
                                        photoUrl: 'http://www.imdb.com'+$('.combined-see-more a')[1]['attribs']['href'],
                                        page: Math.ceil(parseInt($('.combined-see-more a').text().split('photos')[0])/48),
                                        title: title[count]
                                    });
                                }
                
                                dbUSA.usa.update({'title': title[count]}, {'$set': {
                                        originTitle: null,
                                        genre: genre.join(','),
                                        releaseDate: releaseDate,
                                        runTime: runTime,
                                        type: type,
                                        country: country,
                                        mainInfo: mainInfo,
                                        description: description.join(','),
                                        staff: staff,
                                        rating: {
                                            score: rating,
                                            votes: votes
                                        },
                                        story: story,
                                        data: data
                                    }}, function() {
                                        count++;
                                        console.log(title[count] + ' updated!');
                                        callback(null, count);
                                });
                            });
                        }
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

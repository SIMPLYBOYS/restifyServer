var config = require('../config');
var Updater = require('../update/Updater');
var cheerio = require("cheerio");
var request = require("request");
var async = require('async');
var moment = require("moment")
var TrendsTrailer = require('./TrendsTrailer');
var trendsGalleryScraper = require('../crawler/trendsFrGalleryScraper');
var frCastAvatarScraper = require('../crawler/frCastAvatarScraper');
var youTube = config.YouTube;
var dbFrance = config.dbFrance;
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
          console.log('all jobs for trends update finished!!');
    });
};

function resetPosition (done) {
    console.log('resetPosition ---->');
    dbFrance.france.find({'top': {$lte:9, $gte:1}}, function(err, docs) {
        if (docs) {
            docs.forEach(function(doc, top){
                dbFrance.france.update({'title': doc['title']}, {'$unset': {'top':1}});
            });
            done(null);
        } else {
            done(null);
        }
    });
}

function resetGallery (done) {
    console.log('resetGallery ---->');
    dbFrance.france.find({'top': {$lte:9, $gte:1}}, function(err, docs) {
        if (docs) {
            docs.forEach(function(doc, top) {
                dbFrance.france.update({'title': doc['title']}, {$unset: {gallery_full: 1}})
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
        url: 'http://www.allocine.fr/boxoffice/france/',
        encoding: "utf8",
        method: "GET"
    }, function(err, response, body) {

        var $ = cheerio.load(body),
            foo;

        $('#col_main tbody tr').each(function(index, item){
            title.push($(item).find('h3 a').text().trim());
            link.push('http://www.allocine.fr' + $(item).find('h3 a').attr('href'));
        });
        
        var count = 0;
        async.whilst(
            function() { return count < 9},
            function(callback) {
                dbFrance.france.findOne({'title': title[count]}, function(err, doc){
                    if (doc) {
                        dbFrance.france.update({'title': title[count]}, {'$set': {'top': count+1}}, function(){
                            count++;
                            callback(null, count);
                        });
                    } else {
                        dbFrance.france.insert({
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
        function () { return count < 9 },
        function (callback) {
            poster = posterPages.pop(); 
            console.log(poster['title'] + '---->');
            request({
                url: poster['detailUrl'],
                encoding: "utf8",
                method: "GET"
            }, function(err, response, body) {

                var $ = cheerio.load(body),
                    url = $('.picture img').attr('src'),
                    title;

                $('.breadcrumb a').each(function(index, item){
                    if (index == 4)
                        title = $(item).text();
                });

                dbFrance.france.update({title: title}, {$set: {posterUrl: url}}, function(){
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
        function () { return count < 9 },
        function (callback) {
            gallery = GalleryPages.pop(); 
            console.log(gallery);
            request({
                url: gallery['photoUrl'],
                encoding: "utf8",
                method: "GET"
            }, function(err, response, body) {
                var $ = cheerio.load(body);
                $('#content-start .section').each(function(index, item){
                    $(item).find('a').each(function(innerIndex, item){
                        if (index ==0 && innerIndex == 0)
                            posterPages.push({
                                detailUrl: 'http://www.allocine.fr' + $(item).attr('href'),
                                title: title[count]
                            })
                        GalleryfullPages.push('http://www.allocine.fr' + $(item).attr('href'));
                    })
                });
                count++;
                callback(null, count);
            });
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
        cast;
    async.whilst(
        function () { return count < 9 },
        function (callback) {
            var innerCount = 0,
                reviewer = [],
                name,
                avatar,
                topic,
                text,
                point,
                date,
                url;
            review = finalReviewPages.pop();
            async.whilst(
                function () { console.log('innerCount: ' + innerCount); return innerCount < Math.ceil(parseInt(review['votes'])/10); },
                function (innercallback) {  
                    url = review['reviewUrl'] + '?page=' + (innerCount+1);
                    console.log('reviewUrl: '+ url);
                    request({
                        url: url,   
                        encoding: "utf8",
                        method: "GET"
                    }, function(err, response, body) {
                        var $ = cheerio.load(body);
                        $('.hred').each(function(index, item){
                            avatar = $(item).find('figure img')[0]['attribs']['data-src'];

                            if ($(item).find('.meta-title span')[0]['children'][0]['data'] == ' Un visiteur ')
                                name = 'Un visiteur';
                            else
                                name = $(item).find('.meta-title span')[1]['children'][0]['data'];
                            
                            point = $(item).find('.rating .stareval-note')[0]['attribs']['content'];
                            date = $(item).find('.rating .light')[1]['children'][0]['data'].split('le')[1].trim();
                            
                            if ($(item).find('p').length == 1)
                                text = $(item).find('p')[0]['children'][0]['data'].trim();
                            else
                                text = $(item).find('p')[1]['children'][0]['data'].trim();
                            
                            console.log(text);
                            reviewer.push({
                                name: name,
                                avatar: avatar,
                                topic: null,
                                text: text,
                                point: typeof(point)!== 'undefined' ? point.split(',')[0]+'.'+point.split(',')[1] : 0,
                                date: date
                            });
                        });
                        innerCount++;
                        innercallback(null, innerCount);  
                    });
                },
                function (err, n) {
                    console.log(review['title'] + '-------->');
                    console.log(reviewer);
                    dbFrance.france.update({'title': review['title']}, {'$set': {'review': reviewer}}, function(){
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
        as,
        link,
        Cast;
    async.whilst(
        function () { return count < 9 },
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
                $('article .section').each(function(index, item){
                    if (index > 0) {
                        $(item).find('.card').each(function(innerIndex, innerItem) {
                            name = $(innerItem).find('img').attr('alt');
                            as = $(innerItem).find('.meta-sub').text().trim().split(':')[1];
                            link = 'http://www.allocine.fr' + $(innerItem).find('a').attr('href');
                            var foo = $(innerItem).find('a').attr('href');
                            if (typeof(foo) != 'undefined') {
                                avatarUrl.push({
                                    'link': link,
                                    'cast': name,
                                    'title': cast['title']
                                });
                            } 
                            Cast.push({
                                cast: name,
                                as: as,
                                link: link,
                                avatar: null
                            });
                        });
                    }
                });

                dbFrance.france.update({title: cast['title']}, {$set: {
                    cast: Cast
                }}, function(){
                    count++;
                    callback(null, count);
                });
            });
        },
        function (err, n) {
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
    var scraper = new frCastAvatarScraper(avatar);
    scraper.on('error', function (error) {
      console.log(error);
      insertCastAvatar(done);
    });

    scraper.on('complete', function (listing) {
        var title = listing['title'];
        console.log(listing['picturesUrl']);
        dbFrance.france.findAndModify({
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
                dbFrance.france.findAndModify({
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

    var url = GalleryfullPages.pop();
    var scraper = new trendsGalleryScraper(url);
    console.log('Requests Left: ' + GalleryfullPages.length);
    scraper.on('error', function (error) {
      console.log(error);
      GalleryWizard(done);
    });

    scraper.on('complete', function (listing) {
        var title = listing['title'];
        console.log(listing['picturesUrl']);
        dbFrance.france.findAndModify({
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
                dbFrance.france.findAndModify({
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
            dbFrance.france.findOne({title: title[count]}, function(err, doc) {
                if (doc) {
                    new TrendsTrailer('fr', title[count], youTube, count, callback);
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
                function() { return count < 9},
                function(callback) {
                    dbFrance.france.findOne({'title': title[count]}, function(err, doc) {
                        if (doc) {                           
                            request({
                                url: doc['detailUrl'],
                                encoding: "utf8",
                                method: "GET"
                            }, function(err, response, body) {
                                if (err || !body) { count++; callback(null, count);}
                                var $ = cheerio.load(body);
                                var originTitle = $('.txt_origin').text(),
                                    genre,
                                    releaseDate,
                                    runTime,
                                    type,
                                    country,
                                    story = "",
                                    staff = [],
                                    year,
                                    studio,
                                    rating,
                                    votes,
                                    mainInfo,
                                    gallerySize,
                                    data = [];

                                $('.meta-body-item').each(function(index, item){
                                    if (index == 0) {
                                        releaseDate = $(item).find('strong').text().trim();
                                        year = releaseDate.split(' ')[2];
                                        runTime = $(item).text().trim().split('(')[1].split(')')[0]
                                    }
                                    else if (index == 1) {
                                        staff.push({
                                            'staff': $(item).find('a span').text().trim(),
                                            'link' : 'http://www.allocine.fr'+$(item).find('a').attr('href')
                                        });
                                    } else if (index == 2) {
                                        /*$(item).find('.blue-link').each(function(index, item) {
                                            if ($(item).text().trim() != 'plus')
                                                console.log($(item).text().trim());
                                        })*/
                                    } else if (index == 3) {
                                        genre = $(item).find('.blue-link').text().trim();
                                    }
                                    else if (index == 4) {
                                        country = $(item).find('.blue-link').text().trim().split(' ')[0]; //fetch main country
                                    }
                                });

                                mainInfo = $('.ovw-synopsis-txt').text().trim();

                                $('.ovw-synopsis-info .item').each(function(index, item) {
                                    var foo = $(item).find('.what').text().trim(),
                                        bar = $(item).find('.that').text().trim();
                                    if (foo == 'Distributeur') {   
                                        studio = bar;
                                    } else if (foo == 'Titre original') {
                                        originTitle = bar;
                                    }
                                });

                                $('.list_movie').find('dd').each(function(index, item){
                                    if (index == 0)
                                        genre = $(item).text().trim();
                                    else if (index == 1)
                                        releaseDate = $(item).text().trim();
                                    else if (index == 2) {
                                        var foo = $(item).text().trim().split(',');
                                        runTime = foo[0];
                                        type = foo[1];
                                        country = foo[2].trim();
                                    }
                                });

                                data.push({
                                    data: originTitle
                                });

                                data.push({
                                    data: year
                                });

                                data.push({
                                    data: country
                                });

                                data.push({
                                    data: studio 
                                });

                                data.push({
                                    data: runTime
                                });

                                $('.rating-row .rating-item').each(function(index, item) {
                                    if (index == 1) {
                                        rating = $(item).find('.stareval-note').text().trim();
                                        // console.log($(item).find('.stareval-review').text());
                                        $(item).find('.stareval-review span').each(function(index, item){
                                            if (index == 1)
                                                votes = $(item).text().trim();
                                        })
                                    }
                                });

                                $('.shot-holder a').each(function(index, item){
                                    if (index == 0) {            
                                        GalleryPages.push({
                                            photoUrl: 'http://www.allocine.fr' + $(item).attr('href').split('/detail')[0],
                                            title: title[count]
                                        });
                                        finalCastPages.push({
                                            castUrl: 'http://www.allocine.fr' + $(item).attr('href').split('photos')[0] + 'casting',
                                            title: title[count]
                                        });
                                        finalReviewPages.push({
                                            reviewUrl: 'http://www.allocine.fr' + $(item).attr('href').split('photos')[0] + 'critiques/spectateurs/',
                                            title: title[count],
                                            votes: parseInt(votes)
                                        });
                                    }
                                });
                
                                dbFrance.france.update({'title': title[count]}, {'$set': {
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
                                        story: null,
                                        data: data
                                    }},function() {
                                        count++;
                                        console.log(title[count] + ' updated!');
                                        callback(null, count);
                                });
                            });
                        }
                    });
                },
                function(err, n) {
                    console.log('finalReviewPages --> \n\n' + JSON.stringify(finalReviewPages));
                    console.log('insertDetail finish ' + n);
                    done(null);
                }
        );
}

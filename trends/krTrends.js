var config = require('../config');
var Updater = require('../update/Updater');
var cheerio = require("cheerio");
var request = require("request");
var async = require('async');
var moment = require("moment")
var TrendsTrailer = require('./TrendsTrailer');
var trendsGalleryScraper = require('../crawler/trendsKrGalleryScraper');
var youTube = config.YouTube;
var dbKorea = config.dbKorea;
var posterPages = [];
var creditUrl = [];
var releaseUrl = [];
var galleryfullPages = [];
var castPages = [];
var finalVotesPages = [];
var finalCastPages = [];
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
        insertDetail/*,
        prepareCastPages,
        insertCast,
        insertVotes,
        insertTrailer,
        prepareGalleryPages,
        resetGallery,
        GalleryWizard*/
    ],
    function (err) {
        if (err) console.error(err.stack);
          console.log('all jobs for trends update finished!!');
    });
};

function resetPosition (done) {
    console.log('resetPosition ---->');
    dbKorea.korea.find({'top': {$lte:10, $gte:1}}, function(err, docs) {
        if (docs) {
            docs.forEach(function(doc, top){
                dbKorea.korea.update({'title': doc['title']}, {'$unset': {'top':1}});
            });
            done(null);
        } else {
            done(null);
        }
    });
}

function resetGallery (done) {
    console.log('resetGallery ---->');
    dbKorea.korea.find({'top': {$lte:10, $gte:1}}, function(err, docs) {
        if (docs) {
            docs.forEach(function(doc, top){
                dbKorea.korea.update({'title': doc['title']}, {$unset: {gallery_full: 1}})
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
        url: 'http://ticket2.movie.daum.net/Movie/MovieRankList.aspx',
        encoding: "utf8",
        method: "GET"
    }, function(err, response, body) {

        var $ = cheerio.load(body),
            foo;
        
        $('.list_boxthumb li').each(function(index, item) {
            title.push($(item).find('.tit_join a').text().trim());
            link.push($(item).find('.tit_join a').attr('href'));
        });

        var count = 0;
        async.whilst(
            function() { return count < 10},
            function(callback) {
                dbKorea.korea.findOne({'title': title[count]}, function(err, doc){
                    if (doc) {
                        dbKorea.korea.update({'title': title[count]}, {'$set': {'top': count+1}}, function(){
                            count++;
                            callback(null, count);
                        });
                    } else {
                        dbKorea.korea.insert({
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
        function () { return count < 10 },
        function (callback) {
            poster = posterPages.pop(); 
            console.log(poster['title'] + '---->');
            request({
                url: poster['detailUrl'],
                encoding: "utf8",
                method: "GET"
            }, function(err, response, body) {
                var $ = cheerio.load(body);
                var url = $('#page_content img').attr('src');
                dbKorea.korea.update({title: poster['title']}, {$set: {posterUrl: url}}, function(){
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
    request({
        url: 'http://movie.naver.com/movie/sdb/rank/rreserve.nhn',
        encoding: "utf8",
        method: "GET"
    }, function(err, response, body) {
        var $ = cheerio.load(body);
        var page = [],
            thumbnailPages = [];
        $('tbody tr').each(function(index, item){
            if (typeof($(item).find('a').attr('href')) != 'undefined')
                page.push('http://movie.naver.com'+$(item).find('a').attr('href'));
        });
        console.log(page);

        async.series([
            function(callback) {
                console.log('prepareGalleryPages step1 --->');
                var Innercount = 0;
                async.whilst(
                    function () { console.log('Innercount: '+ Innercount); return Innercount < 10; },
                    function (innercallback) {
                        var url = page.pop();
                        request({
                            url: url,
                            encoding: "utf8",
                            method: "GET"
                        }, function(err, response, body) {
                            var $ = cheerio.load(body),
                                title,
                                posterUrl;

                            thumbnailPages.push({
                                detailUrl:'http://movie.naver.com/movie/bi/mi/photo.nhn' + $('._MoreBtn')[0]['attribs']['href'].slice(1).split('.nhn')[1],
                                gallerySize: parseInt($('._MoreBtn em').text())
                            });

                            $('.h_movie a').each(function(index, item) {
                                if (index == 0)
                                    title = $(item).text().trim();
                            })

                            posterUrl = $('.poster img').attr('src').split('=')[0] + '=m665_443_2';
                            console.log(posterUrl);

                            dbKorea.korea.update({title: title}, {$set: {posterUrl: posterUrl}}, function(){
                                Innercount++;
                                innercallback(null, Innercount);
                            });

                            /*posterPages.push({
                                detailUrl: 'http://movie.naver.com/movie/bi/mi/photoViewPopup.nhn?movieCode=' + $('._MoreBtn')[0]['attribs']['href'].split("=")[1].split('&')[0],
                                title: title
                            });*/  
                        });     
                    },
                    function (err, n) {
                        // console.log(thumbnailPages);
                        // console.log(posterUrl);
                        callback(null);
                    }
                );
            },
            function(callback) {
                console.log('prepareGalleryPages step2 --->');
                var innerCount = 0;
                async.whilst(
                    function () { console.log('innerCount: '+ innerCount); return innerCount < 10; },
                    function (innercallback) {
                        var detailUrl = thumbnailPages.pop();  //'&page=1#movieEndTabMenu'
                        var dinnerCount = 0;
                        console.log(detailUrl['gallerySize']);
                        async.whilst(
                            function () { console.log('dinnerCount: ' + dinnerCount); return dinnerCount < Math.ceil(detailUrl['gallerySize']/18); },
                            function (dinnercallback) {
                                request({
                                    url: detailUrl['detailUrl'] + '&page='+(dinnerCount+1)+'#movieEndTabMenu',
                                    encoding: "utf8",
                                    method: "GET"
                                }, function(err, response, body) {
                                    var $ = cheerio.load(body);
                                    $('#gallery_group ._brick').each(function(index, item){
                                        galleryfullPages.push('http://movie.naver.com/movie/bi/mi'+$(item).find('a').attr('href').slice(1));
                                    }) 
                                    dinnerCount++;
                                    dinnercallback(null, dinnerCount);
                                });
                                
                            },
                            function (err, n) {
                                // console.log(galleryfullPages);
                                innerCount++;
                                innercallback(null, innerCount);
                            }
                        );
                    },
                    function (err, n) {
                        callback(null);
                    }
                );
            }
        ],
        function(err, results) {
            done(null);
        });
    });
}

function prepareCastPages(done) {
    console.log('prepareCastPages -------->');
    var count = 0,
        cast;
    async.whilst(
        function () { return count < 10 },
        function (callback) {
            cast = castPages.pop(); 
            console.log(cast);
            request({
                url: cast['castUrl'],
                encoding: "utf8",
                method: "GET"
            }, function(err, response, body) {
                finalCastPages.push({
                    castUrl: response['request']['uri']['href'],
                    title: cast['title'],
                    rating: cast['rating']
                })
                count++;
                callback(null, count);
            });
        },
        function (err, n) {
            console.log('prepareCastPages finished!');
            finalVotesPages = JSON.parse(JSON.stringify(finalCastPages));
            console.log('finalVotesPages:');
            console.log(finalVotesPages);
            done(null);
        }
    );
}

function insertVotes(done) {
    console.log('insertVotes -------->');
    var count = 0,
        cast;
    async.whilst(
        function () { return count < 10 },
        function (callback) {
            cast = finalVotesPages.pop();
            request({
                url: cast['castUrl'].split('?')[0]+'/grade?'+cast['castUrl'].split('?')[1],    //http://movie.daum.net/moviedb/grade?movieId=88533&type=netizen&page=2
                encoding: "utf8",
                method: "GET"
            }, function(err, response, body) {
                var $ = cheerio.load(body);
                var foo = $('.on .num_review').text();
                votes = foo.slice(foo.indexOf('수')+1, foo.length-1);

                //TODO review info
                console.log('insert votes --->' + cast['title']);
                dbKorea.korea.update({title: cast['title']}, {$set: {rating: {
                    score: cast['rating'],
                    votes: votes
                }}}, function(){
                    count++;
                    callback(null, count);
                });
            });
        },
        function (err, n) {
            console.log('insertVotes finished!');
            done(null);
        }
    );
}

function insertCast(done) {
    console.log('insertCast -------->');
    var count = 0,
        cast;
    async.whilst(
        function () { return count < 10 },
        function (callback) {
            cast = finalCastPages.pop();
            console.log(cast['castUrl'].split('main?')[0]+'/crew?'+cast['castUrl'].split('?')[1]);
            request({
                url: cast['castUrl'].split('main?')[0]+'/crew?'+cast['castUrl'].split('main?')[1], 
                encoding: "utf8",
                method: "GET"
            }, function(err, response, body) {
                var $ = cheerio.load(body),
                    staff = [],
                    Cast = [];

                $('.movie_join li').each(function(index, item){
                    if (index == 0) {
                        staff.push({
                            'staff': $(item).find('.emph_point').text(),
                            'link' : 'http://movie.daum.net' + $(item).find('a').attr('href')
                        });
                    } else {
                        console.log($(item).find('.emph_point').text());
                        Cast.push({
                            cast: $(item).find('.emph_point').text(),
                            as: null,
                            link: 'http://movie.daum.net' + $(item).find('a').attr('href'),
                            avatar: $(item).find('.join_img img').attr('src') == '' ? 'http://image.eiga.k-img.com/images/profile/noimg/100.png?1423551130' : $(item).find('.join_img img').attr('src') 
                        })
                    }                    
                });

                dbKorea.korea.update({title: cast['title']}, {$set: {
                    cast: Cast,
                    staff: staff
                }}, function(){
                    count++;
                    callback(null, count);
                });
            });
        },
        function (err, n) {
            console.log('insertCast finished!');
            done(null);
        }
    );
}

function GalleryWizard(done) {
    console.log('GalleryWizard --->');
    if (!galleryfullPages.length) {
        done(null);
        return console.log('Done!!!!');
    }

    var url = galleryfullPages.pop();
    var scraper = new trendsGalleryScraper(url);
    console.log('Requests Left: ' + galleryfullPages.length);
    scraper.on('error', function (error) {
      console.log(error);
      GalleryWizard(done);(done);
    });

    scraper.on('complete', function (listing) {
        var title = listing['title'];
        console.log(listing['picturesUrl']);
        dbKorea.korea.findAndModify({
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
                dbKorea.korea.findAndModify({
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
            dbKorea.korea.findOne({title: title[count]}, function(err, doc) {
                if (doc) {
                    new TrendsTrailer('kr', title[count], youTube, count, callback);
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
                function() { return count < 10},
                function(callback) {
                    dbKorea.korea.findOne({'title': title[count]}, function(err, doc){
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
                                    rating,
                                    mainInfo,
                                    galleryfullPages,
                                    gallerySize,
                                    data = [];

                                    data.push({
                                        data: originTitle
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
                                    data: releaseDate.split('.')[0]
                                });

                                data.push({
                                    data: country
                                });

                                data.push({
                                    data: null  //studio office or film company
                                });

                                data.push({
                                    data: runTime
                                });

                                $('.desc_movie p').each(function(index, item){
                                    console.log($(item).text());
                                    if (index == 0)
                                        mainInfo = $(item).text().trim();
                                    else
                                        story = $(item).text().trim();
                                })

                                rating = parseFloat($('.subject_movie .raking_grade .emph_grade').text());

                                gallerySize = parseInt($('#photoTotalSize').text());
                                var foo = $('.wrap_slide')[0];
                                var photoListUrl = 'http://movie.daum.net' + $(foo).find('.link_related').attr('href');

                                castPages.push({
                                    castUrl: response['request']['headers']['referer'],
                                    title: title[count],
                                    rating: rating
                                });

                                dbKorea.korea.update({'title': title[count]}, {'$set': {
                                        originTitle: originTitle,
                                        genre: genre,
                                        releaseDate: releaseDate,
                                        runTime: runTime,
                                        type: type,
                                        country: country,
                                        mainInfo: mainInfo,
                                        story: story,
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
                    console.log('insertDetail finish ' + n);
                    done(null);
                }
        );
}

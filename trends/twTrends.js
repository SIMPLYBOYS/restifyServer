var config = require('../config');
var Updater = require('../update/Updater');
var cheerio = require("cheerio");
var request = require("request");
var async = require('async');
var moment = require("moment")
var TrendsTrailer = require('./TrendsTrailer');
var trendsGalleryScraper = require('../crawler/trendsKrGalleryScraper');
var youTube = config.YouTube;
var dbTaiwan = config.dbTaiwan;
var posterPages = [];
var creditUrl = [];
var releaseUrl = [];
var galleryPages = [];
var castPages = [];
var finalVotesPages = [];
var finalCastPages = [];
var finalReviewPages = [];
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
        resetGallery,
        insertGalleryPages,
        prepareReview,
        insertReview,
        insertTrailer,
        prepareCastPages,
        insertCountry,
        insertCast
    ],
    function (err) {
        if (err) console.error(err.stack);
          console.log('all jobs for trends update finished!!');
    });
};

function resetPosition (done) {
    console.log('resetPosition ---->');
    dbTaiwan.taiwan.find({'top': {$lte:20, $gte:1}}, function(err, docs) {
        if (docs) {
            docs.forEach(function(doc, top){
                dbTaiwan.taiwan.update({'title': doc['title']}, {'$unset': {'top':1}});
            });
            done(null);
        } else {
            done(null);
        }
    });
}

function resetGallery (done) {
    console.log('resetGallery ---->');
    dbTaiwan.taiwan.find({'top': {$lte:20, $gte:1}}, function(err, docs) {
        if (docs) {
            docs.forEach(function(doc, top){
                dbTaiwan.taiwan.update({'title': doc['title']}, {$unset: {gallery_full: 1}})
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
        url: 'https://tw.movies.yahoo.com/chart.html?cate=taipei',
        encoding: "utf8",
        method: "GET"
    }, function(err, response, body) {

        var $ = cheerio.load(body),
            originTitle = [],
            link = [],
            foo;
        
        $('table tr').each(function(index, item){
            $(item).find('td').each(function(index, item){
                if(index ==2) {
                    foo = $(item).find('a')[0]['attribs']['href'].split('*')[1];
                    link.push(foo);
                    galleryPages.push({
                        galleryUrl: foo.split('_')[0] + '_photos.html' + foo.split('_')[1].split('.html')[1],
                        title: typeof($(item).find('a')[0]['children'][0]['data']) != 'undefined' ? $(item).find('a')[0]['children'][0]['data'] : 
                        $(item).find('a')[1]['children'][0]['data']/*,
                        originTitle: $(item).find('a')[1]['children'][0]['data']*/
                    });
                    finalReviewPages.push({
                        reviewUrl: foo.split('_')[0] + '_review.html' + foo.split('_')[1].split('.html')[1],
                        title: typeof($(item).find('a')[0]['children'][0]['data']) == 'undefined' ? $(item).find('a')[1]['children'][0]['data'] :
                        $(item).find('a')[0]['children'][0]['data']
                    });
                    title.push($(item).find('a')[0]['children'][0]['data']);
                    console.log($(item).find('a')[1]['children'].length);
                    if ($(item).find('a')[1]['children'].length == 1)
                        originTitle.push($(item).find('a')[1]['children'][0]['data']);
                    else 
                        originTitle.push('');
                }
            });
        });

        var count = 0;
        async.whilst(
            function() { return count < title.length},
            function(callback) {
                if (typeof(title[count]) == 'undefined')
                    title[count] = originTitle[count];
                dbTaiwan.taiwan.findOne({'title': title[count]}, function(err, doc){
                    if (doc) {
                        dbTaiwan.taiwan.update({'title': title[count]}, {'$set':
                         {  title: title[count],
                            detailUrl: link[count],
                            originTitle: originTitle[count],
                            top: count+1
                         }}, function(){
                            count++;
                            callback(null, count);
                        });
                    } else {
                        dbTaiwan.taiwan.insert({
                            title: title[count],
                            detailUrl: link[count],
                            originTitle: originTitle[count],
                            top: count+1
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

function insertGalleryPages(done) {
    console.log('insertGalleryPages ---->');
    var count = 0;
    async.whilst(
        function () { console.log('count: '+ count); return count < 20; },
        function (callback) {
            var gallery = galleryPages.pop();
            console.log(gallery['gallerySize']+' pages');
            var galleryfullPages = [];
            var innerCount = 0;
            async.whilst(
                function () { console.log('innerCount: ' + innerCount); return innerCount < Math.ceil(gallery['gallerySize']/20); },
                function (innercallback) {
                    request({
                        url: gallery['galleryUrl'] + '&p='+(innerCount+1),
                        encoding: "utf8",
                        method: "GET"
                    }, function(err, response, body) {
                        var $ = cheerio.load(body); 
                        $('#albums li').each(function(index, item) {
                            var bar = $(item).find('a').attr('style').split('(')[1];
                            bar = bar.slice(0,bar.length-2);
                            bar = bar.split('mpho3')[0] + 'mpho' + bar.split('mpho3')[1];
                            galleryfullPages.push({
                                type: 'full',
                                url: bar
                            });
                        });
                        innerCount++;
                        innercallback(null, innerCount); 
                    });
                },
                function (err, n) {
                    console.log(galleryfullPages);
                    dbTaiwan.taiwan.update({title: gallery['title']}, {$set: {gallery_full: galleryfullPages}}, function(){
                        count++;
                        callback(null, count);
                    });  
                }
            );
            
        },
        function (err, n) {
            done(null);
        }
    );
}

function prepareCastPages(done) {
    console.log('prepareCastPages -------->');
    request({
        url: 'http://app2.atmovies.com.tw/boxoffice/twweekend/',
        encoding: "utf8",
        method: "GET"
    }, function(err, response, body) {
        var $ = cheerio.load(body);
        var count = 0;
        var foo = $($('table')[1]);
        var boxoffice = [];
        var boxTitle;

        foo.find('tr .at11 a').each(function(index, item) {
            if ($(item).text().indexOf(':') != -1) {
                boxTitle = $(item).text().split(':')[0].split(' ')[0];
            } else {
                boxTitle = $(item).text().split(' ')[0];
            }

            boxoffice.push({
                title: boxTitle,
                url: 'http://www.atmovies.com.tw/movie' + $(item).attr('href').split('film')[1],
                cast: 'http://app2.atmovies.com.tw/film/cast' + $(item).attr('href').split('film')[1]
            });
        });

        console.log(boxoffice);

        async.whilst(
            function() { return count < title.length},
            function(callback) {
                var box = boxoffice.pop();
                var query = {'title': new RegExp(box['title'], 'i') };
                dbTaiwan.taiwan.findAndModify({
                    query: query,
                    update: { $set: {
                        boxoffice: box['url'],
                        castUrl: box['cast']
                    }},
                    new: false
                }, function (err, doc, lastErrorObject) {
                    console.log(err);
                    count++;
                    callback(null, count);
                });
            },
            function(err, n) {
                console.log('insertTitle finish ' + n);
                done(null);
            }
        );  
    });
}

function prepareReview(done) {
    console.log('prepareReview --->');
    var cloneReview = JSON.parse(JSON.stringify(finalReviewPages));
    var count = 0,
        review;
    async.whilst(
        function () { return count < title.length },
        function (callback) {
            review = cloneReview.pop(); 
            console.log(review);
            console.log('<---->');
            request({
                url: review['reviewUrl'],
                encoding: "utf8",
                method: "GET"
            }, function(err, response, body) {
                var $ = cheerio.load(body); 
                $('.vlist .statistic em').each(function(index, item) {
                    if (index ==0) {
                        finalReviewPages[cloneReview.length]['votes'] = $(item).text();
                    }
                })
                count++;
                callback(null, count);
            });
        },
        function (err, n) {
            console.log(finalReviewPages);
            console.log('prepareReview finished!');
            done(null);
        }
    );
}

function insertReview(done) {
    console.log('insertReview -------->');
    var count = 0,
        cast;
    async.whilst(
        function () { return count < title.length },
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
                    url = review['reviewUrl']+'&s=0&o=0&p='+(innerCount+1);
                    console.log('reviewUrl: '+ url);
                    request({
                        url: url,   
                        encoding: "utf8",
                        method: "GET"
                    }, function(err, response, body) {
                        var $ = cheerio.load(body);
                        $('.bd-container .row').each(function(index, item) {
                            foo = $(item).find('.date').text();
                            bar = $(item).find('.rate img').attr('src');
                            name = foo.split('發表人：')[1].split('發表時間：')[0].trim();
                            text = $(item).find('.text p')[0]['children'][0]['data'];
                            point = parseFloat(bar.split('.gif')[0].slice(bar.split('.gif')[0].length-1));
                            topic = $(item).find('.text h4').text().split('標題：')[1].trim()
                            date = foo.split('發表人：')[1].split('發表時間：')[1];
                            reviewer.push({
                                name: name,
                                avatar: null,
                                topic: topic,
                                text: text,
                                point: point,
                                date: date
                            });
                        });
                        innerCount++;
                        innercallback(null, innerCount);  
                    });
                },
                function (err, n) {
                    console.log(review['title'] + '-------->');
                    dbTaiwan.taiwan.update({'title': review['title']}, {'$set': {'review': reviewer}}, function(){
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

function insertCountry(done) {
    console.log('insertCountry -------->');
    var count = 0;
    async.whilst(
        function() { return count < 20},
        function(callback) {
            dbTaiwan.taiwan.findOne({'title': title[count]}, function(err, doc){
                if (doc) {    
                    if (!doc.hasOwnProperty('boxoffice')) {count++; callback(null, count);return;}
                    request({
                        url: doc['boxoffice'],
                        encoding: "utf8",
                        method: "GET"
                    }, function(err, response, body) {
                        if (err || !body) { count++; callback(null, count);}
                        var $ = cheerio.load(body);
                        var filmBlock = $('#filmCastDataBlock ul')[1];
                        var castBlock = $('#filmCastDataBlock ul')[0];
                        var country;

                        $(filmBlock).find('li').each(function(index, item) { 
                            if ($(item).text().split(':')[0].indexOf('  國') != -1) {
                                country = $(item).text().split(':')[0].split('：')[1].trim();
                                // country = $(item).text().split(':')[0].split('：')[1];
                            }
                        });

                        console.log(doc['title'] + ' ' + country);

                        dbTaiwan.taiwan.findAndModify({
                            query: { 'title': doc['title']},
                            update: { $set: {
                                  country: country
                            }},
                            new: true
                        }, function (err, doc, lastErrorObject) {
                            count++;
                            callback(null, count);
                        });
                    });
                }
            });
        },
        function(err, n) {
            console.log('insertCountry finish ' + n);
            done(null);
        }
    );
}

function insertCast(done) {
    console.log('insertCountry -------->');
    var count = 0;
    async.whilst(
        function() { return count < title.length},
        function(callback) {
            dbTaiwan.taiwan.findOne({'title': title[count]}, function(err, doc){
                if (doc) {    
                    if (!doc.hasOwnProperty('castUrl')) {count++; callback(null, count);return;}
                    request({
                        url: doc['castUrl'],
                        encoding: "utf8",
                        method: "GET"
                    }, function(err, response, body) {
                        if (err || !body) { count++; callback(null, count);}
                        var $ = cheerio.load(body),
                            token = [],
                            name,
                            link;

                        $('.content ul li').each(function(index, item) {
                            name = $(item).text().trim().replace(/(\r\n|\n|\r|\t)/gm,"");
                            link = 'http://app2.atmovies.com.tw'+$(item).find('a').attr('href');
                            token.push({
                                name: name,
                                link: link
                            });
                            // console.log(token);
                        });
                        console.log('\n\n'+title[count]+' ---->');
                        var tag = [],
                            staff = [],
                            cast = [];

                        token.forEach(function(item, index) {
                            if (item['name'].indexOf('：')!=-1) {
                                // console.log(index);
                                // console.log(item);
                                tag.push(index);
                            } else {
                                // console.log(item);
                            }
                        });

                        tag.forEach(function(item, index) {
                            if (token[item]['name'].indexOf('演員') != -1) {
                                var bar = token.slice(item+1);  

                                bar.forEach(function(item, index) {
                                    cast.push({
                                        cast: item['name'].split('............')[0].trim(),
                                        link: item['link'],
                                        as: typeof(item['name'].split('............')[1]) == 'undefined' ? null : item['name'].split('............')[1],
                                        avatar: null
                                    });
                                });
                            } else if (token[item]['name'].indexOf('導演') != -1) {
                                var bar = token.slice(1, tag[item+1]);
                                bar.forEach(function(item, index) {
                                    staff.push({
                                        staff: item['name'],
                                        link: item['link']
                                    });
                                });
                            }
                        });

                        console.log('cast: ' + JSON.stringify(cast));
                        console.log('staff: ' + staff);
                       
                        dbTaiwan.taiwan.update({title: title[count]}, {$set: {
                            cast: cast,
                            staff: staff
                        }}, function(){
                            count++;
                            callback(null, count);
                        });
                    });
                }
            });
        },
        function(err, n) {
            console.log('insertCountry finish ' + n);
            done(null);
        }
    );
}

function insertTrailer(done) {
    console.log('insertTrailer -------->');
    var count = 0;
    async.whilst(
        function() { return count < title.length},
        function(callback) {
            dbTaiwan.taiwan.findOne({title: title[count]}, function(err, doc) {
                if (doc) {
                    new TrendsTrailer('tw', title[count], youTube, count, callback);
                    count++;
                } else {
                    count++;
                    callback(null, count);
                }
            });
        },
        function(err, n) {
            console.log('insert tw Trailer finish ' + n);
            done(null);
        }
    ); 
}

function insertDetail(done) {
    var count = 0;
        console.log('insertDetail -------->');
        async.whilst(
                function() { console.log(title[count]);return count < 20},
                function(callback) {
                    dbTaiwan.taiwan.findOne({'title': title[count]}, function(err, doc){
                        if (doc) {  
                            console.log(doc['detailUrl']);                         
                            request({
                                url: doc['detailUrl'],
                                encoding: "utf8",
                                method: "GET"
                            }, function(err, response, body) {
                                if (err || !body) { count++; callback(null, count);}
                                var $ = cheerio.load(body);
                                var genre,
                                    releaseDate,
                                    originTitle = null,
                                    runTime,
                                    type = null,
                                    votes,
                                    country,
                                    studio,
                                    story = null,
                                    rating,
                                    mainInfo,
                                    gallerySize,
                                    posterUrl,
                                    data = [];

                                data.push({
                                    data: originTitle
                                });

                                gallerySize = parseInt($('#ymvplb .statistic #plbsum').text());
                                galleryPages[count]['gallerySize'] = gallerySize;

                                $('.bd-container .bulletin p').each(function(index, item) {
                                    if (index ==0)
                                        releaseDate = $(item).find('.dta').text();
                                    if (index ==1) {
                                        genre = $(item).find('.dta').text();
                                        // console.log(genre);
                                    }  
                                    if (index ==2)
                                        runTime = $(item).find('.dta').text();
                                    if (index ==5)
                                        studio = $(item).find('.dta').text();
                                });

                                posterUrl = $('.bd-container .img a').attr('href').split('*')[1];
                                year = releaseDate.split('-')[0];
                                $('.full p').each(function(index, item) {
                                    if (index ==0)
                                        mainInfo = $(item).text();
                                });
                                rating = parseFloat($('#ymvis .rank-list .sum p em').text());
                                votes = parseInt($('#ymvis .rank-list .sum p span q').text());

                                data.push({
                                    data: year
                                });

                                data.push({
                                    data: 'country'
                                });

                                data.push({
                                    data: studio
                                });

                                data.push({
                                    data: runTime
                                });

                                dbTaiwan.taiwan.update({'title': title[count]}, {'$set': {
                                        genre: genre,
                                        releaseDate: releaseDate,
                                        runTime: runTime,
                                        type: type,
                                        country: country,
                                        mainInfo: mainInfo,
                                        posterUrl: posterUrl,
                                        rating: {
                                            score: rating,
                                            votes: votes
                                        },
                                        data: data,
                                        story: story
                                    }},function() {
                                        console.log(title[count] + ' updated!');
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

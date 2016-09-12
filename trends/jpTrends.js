var config = require('../config');
var Updater = require('../update/Updater');
var cheerio = require("cheerio");
var request = require("request");
var async = require('async');
var moment = require("moment")
var TrendsTrailer = require('./TrendsTrailer');
var trendsGalleryScraper = require('../crawler/trendsGalleryScraper')
var jpCastAvatarScraper = require('../crawler/jpCastAvatarScraper');
var youTube = config.YouTube;
var dbJapan = config.dbJapan;
var posterUrl = [];
var galleryUrl = [];
var creditUrl = [];
var releaseUrl = [];
var galleryfullPages = [];
var posterPages = [];
var avatarUrl = [];
var weeks = [];
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
        insertPoster,
        insertCastAvatar,
        insertTrailer,
        resetGallery,
        insertGallery,
        InsertReView
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
        url: 'http://eiga.com/ranking/',
        encoding: "utf8",
        method: "GET"
    }, function(err, response, body) {
        var $ = cheerio.load(body),
            foo,
            link = [],
            delta = [],
            count = 0;

        foo = $('table')[0];

        $(foo).find('tr').each(function(index, item) {
            if (index > 0) {
                if ($(item).find('.rank_new').length != 0) {
                    delta.push({
                        trends: "new",
                        diff: 0
                    });
                    weeks.push(1);
                } else {
                    var diff = parseInt($(item).find('td span')[0]['children'][0]['data']) - parseInt($(item).find('th').text());
                    delta.push({
                        trends: diff < 0 ? "down" : "up",
                        diff: diff
                    });
                    weeks.push(parseInt($(item).find('td span')[2]['children'][0]['data']));
                }
                title.push($(item).find('em img').attr('alt'));
                link.push('http://eiga.com' + $(item).find('em a').attr('href'));
            }    
        });

        console.log('insertTitle -------->');
        async.whilst(
            function() { return count < title.length},
            function(callback) {
                dbJapan.japan.findOne({'title': title[count]}, function(err, doc){
                    if (doc) {
                        dbJapan.japan.update({'title': title[count]}, {'$set': {
                            top: count+1,
                            detailUrl: link[count],
                            title: title[count],
                            delta: delta[count]
                        }}, function(){
                            count++;
                            callback(null, count);
                        });
                    } else {
                        dbJapan.japan.insert({
                            title: title[count],
                            detailUrl: link[count],
                            top: count+1,
                            delta: delta[count]
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
        function () { return count < title.length; },
        function (callback) {
            poster = posterPages.pop(); 
            console.log(poster['title'] + '---->');
            request({
                url: poster['detailUrl'],
                encoding: "utf8",
                method: "GET"
            }, function(err, response, body) {

                var $ = cheerio.load(body),
                    url = $('#movie_photo img').attr('src');

                dbJapan.japan.update({title: poster['title']}, {$set: {posterUrl: url}}, function(){
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

function insertGallery(done) {
    var count = 0,
        gallery_full = [];
    async.whilst(
            function() { gallery_full = []; return count < galleryUrl.length},
            function(callback) {
                request({
                    url: galleryUrl[count],
                    encoding: "utf8",
                    method: "GET"
                }, function(err, response, body) {
                    if (err || !body) { count++; callback(null, count);}
                    var $ = cheerio.load(body);
                
                    $('.galleryBox img').each(function(index, item){
                        gallery_full.push({
                            type: 'full',
                            url: $(item).attr('src').split('160.jpg')[0]+'640.jpg'+$(item).attr('src').split('160.jpg')[1]
                        })
                    });

                    dbJapan.japan.update({title: title[count]}, {$set: {gallery_full: gallery_full}}, function() {
                        console.log(gallery_full.length);
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

function InsertReView(done) {
    var count = 0;
    console.log('InsertReView -------->' + releaseUrl.length);
    async.whilst(
            function() { return count < releaseUrl.length},
            function(callback) {
                request({
                    url: releaseUrl[count]['link'],
                    encoding: "utf8",
                    method: "GET"
                }, function(err, response, body) {
                    if (err || !body) { count++; callback(null, count);}
                    var $ = cheerio.load(body);
                    var pages;

                    /*$('.pg_now b').each(function(index, item) {
                        if (index == 0) {
                            pages = parseInt($(item).text());
                            console.log(Math.floor(pages/20) + 1 + ' pages');
                        }
                    });*/

                    console.log(releaseUrl[count]['votes']+ ' pages');

                    var innerCount = 0;
                    var reviewer = [];
                    var name,
                        avatar,
                        topic,
                        text,
                        point,
                        date,
                        votes,
                        url;

                    url = releaseUrl[count]['link'];
                    votes = releaseUrl[count]['votes'];
                    console.log('<<InsertReView>> ' + url);
                    async.whilst(
                        function () { console.log('innerCount: ' + innerCount); return innerCount < Math.ceil(votes/20); },
                        function (innercallback) {
                            request({
                                url: url + 'all/' + (innerCount+1),
                                encoding: "utf8",
                                method: "GET"
                            }, function(err, response, body) {
                                if (err || !body) { innerCount++; innercallback(null, innerCount);}
                                var $ = cheerio.load(body);
                                $('.reviewBox .review').each(function(index, item) {
                                    console.log();
                                    topic = $(item).find('h3 a').text();
                                    name = $(item).find('.reviewer_m a').text();
                                    point = parseInt($(item).find('.reviewer_m strong').text());
                                    avatar = $(item).find('.reviewer_m img').attr('src');
                                    date = $(item).find('.reviewer_m dt').text().split('/')[1].trim();
                                    if ($(item).find('.hide').text() == '') 
                                        text = $(item).find('p').text();
                                    else 
                                        text = $(item).find('.hide').text();
                                    console.log(text);
                                    reviewer.push({
                                        name: name,
                                        avatar: avatar,
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
                            dbJapan.japan.update({'title': title[count]}, {'$set': {'review': reviewer}}, function(){
                                count++;
                                callback(null, count);
                            });
                        }
                    );
                });
            },
            function(err, n) {
                console.log('InsertReView finish ' + n);
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
    var scraper = new jpCastAvatarScraper(avatar);
    scraper.on('error', function (error) {
      console.log(error);
      insertCastAvatar(done);
    });

    scraper.on('complete', function (listing) {
        var title = listing['title'];
        console.log(listing['picturesUrl']);
        dbJapan.japan.findAndModify({
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
                dbJapan.japan.findAndModify({
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

function insertTrailer(done) {
    var count = 0;
    async.whilst(
        function() { return count < title.length},
        function(callback) {
            dbJapan.japan.findOne({title: title[count]}, function(err, doc) {
                if (doc) {
                    new TrendsTrailer('jp', title[count], youTube, count, callback);
                    count++;
                } else {
                    count++;
                    callback(null, count);
                }
            });
        },
        function(err, n) {
            console.log('insert jp Trailer finish ' + n);
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
                                console.log(title[count]+' ---->');
                                var $ = cheerio.load(body),
                                    story,
                                    rating,
                                    data = [],
                                    staff = [],
                                    cast = [],
                                    releaseDate,
                                    originTitle = null,
                                    name = '',
                                    votes,
                                    as = '',
                                    token,
                                    link;

                                story = $('.outline p').text();
                                rating = $('.rv strong').text();
                                votes = parseInt($('.rv div b').text());
                                releaseDate = $('.opn_date strong').text();

                                galleryUrl.push('http://eiga.com'+$('#gallery h3 a').attr('href'));
                                releaseUrl.push({
                                    link: 'http://eiga.com'+$('.bt_review a').attr('href'),
                                    votes: votes
                                });

                                posterPages.push({
                                    detailUrl: 'http://eiga.com'+$('.pictBox a').attr('href'),
                                    title: doc['title']
                                });

                                $('.dataBox table tr').each(function(index, item){
                                    token = $(item).text().trim()
                                    data.push({
                                            data: token
                                    });
                                });

                                data.forEach(function(item, index) {
                                    if (index == 0 && item['data'].indexOf('原題') == 0) {
                                        originTitle = item['data'].split('原題')[1].trim();
                                        data = data.slice(1);
                                    } else {
                                        if (item['data'].split(' ').length == 1)
                                            item['data'] = item['data'].split(' ')[0].trim(); 
                                        else
                                            item['data'] = item['data'].split(' ')[1].trim(); 
                                    }  
                                });

                                console.log(data);

                                if (data.length == 5) {
                                  data.push({
                                    data: null
                                  });
                                }

                                staff.push({
                                    staff: $('.staffBox dl a span').text(),
                                    link: 'http://eiga.com' + $('.staffBox dl a')[0]['attribs']['href']
                                });

                                $('.castBox ul li').each(function(index, item) {
                                    name = $(item).find('span a').text();
                                    link = 'http://eiga.com'+$(item).find('span a').attr('href');
                                    if (typeof($(item).find('span')[2]) != 'undefined')
                                        as = $(item).find('span')[2]['children'][0]['data'];
                                    else
                                        as = null;
                                    cast.push({
                                        cast: name,
                                        as: as,
                                        link: link,
                                        avatar: null
                                    });

                                    avatarUrl.push({
                                        cast: name,
                                        as: as,
                                        link: link,
                                        title: doc['title']
                                    });

                                });                               

                                dbJapan.japan.update({'title': title[count]}, {$set: {
                                    cast: cast,
                                    staff: staff,
                                    story: story,
                                    mainInfo: story,
                                    data: data,
                                    originTitle: originTitle,
                                    releaseDate: releaseDate,
                                    rating: {
                                        score : rating,
                                        votes : votes,
                                        weeks : weeks[count],
                                    }
                                }},
                                function() {
                                    count++;
                                    callback(null, 1);
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

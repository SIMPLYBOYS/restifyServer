var config = require('../config');
var Updater = require('../update/Updater');
var cheerio = require("cheerio");
var request = require("request");
var async = require('async');
var moment = require("moment")
var TrendsTrailer = require('./TrendsTrailer');
var youTube = config.YouTube;
var dbJapan = config.dbJapan;
var title = [];
var link = [];

exports.updateTrends = function() {
    async.series([
        insertTitle,
        insertDetail,
        insertPoster,
        insertTrailer
    ],
    function (err) {
        if (err) console.error(err.stack);
          console.log('all finished!!');
    });
};

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
        console.log('step1 -------->')
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
                console.log('job1 finish ' + n);
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
        var posterUrl = [];
        $('#yjMain .listview li a').each(function(index, item){
            // console.log($(item).attr('href'));
            posterUrl.push('http://movies.yahoo.co.jp' + $(item).attr('href'));
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
                                dbJapan.japan.findOne({'title': title[count]}, function(err, doc){
                                     dbJapan.japan.update({'title': title[count]}, {'$set': {'posterUrl': url.trim()}}, function(){
                                        count++;
                                        callback(null, count);
                                     });
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
            console.log('job3 finish ' + n);
            done(null);
        }
    ); 
}

function insertDetail(done) {
    var count = 0;
        console.log('step2 -------->');
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
                                var cast = [];
                                $('#castTable tr').each(function(index, item){
                                    console.log($(item).find('a').text());
                                    cast.push({
                                        'cast': $(item).find('a').text(),
                                        'link': 'http://movie.walkerplus.com' + $(item).find('a').attr('href')
                                    })
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
                                       dbJapan.japan.update({'title': title[count]}, {'$set': {'cast': cast}},
                                       function() {
                                            Innercallback(null, 4);
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
                    console.log('job2 finish ' + n);
                    done(null);
                }
        );
}

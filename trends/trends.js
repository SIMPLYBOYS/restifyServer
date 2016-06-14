var config = require('../config');
var Updater = require('../update/Updater');
var cheerio = require("cheerio");
var request = require("request");
var async = require('async');
var moment = require("moment");
var dbJapan = config.dbJapan;
var title = [];
var link = [];

exports.updateTrends = function() {
    async.series([
        insertTitle,
        insertDetail
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

var config = require('../config');
var Updater = require('../update/Updater');
var cheerio = require("cheerio");
var request = require("request");
var async = require('async');
var moment = require("moment");
var OpenCC = require('opencc');
var TrendsTrailer = require('../trends/TrendsTrailer');
var elastic = require('../search/elasticsearch');
var elasticClient = elastic.elasticClient;
var youTube = config.YouTube;
var dbIMDB = config.dbIMDB;
var posterPages = [];
var releaseUrl = [];
var moviePages = [ //specific for china movies
    100,
    100,
    100,
    100,
    100,
    100,
    100,
    100,
    100,
    100,
    100
];
var Cast = [];
var reviewer = [];
var title = [];
var movieList = [];
var link = [];
var rating = [];
var gallery_full = [];
var opencc = new OpenCC('s2tw.json');

exports.usaMovies = function() {
    async.series([
        insertTitle,
        insertDetail,
        createIndex
    ],
    function (err) {
        if (err) console.error(err.stack);
          console.log('all jobs for cnTrends update finished!!');
    });
};

function insertTitle(done) {
    console.log('insertTitle ---->');
    var count = 0,
        end = moviePages.length;
    async.whilst(
        function () { return count < end; },
        function (callback) {
            var innerCount = 0;
            async.whilst(
                function () { console.log('innerCount: ' + innerCount); return innerCount < moviePages[count]; },
                function (innercallback) {  
                    url = 'http://maoyan.com/films?sourceId=3&yearId='+(11-count)+'&offset='+(innerCount*30)+'&sortId=1';
                    request({
                        url: url,   
                        encoding: "utf8",
                        method: "GET"
                    }, function(err, response, body) {
                        var $ = cheerio.load(body);
                        console.log('yearPages: ' + (count+1) + '\n' + $('.movie-list .movie-item').length);

                        $('.movie-list .movie-item-title').each(
                            function(index, item) {
                                console.log(opencc.convertSync($(item).attr('title')));
                                link.push('http://maoyan.com'+$(item).find('a').attr('href'));
                                title.push(opencc.convertSync($(item).attr('title')));
                                movieList.push(opencc.convertSync($(item).attr('title')));
                            }
                        );

                        $('.movie-list .channel-detail').each(
                            function(index, item) {
                                var foo = $(item).find('.integer').text()+$(item).find('.fraction').text();
                                console.log(parseFloat(foo));
                                rating.push(parseFloat(foo));
                            }
                        );

                        innerCount++;
                        innercallback(null, innerCount);  
                    });
                },
                function (err, n) {
                    count++;
                    callback(null, count);
                }
            );
        },
        function (err, n) {
            console.log(link);
            console.log('prepareGalleryPages finished!');
            done(null);
        }
    );
}

function insertDetail(done) {
    var count = 0;
        console.log('insertDetail -------->');
        async.whilst(
                function() { return count < link.length; },
                function(callback) {
                    request({
                        url: link[count],
                        encoding: "utf8",
                        method: "GET"
                    }, function(err, response, body) {
                        if (err || !body) { count++; callback(null, count);}
                        var $ = cheerio.load(body);
                        var originTitle = $('.ename').text(),
                            eventList = [];

                        if ($('.award-list') != null) {
                            if ($('.award-list').length == undefined) {
                                $('.award-list .award-item').each(function(index, item) {
                                   if (index == 1) {
                                        console.log($(item).text().trim().split(' ')[0]);
                                       console.log($(item).find('.content').text().trim());
                                       if ($(item).find('.content').text().trim().indexOf('提名') == -1) {
                                         eventList.push({
                                            title: opencc.convertSync($(item).text().trim().split(' ')[0].replace(/\n/g,'')),
                                            award: opencc.convertSync($(item).find('.content').text().trim().split('获奖：')[1].split(' / ').join(',')),
                                            nominate: null,
                                            icon: $(item).find('img').attr('src')
                                         })
                                       } else {
                                         eventList.push({
                                            title: opencc.convertSync($(item).text().trim().split(' ')[0].replace(/\n/g,'')),
                                            award: null,
                                            nominate: opencc.convertSync($(item).find('.content').text().trim().split('提名：')[1].split(' / ').join(',')),
                                            icon: $(item).find('img').attr('src')
                                         })
                                       }
                                   }
                                   
                                });
                            } else {
                                $('.award-list .award-item').each(function(index, item) {
                                   if (index == 1) {
                                       console.log($(item).text().trim().split(' ')[0]);
                                       console.log($(item).find('.content').text().trim());
                                       if ($(item).find('.content').text().trim().indexOf('提名') == -1) {
                                         eventList.push({
                                            title: opencc.convertSync($(item).text().trim().split(' ')[0].replace(/\n/g,'')),
                                            award: opencc.convertSync($(item).find('.content').text().trim().split('获奖：')[1].split(' / ').join(',')),
                                            nominate: null,
                                            icon: $(item).find('img').attr('src')
                                         })
                                       } else {
                                         eventList.push({
                                            title: opencc.convertSync($(item).text().trim().split(' ')[0].replace(/\n/g,'')),
                                            award: null,
                                            nominate: opencc.convertSync($(item).find('.content').text().trim().split('提名：')[1].split(' / ').join(',')),
                                            icon: $(item).find('img').attr('src')
                                         })
                                       }  
                                   }     
                                });
                            }
                        }

                        console.log(originTitle+'\n'+eventList);      
                        dbIMDB.imdb.findOne({title: originTitle}, function(err, doc) {
                            if (doc) {
                                dbIMDB.imdb.update({'title': originTitle}, {'$set': {
                                        eventList: eventList,
                                    }}, function() {
                                        count++;
                                        eventList = [];
                                        console.log(movieList[count] + ' updated!');
                                        callback(null, count);
                                });
                            } else {
                                count++;
                                eventList = [];
                                console.log(movieList[count] + ' updated!');
                                callback(null, count);
                            }
                        });                                       
                    });
                },
                function(err, n) {
                    console.log('insertDetail finish ' + n);
                    done(null);
                }
        );
}

function insertTrailer(done) {
    console.log('insertTrailer -------->');
    var count = 0;
    async.whilst(
        function() { return count < movieList.length},
        function(callback) {
            dbIMDB.imdb.findOne({title: movieList[count]}, function(err, doc) {
                if (doc) {
                    new TrendsTrailer('us', movieList[count], youTube, count, callback);
                    count++;
                } else {
                    count++;
                    callback(null, count);
                }
            });
        },
        function(err, n) {
            console.log('insert usa Trailer finish ' + n);
            done(null);
        }
    ); 
}

function cleanData(done) {
    var movieObj = [];
    dbIMDB.imdb.find({}, function(err, docs) {  
        docs.forEach(function(item, index) {
            if (!item.hasOwnProperty('posterUrl') || item['genre'].indexOf('電視劇') != -1) {
                console.log('removeList: ' + item['title'] + ' ' + item['_id']);
                movieObj.push({
                    title: item['title'],
                    id: item['_id']
                });
            }
        })
        var count = 0;
        async.whilst(
            function() { return count < movieObj.length},
            function(callback) {
                dbChina.china.remove({title: movieObj[count]['title']}, function(err, doc) {
                    if (!err) {
                        count++;
                        callback(null, count);
                    }
                });
            },
            function(err, n) {
                console.log('clean kr films finish ' + n);
                done(null);
            }
        );
    });
}

function createIndex(done) {
    var movieObj = [];
    dbIMDB.imdb.find({}, function(err, docs) {  
        docs.forEach(function(item, index) {
            if (item['country'] == 'USA') {
                movieObj.push({
                    title: item['title'],
                    id: item['_id'],
                    posterUrl: item['posterUrl'],
                    description: item['description']
                });
            }  
        });
        console.log(movieObj.length);
        var count = 0;
        async.whilst(
            function() { return count < movieObj.length},
            function(callback) {
                console.log('count: ' + count);
                elasticClient.index({
                    index: 'test',
                    type: 'imdb',
                    id: movieObj[count]['id'].toString(),
                    body: {
                      title: movieObj[count]['title'],
                      posterUrl: movieObj[count]['posterUrl'],
                      description: movieObj[count]['description']
                    }
                  }, function (error, response) {
                    console.log(error+'\n'+response);
                    if (!error) {
                        count++;
                        callback(null, count);
                    }
                    // console.log('finish create Index!');
                  });
            },
            function(err, n) {
                console.log('us films indexing finish ' + n);
                done(null);
            }
        );
    });
}
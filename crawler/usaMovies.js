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
var moviePages = [
    [81,80,13,9,22,28,33,11,12,14,15,3,10,9,7,10,0,1,2,6,8],
    [71,94,12,10,20,25,25,10,13,14,13,3,14,8,12,15,0,1,2,10,14],
    [69,85,13,9,18,21,22,10,12,12,11,4,16,8,13,15,0,0,2,12,17],
    [64,84,10,9,18,23,22,9,11,12,12,3,18,7,12,15,0,2,2,11,16],
    [53,79,10,9,16,19,18,8,9,10,10,3,18,6,11,11,1,1,2,9,11],
    [47,64,10,8,14,17,16,7,8,10,8,3,18,6,11,11,0,2,2,8,9],
    [100,100,100,71,100,100,100,65,75,78,93,26,100,56,84,100,0,0,13,45,45],
    [100,100,32,27,58,31,60,18,27,29,38,5,51,18,28,40,0,1,6,10,14],
    [93,79,17,18,30,25,24,11,17,17,21,5,23,10,17,25,1,0,4,5,9],
    [85,57,9,13,18,17,17,9,13,9,22,4,16,7,11,19,0,1,11,4,6]
    [100,100,100,100,77,23,31,57,87,21,95,40,49,19,42,100,2,0,100,16,13]
]; //specific for usa movies
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
          console.log('all jobs for usaMovies update finished!!');
    });
};

function insertTitle(done) {
    console.log('insertTitle ---->');
    var yearCount = 0,
        end = moviePages.length;
    async.whilst(
        function () { return yearCount < end; },
        function (yearCallback) {
            var genreCount = 0;
            async.whilst(
                function () { console.log('genreCount: ' + genreCount); return genreCount < moviePages[yearCount].length; },
                function (genreCallback) {  
                    var pageCount = 0;
                    async.whilst(
                        function() { return pageCount <  moviePages[yearCount][genreCount]},
                        function(pageCallback) {
                            url = 'http://maoyan.com/films?sourceId=3&yearId='+(11-yearCount)+'&offset='+(pageCount*30)+'&sortId=1'+'&catId='+(genreCount+1);
                            request({
                                url: url,   
                                encoding: "utf8",
                                method: "GET"
                            }, function(err, response, body) {
                                var $ = cheerio.load(body);
                                console.log('yearPages: ' + (yearCount+1) + '\n' + $('.movie-list .movie-item').length);

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

                                pageCount++;
                                pageCallback(null, pageCount);  
                            });
                        },
                        function(err, n) {
                            genreCount++;
                            genreCallback(null, genreCount);  
                        }
                    )
                },
                function (err, n) {
                    yearCount++;
                    yearCallback(null, yearCount);
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

                        if ($('.tab-award li').length > 0) {
                            $('.tab-award li').each(function(index, item) {
                                if ($(item).find('.content').text().trim().indexOf('提名') == -1) {
                                     eventList.push({
                                        title: opencc.convertSync($(item).text().trim().split(' ')[0].replace(/\n/g,'')),
                                        award: opencc.convertSync($(item).find('.content').text().trim().split('获奖：')[1].split(' / ').join(',')),
                                        nominate: null,
                                        icon: $(item).find('img').attr('src')
                                     })
                                } 
                                if ($(item).find('.content').text().trim().indexOf('获奖') == -1) {
                                    eventList.push({
                                        title: opencc.convertSync($(item).text().trim().split(' ')[0].replace(/\n/g,'')),
                                        award: null,
                                        nominate: opencc.convertSync($(item).find('.content').text().trim().split('提名：')[1].split(' / ').join(',')),
                                        icon: $(item).find('img').attr('src')
                                    });
                               }
                            });
                        }

                        console.log(originTitle+'\n'+JSON.stringify(eventList));      
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
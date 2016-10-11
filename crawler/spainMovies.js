var config = require('../config');
var Updater = require('../update/Updater');
var cheerio = require("cheerio");
var request = require("request");
var async = require('async');
var moment = require("moment");
var OpenCC = require('opencc');
var TrendsTrailer = require('../trends/TrendsTrailer');
var youTube = config.YouTube;
var dbSpain = config.dbSpain;
var posterPages = [];
var releaseUrl = [];
var moviePages = [ //specific for spain movies
    13,
    18,
    21,
    24,
    22,
    21,
    100,
    77,
    50,
    44,
    86
];
var Cast = [];
var reviewer = [];
var title = [];
var movieList = [];
var link = [];
var rating = [];
var gallery_full = [];
var opencc = new OpenCC('s2tw.json');

exports.spainMovies = function() {
    async.series([
        insertTitle,
        insertDetail,
        insertTrailer,
        cleanData
    ],
    function (err) {
        if (err) console.error(err.stack);
          console.log('all jobs for spain movies update finished!!');
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
                    url = 'http://maoyan.com/films?sourceId=17&yearId='+(11-count)+'&offset='+(innerCount*30)+'&sortId=1';
                    request({
                        url: url,   
                        encoding: "utf8",
                        method: "GET"
                    }, function(err, response, body) {
                        var $ = cheerio.load(body);
                        console.log('yearPages: ' + (count+1) + '\n' + $('.movie-list .movie-item').length);

                        $('.movie-list .movie-item-title').each(
                            function(index, item) {
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

                        var thirdCount = 0;
                        async.whilst(
                            function() { return thirdCount < title.length; },
                            function(callback) {
                                dbSpain.spain.findOne({'title': title[thirdCount]}, function(err, doc){
                                    if (doc) {
                                        dbSpain.spain.update({'title': title[thirdCount]}, {'$set': {
                                            detailUrl: link[thirdCount],
                                            rating: {
                                                score: rating[thirdCount],
                                                votes: null
                                            }
                                        }}, function(){
                                            thirdCount++;
                                            callback(null, thirdCount);
                                        });
                                    } else {
                                        dbSpain.spain.insert({
                                            title: title[thirdCount],
                                            detailUrl: link[thirdCount],
                                            rating: {
                                                score: rating[thirdCount],
                                                votes: null
                                            }
                                        }, function() {
                                            thirdCount++;
                                            callback(null, thirdCount);
                                        });
                                    }
                                });
                            },
                            function(err, n) {
                                console.log('insertTitle finish ' + n);
                                title = [];
                                link = [];
                                rating = [];
                                innerCount++;
                                innercallback(null, innerCount);  
                            }
                        );
                    });
                },
                function (err, n) {
                    count++;
                    callback(null, count);
                }
            );
        },
        function (err, n) {
            console.log('prepareGalleryPages finished!');
            done(null);
        }
    );
}

function insertDetail(done) {
    var count = 0;
        console.log('insertDetail -------->');
        async.whilst(
                function() { return count < movieList.length; },
                function(callback) {
                    dbSpain.spain.findOne({'title': movieList[count]}, function(err, doc) {
                        if (doc) {                           
                            request({
                                url: doc['detailUrl'],
                                encoding: "utf8",
                                method: "GET"
                            }, function(err, response, body) {
                                if (err || !body) { count++; callback(null, count);}
                                var $ = cheerio.load(body);

                                var originTitle = $('.ename').text(),
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
                                    eventList = [],
                                    rating,
                                    votes,
                                    content,
                                    mainInfo,
                                    gallerySize,
                                    data = [],
                                    description = [];

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

                                $('.movie-brief-container li').each(function(index, item) {
                                	if (index == 0)
                                		genre = opencc.convertSync($(item).text().trim().split(','));
                                	else if (index == 1) {
                                        if ($(item).text().trim().indexOf('/') == -1)
                                            country = $(item).text().trim();
                                        else {
                                            runTime = $(item).text().trim().split('/')[1];
                                            country = $(item).text().trim().split('/')[0].split(',')[0].trim();
                                        }
                                	}
                                	else if (index == 2)
                                		releaseDate = $(item).text().trim();
                                });

                                country = opencc.convertSync(country);
                                runTime = runTime != undefined ? opencc.convertSync(runTime) : '';
                                console.log(runTime + '\n' + country);

                                year = releaseDate.split('-')[0];
                                type = null;
                                content = $('.dra').text().trim();

                                mainInfo = opencc.convertSync(content);
                                story = mainInfo;
                                
                                $('.tab-celebrity .celebrity-group').each(function(index, item) {
                                	if (index == 0) {
                                		$(item).find('.info').each(function(index, item) {
                                            var dirName = opencc.convertSync($(item).text().trim().split(' ')[0]);
                                			staff.push({
                                				staff: dirName,
                                				link: 'http://maoyan.com'+$(item).find('a').attr('href')
                                			});
                                            description.push(dirName.split(' ')[0].trim()+'(dir)');
                                		});
                                	} else if (index == 1) {	
                                		$(item).find('.actor').each(function(index, item) {
                                            var castName = opencc.convertSync($(item).find('.info a').text().trim());
                                			Cast.push({
					                            cast: opencc.convertSync($(item).find('.info a').text().trim()),
					                            as: $(item).find('.role').text().trim().split('：')[1],
					                            link: 'http://maoyan.com'+$(item).find('.info a').attr('href'),
					                            avatar: $(item).find('img').attr('data-src').split('@')[0]
					                        });
                                            description.push(castName);
                                		});
                                	}
                                });                           
                                                              
                                $('.comment-container').each(function(index, item) {
                                	reviewer.push({
	                                    name: opencc.convertSync($(item).find('.main .name').text()),
                                        avatar: $(item).find('.portrait img').attr('src').split('@')[0],
                                        topic: null,
                                        text: opencc.convertSync($(item).find('.comment-content').text().trim()),
                                        point: $(item).find('.score-star').attr('data-score'),
                                        date: $(item).find('.time').attr('title')
	                                });
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
                                    data: null
                                });

                                data.push({
                                    data: runTime
                                });

                                posterUrl = $('.avater-shadow img').attr('src').split('@')[0];

                                $('.tab-img li').each(function(index, item) {
                                	gallery_full.push({
                                		type: 'full',
                                		url: $(item).find('img').attr('data-src').split('@')[0]
                                	});
                                });

                                console.log('description ---> ' + description);                                
                                                
                                dbSpain.spain.update({'title': movieList[count]}, {'$set': {
                                        originTitle: originTitle,
                                        genre: genre,
                                        releaseDate: releaseDate,
                                        runTime: runTime,
                                        type: type,
                                        country: country,
                                        mainInfo: mainInfo,
                                        story: story,
                                        staff: staff,
                                        eventList: eventList,
                                        description: description.join(','),
                                        cast: Cast,
                                        review: reviewer,
                                        data: data,
                                        posterUrl: posterUrl,
                                        gallery_full: gallery_full
                                    }},function() {
                                        count++;
                                        gallery_full = [];
                                        Cast = [];
                                        reviewer = [];
                                        console.log(movieList[count] + ' updated!');
                                        callback(null, count);
                                });
                            });
                        }
                    });
                },
                function(err, n) {
                    console.log('posterPages --> ' + JSON.stringify(posterPages));
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
            dbSpain.spain.findOne({title: movieList[count]}, function(err, doc) {
                if (doc) {
                    new TrendsTrailer('sp', movieList[count], youTube, count, callback);
                    count++;
                } else {
                    count++;
                    callback(null, count);
                }
            });
        },
        function(err, n) {
            console.log('insert sp Trailer finish ' + n);
            done(null);
        }
    ); 
}

function cleanData(done) {
    var movieObj = [];
    dbSpain.spain.find({}, function(err, docs) {  
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
                dbSpain.spain.remove({title: movieObj[count]['title']}, function(err, doc) {
                    if (!err) {
                        count++;
                        callback(null, count);
                    }
                });
            },
            function(err, n) {
                console.log('clean spain films finish ' + n);
                done(null);
            }
        );
    });
}
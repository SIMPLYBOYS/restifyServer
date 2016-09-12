var config = require('../config');
var Updater = require('../update/Updater');
var cheerio = require("cheerio");
var request = require("request");
var async = require('async');
var moment = require("moment");
var OpenCC = require('opencc');
var TrendsTrailer = require('./TrendsTrailer');/*
var trendsGalleryScraper = require('../crawler/trendsUsGalleryScraper');
var usCastAvatarScraper = require('../crawler/usCastAvatarScraper');*/
var youTube = config.YouTube;
var dbChina = config.dbChina;
var posterPages = [];
var releaseUrl = [];
var GalleryfullPages = [];
var castPages = [];
var GalleryPages = [];
var finalCastPages = [];
var finalReviewPages = [];
var avatarUrl = [];
var trailerTitle = [];
var Cast = [];
var reviewer = [];
var title = [];
var delta = [];
var link = [];
var rating = [];
var gallery_full = [];
var opencc = new OpenCC('s2tw.json');

exports.updateTrends = function() {
    async.series([
        resetPosition,
        insertTitle,
        insertDetail,
        insertTrailer
    ],
    function (err) {
        if (err) console.error(err.stack);
          console.log('all jobs for cnTrends update finished!!');
    });
};

function resetPosition (done) {
    console.log('resetPosition ---->');
    dbChina.china.find({'top': {$lte:10, $gte:1}}, function(err, docs) {
        if (docs) {
            docs.forEach(function(doc, top){
                dbChina.china.update({'title': doc['title']}, {'$unset': {'top':1}});
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
        url: 'http://maoyan.com/board',
        encoding: "utf8",
        method: "GET"
    }, function(err, response, body) {

        var $ = cheerio.load(body);

        $('.board-wrapper dd').each(function(index, item) {
        	trailerTitle.push($(item).find('a').attr('title'));
        	title.push(opencc.convertSync($(item).find('a').attr('title')));
        	link.push('http://maoyan.com'+$(item).find('a').attr('href'));
	        rating.push(parseFloat($(item).find('.score').text()));
        	/*opencc.convert($(item).find('a').attr('title'), function (err, converted) {
			  title.push(converted);
	          link.push('http://maoyan.com'+$(item).find('a').attr('href'));
	          rating.push(parseFloat($(item).find('.score').text()));
			});*/
        });

        var count = 0;
        async.whilst(
            function() { return count < 10; },
            function(callback) {
                dbChina.china.findOne({'title': title[count]}, function(err, doc){
                    if (doc) {
                        dbChina.china.update({'title': title[count]}, {'$set': {
                        	top: count+1,
                        	rating: {
                        		score: rating[count],
                                votes: null
                        	}
                        }}, function(){
                            count++;
                            callback(null, count);
                        });
                    } else {
                        dbChina.china.insert({
                            title: title[count],
                            detailUrl: link[count],
                            top: count+1,
                            rating: {
                        		score: rating[count],
                                votes: null
                        	}
                        }, function() {
                            count++;
                            callback(null, count);
                        });
                    }
                });
            },
            function(err, n) {
                console.log('insertTitle finish ' + n);
                console.log(rating);             
                done(null);
            }
        );  
    });
}

function insertDetail(done) {
    var count = 0;
        console.log('insertDetail -------->');
        async.whilst(
                function() { return count < 10; },
                function(callback) {
                    dbChina.china.findOne({'title': title[count]}, function(err, doc) {
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
                                    rating,
                                    votes,
                                    content,
                                    mainInfo,
                                    gallerySize,
                                    data = [];

                                $('.movie-brief-container li').each(function(index, item){
                                	if (index == 0)
                                		genre = $(item).text().trim().split(',');
                                	else if (index == 1) {
                                		runTime = $(item).text().trim().split('/')[1];
                                		country = $(item).text().trim().split('/')[0].split(',')[0];
                                	}
                                	else if (index == 2)
                                		releaseDate = $(item).text().split('大陆')[0];
                                });
                                country = opencc.convertSync(country);
                                runTime = opencc.convertSync(runTime);
                                console.log(runTime + '\n' + country);

                                year = releaseDate.split('-')[0];
                                type = null;
                                content = $('.dra').text().trim();

                                mainInfo = opencc.convertSync(content);
                                story = mainInfo;
                                
                                // $('.movie-stats-container .banner-stats').each(function(index, item) {
                                // 	if (index == 0) {
                                // 		// rating = parseInt($('.imdbRating .ratingValue strong span').text());
                                // 		// votes = parseInt($('.imdbRating a').text());
                                // 		if (typeof($(item).find('.info-num .stonefont')[0])!= 'undefined')
                                // 			console.log(encodeURIComponent($(item).find('.info-num .stonefont')[0]['children'][0]['data']));

                                // 		$(item).find('.stonefont').each(function(index, item) {
                                // 			console.log(encodeURIComponent($(item)[0]['children'][0]['data']));
                                // 		})
                                // 	}
                                // });

                                $('.tab-celebrity .celebrity-group').each(function(index, item) {
                                	if (index == 0) {
                                		$(item).find('.info').each(function(index, item) {
                                			staff.push({
                                				staff: opencc.convertSync($(item).text().trim().split(' ')[0]),
                                				link: 'http://maoyan.com'+$(item).find('a').attr('href')
                                			});
                                		});
                                	} else if (index == 1) {	
                                		$(item).find('.actor').each(function(index, item) {
                                			Cast.push({
					                            cast: opencc.convertSync($(item).find('.info a').text().trim()),
					                            as: $(item).find('.role').text().trim().split('：')[1],
					                            link: 'http://maoyan.com'+$(item).find('.info a').attr('href'),
					                            avatar: $(item).find('img').attr('data-src').split('@')[0]
					                        });
                                		});
                                	}
                                });                           
                                                              
                                // $('#titleDetails .txt-block').each(function(index, item) {
                                //     if ($(item).text().trim().indexOf('Budget') == 0)
                                //         budget = $(item).text().trim().split(':')[1].split('(')[0].trim();
                                //     else if ($(item).text().trim().indexOf('Gross') == 0)
                                //         cross = $(item).text().trim().split(':')[1].split('(')[0].trim();
                                //     else if ($(item).text().trim().indexOf('Country') == 0)
                                //         country = $(item).text().trim().split(':')[1].split('|')[0].trim();
                                // });

                                // $('.txt-block .itemprop').each(function(index, item) {
                                //     studio.push($(item).text());
                                // });

                                $('.comment-container').each(function(index, item) {
                                	// console.log($(item).find('.portrait img').attr('src').split('@')[0]);
                                	// console.log($(item).find('.main .name').text());
                                	// console.log($(item).find('.time').attr('title'));
                                	// console.log($(item).find('.score-star').attr('data-score'));
                                	// console.log($(item).find('.comment-content').text().trim());
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
                                })                                 
                                
                
                                dbChina.china.update({'title': title[count]}, {'$set': {
                                        originTitle: originTitle,
                                        trailerTitle: trailerTitle[count],
                                        genre: genre,
                                        releaseDate: releaseDate,
                                        runTime: runTime,
                                        type: type,
                                        country: country,
                                        mainInfo: mainInfo,
                                        story: story,
                                        staff: staff,
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


function insertTrailer(done) {
    console.log('insertTrailer -------->');
    var count = 0;
    async.whilst(
        function() { return count < title.length},
        function(callback) {
            dbChina.china.findOne({title: title[count]}, function(err, doc) {
                if (doc) {
                    new TrendsTrailer('cn', title[count], youTube, count, callback);
                    count++;
                } else {
                    count++;
                    callback(null, count);
                }
            });
        },
        function(err, n) {
            console.log('insert cn Trailer finish ' + n);
            done(null);
        }
    ); 
}
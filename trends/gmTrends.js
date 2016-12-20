var config = require('../config');
var Updater = require('../update/Updater');
var cheerio = require("cheerio");
var request = require("request");
var async = require('async');
var moment = require("moment");
var TrendsTrailer = require('./TrendsTrailer');
var dbGermany = config.dbGermany;
var releaseUrl = [];
var trailerTitle = [];
var title = [];
var delta = [];
var link = [];
var rating = [];

exports.updateTrends = function() {
	console.log('updateTrends for Germany')
    async.series([
        resetPosition,
        insertTitle,
        insertDetail,
        insertTrailer
    ],
    function (err) {
        if (err) console.error(err.stack);
          console.log('all jobs for gmTrends update finished!!');
    });
};

function resetPosition (done) {
    console.log('resetPosition ---->');
    dbGermany.germany.find({'top': {$lte:10, $gte:1}}, function(err, docs) {
        if (docs) {
            docs.forEach(function(doc, top){
                dbGermany.germany.update({'title': doc['title']}, {'$unset': {'top':1}});
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
        url: 'http://www.kino.de/filme/kinocharts/',
        encoding: "utf8",
        method: "GET"
    }, function(err, response, body) {

        var $ = cheerio.load(body);

        $('.teaser h3').each(function(index, item) {
        	title.push($(item).find('a').text().split('.')[1].trim());
        	link.push($(item).find('a').attr('href'));
        });

        var count = 0;
        async.whilst(
            function() { return count < 10; },
            function(callback) {
                dbGermany.germany.findOne({'title': title[count]}, function(err, doc){
                    if (doc) {
                        dbGermany.germany.update({'title': title[count]}, {'$set': {
                        	top: count+1,
                            detailUrl: link[count]
                        }}, function(){
                            count++;
                            callback(null, count);
                        });
                    } else {
                        dbGermany.germany.insert({
                            title: title[count],
                            detailUrl: link[count],
                            top: count+1,
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


function insertDetail(done) {
    var count = 0;
        console.log('insertDetail -------->');
        async.whilst(
                function() { return count < 10; },
                function(callback) {
                    dbGermany.germany.findOne({'title': title[count]}, function(err, doc) {
                        if (doc) {                           
                            request({
                                url: doc['detailUrl'],
                                encoding: "utf8",
                                method: "GET"
                            }, function(err, response, body) {
                                if (err || !body) { count++; callback(null, count);}

                                var $ = cheerio.load(body),
                                	genre = [],
                                    releaseDate,
                                    runTime,
                                    type,
                                    country,
                                    budget,
                                    cross,
                                    story = "",
                                    staff = [],
                                    gallery_full = [],
                                    year,
                                    studio = [],
                                    cast = [],
                                    rating = '',
                                    votes,
                                    plot,
                                    gallerySize,
                                    posterUrl,
                                    data = [];

                                year = $('.movie-article-year').text();
                                type = $('.subtext meta').attr('content');
                                runTime = $('.article-meta .first').text();
                                plot = $('#movie-plot p').text().trim();
                                story = plot;
                                
                                if (!isNaN(parseFloat($('.movie-rating-user .rating-number').text())))
                                        rating = parseFloat($('.movie-rating-user .rating-number').text().split('Ø')[1].trim());

                                if ($('.movie-rating-user a').text().trim()!="")
                                        votes = parseInt($('.movie-rating-user a').text().split('(')[1].split(')')[0]);

                                if (typeof($('.article-poster img').attr('src')) != 'undefined') {
                                        posterUrl = $('.article-poster img').attr('src').split('236')[0] + '0x1920.jpg';
                                        releaseDate = $('.article-meta time').text().split('Ab')[1].split('im')[0].trim();
                                } else {
                                        posterUrl = $('.movie-poster img').attr('src');
                                        releaseDate = $('.article-meta time').text().trim();
                                }

                                $('.article-meta dd a').each(function(index, item) {
                                	if (index == 0)
                                		type = $(item).text().trim();
                                	else if (index == 1)
                                		genre = $(item).text().trim();
                                	else if (index == 2)
                                		country = $(item).text().trim();
                                });

                                $('.major .major').each(function(index, item) {
                                	if (index == 0) {
                                		staff.push({
                                            staff: $(item).find('dt').text().split('©')[0].trim(),
                                            link: $(item).find('a').attr('href')
                                        })
                                	}
                                });

                                $('.major li').each(function(index, item) {
                                	if (index > 2) {
                                		cast.push({
				                            cast: $(item).find('dt').text().split('©')[0].trim(),
				                            as: $(item).find('em').text() != '' ? $(item).find('em').text().split("„")[1].split("“")[0] : "",
				                            link: $(item).find('a').attr('href'),
				                            avatar: $(item).find('img').attr('src')
				                        });
                                		
                                	}
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

                                $('#article-gallery li img').each(function(index, item) {
                                	console.log($(item).attr('src'));
                                	gallery_full.push({
                                		type: 'full',
                                		url: $(item).attr('src').split('rcm')[0]+'rcm0x1920.jpg'
                                	});
                                });
                
                                dbGermany.germany.update({'title': title[count]}, {'$set': {
                                        genre: genre,
                                        releaseDate: releaseDate,
                                        runTime: runTime,
                                        type: type,
                                        country: country,
                                        mainInfo: plot,
                                        gallery_full: gallery_full,
                                        posterUrl: posterUrl,
                                        staff: staff,
                                        cast: cast,
                                        rating: {
                                            score: rating,
                                            votes: votes
                                        },
                                        story: plot,
                                        data: data
                                    }},function() {
                                        count++;
                                        gallery_full = [];
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

function insertTrailer(done) {
    console.log('insertTrailer -------->');
    var count = 0;
    async.whilst(
        function() { return count < title.length},
        function(callback) {
            dbGermany.germany.findOne({title: title[count]}, function(err, doc) {
                if (doc) {
                    new TrendsTrailer('gm', title[count], youTube, count, callback);
                    count++;
                } else {
                    count++;
                    callback(null, count);
                }
            });
        },
        function(err, n) {
            console.log('insert gm Trailer finish ' + n);
            done(null);
        }
    ); 
}
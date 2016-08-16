var http = require('http');
var cheerio = require('cheerio');
var util = require('util');
var config = require('../config');
var myapiToken = config.myapiToken;
var dbIMDB = config.dbIMDB;
var youTube = config.youTube;
var dbRecord = config.dbRecord;
var dbReview = config.dbReview;
var async = require('async');
var request = require("request");
var MovieInfomer = require('../MovieInfomer');
var Trailer = require('../Trailer');
var Thumbnail = require('./Thumbnail');
var EventEmitter = require('events').EventEmitter;
var usCastAvatarScraper = require('../crawler/usCastAvatarScraper');
var updateThumbnail = [];
var finalCastPages = [];
var avatarUrl = [];
var finalReviewPages = [];

/*
 * Scraper Constructor
**/
function Creater (title, position) {
    this.title = title.split('(')[0].trim();
    this.position = parseInt(position);
    this.init();
}
/*
 * Make it an EventEmitter
**/
util.inherits(Creater, EventEmitter);

/*
 * Initialize scraping
**/
Creater.prototype.init = function () {
    this.bindAll();
    this.on('updated', function (title) {
        console.log('\n====> \"'+title + '\" got updated!!!');
        this.emit('complete', title);
    });
    this.updateMovie();
};

/*
 * Parse html and return an object
**/
Creater.prototype.updateMovie = function () {
  
  var that = this;
  if (that['title'] == 'Дети небес')
    that['title'] = 'Bacheha-Ye aseman';

  dbIMDB.imdb.findOne({'Infotitle': that['title']}, function(err, doc) {

      if (!doc) {
        console.log('\n\n' + that['title'] + ' not found!');
        that.createMovie();
        return;     
      }

      dbIMDB.imdb.update({'Infotitle': that['title']}, {'$set': {'top': parseInt(that['position'])}}, function() {
        that.emit('updated', that.title);
      });
  });
};

Creater.prototype.createMovie = function () {
  var that = this;
  async.series([
      function(done){ return that.insertTitle(done);},
      function(done) { return that.fetchMovieInfo(done);},
      function(done) { return that.insertDetail(done);},
      insertCast,
      insertCastAvatar,
      insertReview,
      function(done) { return that.prepareGalleryThumbnailPages(done);},
      function(done) { return that.insertGalleryThumbnail(done);},
      function(done) { return that.insertPoster(done);},
      function(done) { return that.insertGallery(done);},
      function(done) { return that.insertTrailer(done);},
      function(done) { return that.prepareRecords(done);},
      function(done) { return that.insertRecords(done);}
  ], function (err) {
        if (err) console.error(err.stack);
        console.log('\n\n-------- 2016 0520 final step ---------' + that.title );
        that.emit('updated', that.title);
        console.log('all finished!!');
  }); 
};

function insertReview(done) {
    console.log('insertReview -------->');
    var count = 0,
        cast;
    async.whilst(
        function () { return count < 10; },
        function (callback) {
            var innerCount = 0,
                reviewer = [],
                name,
                avatar,
                topic,
                text = [],
                point = null,
                date,
                url;
            review = finalReviewPages.pop();
            async.whilst(
                function () { console.log('innerCount: ' + innerCount); return innerCount < parseInt(review['votes']); },
                function (innercallback) {  
                    url = review['reviewUrl'].split('reviews?')[0]+'/reviews?start='+innerCount;
                    console.log('reviewUrl: '+ url);
                    request({
                        url: url,   
                        encoding: "utf8",
                        method: "GET"
                    }, function(err, response, body) {
                        var $ = cheerio.load(body);
                        $('#tn15content div').each(function(index, item) { 

                            if (index%2 ==0) {
                                topic = $(item).find('h2').text().trim();
                                avatar = $(item).find('img')[0]['attribs']['src'];
                                name = $(item).find('a')[1]['children'][0]['data'];

                                if (typeof($(item).find('img')[1])!='undefined')
                                    point = parseInt($(item).find('img')[1]['attribs']['alt'].split('/')[0]);
                                if ($(item).find('small').length == 2)
                                    date = $(item).find('small')[1]['children'][0]['data'];
                                else if ($(item).find('small').length == 3)
                                    date = $(item).find('small')[2]['children'][0]['data'];

                                reviewer.push({
                                    name: name,
                                    avatar: avatar,
                                    topic: topic,
                                    text: null,
                                    point: point,
                                    date: date
                                });
                            }
                        });
                         
                        $('#tn15content p').each(function(index, item) {
                            if($(item).text().indexOf('***') !=0 && $(item).text() !='Add another review')
                                text.push($(item).text().trim());
                        });
                        innerCount+=10;
                        innercallback(null, innerCount);  
                    });
                },
                function (err, n) {
                    console.log(review['title'] + '-------->');
                    text.forEach(function(item, index) {
                        reviewer[index]['text'] = item
                    });

                    // console.log(JSON.stringify(reviewer));  
                    dbIMDB.imdb.findOne({title: review['title']}, function(err, doc) {
                        if (doc) {
                            dbReview.reviews.insert({
                                title: doc['title']
                            }, function() {
                                dbReview.reviews.update({'title': doc['title']}, {$set: {review: reviewer}}, function() {
                                    console.log(review['title'] + 'finished insert review');
                                    count++;
                                    callback(null);
                                });
                            });
                        } else {
                            console.log(review['title'] + ' not found!');
                            count++;
                            callback(null);
                        }
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

function insertCast(done) {
    console.log('insertCast -------->');
    var count = 0,
        end = finalCastPages.length,
        cast,
        as = null,
        name,
        link,
        Cast;
    async.whilst(
        function () { return count < end; },
        function (callback) {
            cast = finalCastPages.pop();
            Cast = [];
            request({
                url: cast['castUrl'], 
                encoding: "utf8",
                method: "GET"
            }, function(err, response, body) {
                var $ = cheerio.load(body);
                console.log(cast['title']+' --->');
                $('.cast_list tr').each(function(index, item) {
                    if (index > 0) {
                        name = $(item).find('.itemprop span').text();
                        link = 'http://www.imdb.com'+$(item).find('.primary_photo a').attr('href');
                        avatarUrl.push({
                            link: link,
                            cast: name,
                            title: cast['title']
                        });
                        if (typeof($(item).find('.character a')[0])!='undefined')
                            as = $(item).find('.character a').text().trim();
                        Cast.push({
                            cast: name,
                            as: as,
                            link: link,
                            avatar: null
                        });
                    }
                });

                dbIMDB.imdb.findOne({title: cast['title']}, function(err, docs) {
                    if (typeof(docs['cast'])!='undefined') {
                        count++;
                        callback(null, count);
                    } else {
                        dbIMDB.imdb.update({title: cast['title']}, {$set: {
                            cast: Cast,
                            review: finalReviewPages
                        }}, function(){
                            count++;
                            callback(null, count);
                        });
                    }
                });
            });
        },
        function (err, n) {
            // avatarUrl = avatarUrl.slice(0,444); TODO breakpoint 
            console.log(avatarUrl);
            console.log('insertCast finished!');
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
    console.log('avatarPages left: ' + avatarUrl.length);
    var scraper = new usCastAvatarScraper(avatar);
    scraper.on('error', function (error) {
      console.log(error);
      insertCastAvatar(done);
    });

    scraper.on('complete', function (listing) {
        var title = listing['title'];
        console.log(listing['picturesUrl']);
        dbIMDB.imdb.findAndModify({
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
                dbIMDB.imdb.findAndModify({
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

Creater.prototype.insertTitle = function(done) {
    request({
        url: "http://www.imdb.com/chart/top",
        encoding: "utf8",
        method: "GET"
    }, function(err, response, body) {
        if (err || !body) { return; }

        var imdb_baseUrl = 'http://www.imdb.com';
        var $ = cheerio.load(body);
        var poster = {},
            title = {},
            rating = {},
            year = {};

        poster = $('.lister-list tr .posterColumn img');
        title = $('.lister-list tr .titleColumn a');
        rating = $('.lister-list tr .imdbRating strong');
        year = $('.lister-list tr .titleColumn .secondaryInfo');
        detailUrl = $('.titleColumn a');
        console.log('\n\n-------- 2016 0520 title --------- : ' + $(title[that.position-1]).text() + '\n' + that.title);
        dbIMDB.imdb.insert({
            'top': parseInt(that.position), 
            'title': that.title,
            'year': $(year[that.position-1]).text().slice(1,5),
            'rating': $(rating[that.position-1]).text(),
            'description': title[that.position-1]['attribs']['title'],
            'detailUrl': imdb_baseUrl + detailUrl[that.position-1]['attribs']['href'],
            'Infotitle': that.title
        }, function() {
            done(null);
        });  
    });
}

Creater.prototype.fetchMovieInfo = function(done) {
    console.log('\n\n-------- 2016 0520 step2 --------- ' + that.title );
    dbIMDB.imdb.findOne({title: that.title}, function(err, doc) {
        if (doc) {
            new MovieInfomer(that.title, myapiToken, 0, done);
        } else {
            console.log(that.title + ' not found!');
            done(null);
        }
    });
}

Creater.prototype.insertDetail = function(done) {
    console.log('\n\n-------- 2016 0520 step3 ---------' + that.title);
    dbIMDB.imdb.findOne({title: that.title}, function(err, doc) {
        if (doc) {
            request({
            url: doc['detailUrl'],
            encoding: "utf8",
            method: "GET" }, function(err, res, body) {
                if (err || !body) 
                    return;

                var $ = cheerio.load(body);
                var url = $('.slate_wrapper .poster a img')[0];
                var foo = $('.minPosterWithPlotSummaryHeight .poster img')[0];
                var originTitle = $('.originalTitle').text().split('(')[0].trim(),
                var title = originTitle == "" ? doc['title'] : originTitle;
                that.title = title;
                finalCastPages.push({
                    castUrl: doc['detailUrl'].split('?')[0]+'fullcredits?ref_=tt_cl_sm#cast',
                    title: title
                });

                $('.titleReviewBarItem').each(function(index, item) {
                    if (index == 1) {
                        finalReviewPages.push({
                            reviewUrl: doc['detailUrl'].split('?')[0]+$(item).find('.subText a')[0]['attribs']['href'],
                            title: title,
                            votes: parseInt($(item).find('.subText a')[0]['children'][0]['data'].split('user')[0].trim())
                        });
                    }
                });

                if (typeof(url)!=='undefined') {
                    console.log(title);
                    console.log('.1-->'+url['attribs']['src']);
                    var poster = url['attribs']['src'];
                    var slate = $('.slate_wrapper .slate a img')[0]['attribs']['src'];
                    var summery = $('.plot_summary .summary_text').text().trim();
                    if ($($('#titleDetails .txt-block')[0]).find('.inline').text() == 'Country:')
                        var country = $('#titleDetails .txt-block')[0];
                    else
                        var country = $('#titleDetails .txt-block')[1];
                    var $country = $(country);
                    if ($country.find('a').length == 1)
                        country = $country.find('a').text();
                    else
                        country = $($country.find('a')[0]).text();
                    doc['detailContent'] = {
                        "poster": poster,
                        "slate": slate,
                        "summery": summery,
                        "country": country
                    };
                    dbIMDB.imdb.update({'title':doc['title']}, doc);
                    var bar = $('.slate_wrapper .poster a')[0];
                    var path = 'http://www.imdb.com' + bar['attribs']['href'];
                    console.log(path);
                    var hash = $('.slate_wrapper .poster img')[0];
                    hash = hash['attribs']['src'].split('images')[1].split('._V1')[0].slice(3);
                    if (hash.indexOf('@')!= -1) {
                        hash = hash.split('@')[0];
                    }
                    console.log('hash: ' + hash);
                    dbIMDB.imdb.update({title: doc['title']}, {$set: {posterUrl: path, title: title}});
                    dbIMDB.imdb.update({title: doc['title']}, {$set: {posterHash: hash, title: title}});
                } else {
                    console.log(title);
                    var poster = foo['attribs']['src'];
                    var summery = $('.minPosterWithPlotSummaryHeight .summary_text').text().trim();
                    if ($($('#titleDetails .txt-block')[0]).find('.inline').text() == 'Country:')
                        var country = $('#titleDetails .txt-block')[0];
                    else
                        var country = $('#titleDetails .txt-block')[1];
                    var $country = $(country);
                    if ($country.find('a').length == 1)
                        country = $country.find('a').text();
                    else
                        country = $($country.find('a')[0]).text()
                    doc['detailContent'] = {
                        "poster": poster,
                        "summery": summery,
                        "country": country
                    };
                
                    dbIMDB.imdb.update({'title':doc['title']}, doc);

                    var bar = $('.minPosterWithPlotSummaryHeight .poster a')[0];
                    var path = 'http://www.imdb.com' + bar['attribs']['href'];
                    console.log(path);
                    var hash = $('.minPosterWithPlotSummaryHeight .poster img')[0];
                    hash = hash['attribs']['src'].split('images')[1].split('._V1')[0].slice(3);
                    if (hash.indexOf('@')!= -1) {
                        hash = hash.split('@')[0];
                    }
                    console.log('hash: ' + hash);
                    dbIMDB.imdb.update({title: doc['title']}, {$set: {posterUrl: path, title: title}});
                    dbIMDB.imdb.update({title: doc['title']}, {$set: {posterHash: hash, title: title}});
                }
                done(null);
          });
        } else {
            console.log(that.title + ' not found!');
            done(null);
        }
    });
}

Creater.prototype.prepareGalleryThumbnailPages = function(done) {
    console.log('\n\n-------- 2016 0520 step4 ---------' + that.title);
    dbIMDB.imdb.findOne({title: that.title}, function(err, doc) {
        if (doc) {
            request({
              url: doc['detailUrl'],
              encoding: "utf8",
              method: "GET" }, function(err, res, body) {
                  if (err || !body)
                      return;
                  var $ = cheerio.load(body);
                  var url = $('.combined-see-more a')[1]['attribs']['href'];
                  var path = 'http://www.imdb.com' + url;
                  var foo = $('.combined-see-more a')[1]['children'];
                  var page = $(foo[0]).text();
                  page = Math.ceil(parseInt(page.split("photos")[0]) / 48);
                  console.log('top: ' + doc['top'] + path);
                  doc['readMore'] = { 
                      "url": path,
                      "page": page
                  };
                  dbIMDB.imdb.update({'title': doc['title']}, doc);
                  done(null);
            });
        } else {
            console.log(that.title + ' not found!');
            done(null);
        }
    });      
}

Creater.prototype.insertGalleryThumbnail = function(done) {
    console.log('\n\n-------- 2016 0520 step5 ---------' + that.title);
    dbIMDB.imdb.findOne({title: that.title}, function(err, doc) {
      if (doc) {
        var gallery = [];
            for (var j=1; j<=doc['readMore']['page']; j++) {

                var bar = doc['readMore']['url'].split('?');

                var options = {
                  url: bar[0] + '?page=' +j+'&'+bar[1],
                  encoding: "utf8",
                  method: "GET"
                };

                console.log(doc['top']);

                var callback = function(err, res, body) {
                        if (err || !body)
                            return;
                        var $ = cheerio.load(body);
                        var url = $('.media_index_thumb_list a img');
                        var detailUrl = $('.media_index_thumb_list a');
                                               
                        url.each(function(index, body) {
                            // console.log(detailUrl[index]['attribs']['href']);  
                            console.log('index: ' + index);
                            // console.log(body['attribs']['src']);
                            gallery.push({
                                type: 'thumbnail',
                                url: body['attribs']['src'],
                                detailUrl: 'http://www.imdb.com' + detailUrl[index]['attribs']['href']
                            })
                        });

                        // console.log(gallery);
                        doc["gallery_thumbnail"] = gallery;
                        dbIMDB.imdb.update({'title': doc['title']}, doc);
                        done(null);
                };
                request(options, callback);
            }  
      } else {
        console.log(that.title + ' not found!');
        done(null);
      } 
    });
}

Creater.prototype.insertPoster =function(done) {
    console.log('\n\n-------- 2016 0520 step6 ---------' + that.title );
     dbIMDB.imdb.findOne({title: that.title}, function(err, doc) {
        if (doc) {
            var path = doc['posterUrl'];
            var bar = path.split('title')[1];
            path = path.split('title')[0] + '_json/title' + bar.split('mediaviewer')[0] + 'mediaviewer';
            http.get(path, function (res) {
                    var body = '';
                    if(res.statusCode !== 200) {
                        console.log('link not avaliable');
                        done(null);
                    }
                res.on('data', function (chunk) {
                  body += chunk;
                });
                res.on('end', function () {
                  var json = JSON.parse(body)['allImages'];
                  json.forEach(function(item, index){
                      if (item['src'].indexOf(doc['posterHash']) != -1) {
                        var posterUrl = item['src'];
                        dbIMDB.imdb.update({'title': doc['title']}, {'$set': {'posterUrl': posterUrl}}, function() {
                            console.log('posterUrl: ' + posterUrl);
                            done(null);
                        });
                      }
                  });
                });
            })
            .on('error', function (err) {
                console.log(err);
            });       
        } else {
            console.log(that.title + ' not found!');
            done(null);
        }
    });
}

Creater.prototype.insertGallery = function(done) {
    console.log('\n\n-------- 2016 0520 step7 ---------' + that.title);
    dbIMDB.imdb.findOne({title: that.title}, function(err, doc) {
      if (doc) {
        var gallery = [];
        for(var i in doc['gallery_thumbnail']) {
            console.log(doc['gallery_thumbnail'][i]['detailUrl']);
            updateThumbnail.push({'title': that.title, 'thumbnailUrl': doc['gallery_thumbnail'][i]['detailUrl']});                
        }  

        updateThumbnailWizard(doc, gallery, done);

      } else {
        console.log(that.title + ' not found!');
        done(null);
      } 
    });  
}

Creater.prototype.insertTrailer = function(done) {
    console.log('\n\n-------- 2016 0520 step8 --------- ' + that.title );
    dbIMDB.imdb.findOne({title: that.title + ' trailer'}, function(err, doc) {
        if (doc) {
            new Trailer(that.title, youTube, 0, done);
        } else {
            console.log(that.title + ' not found!');
            done(null);
        }
    });
}

Creater.prototype.prepareRecords = function(done) {
    console.log('\n\n-------- 2016 0520 step9 --------- ' + that.title );
    dbIMDB.imdb.findOne({title: that.title}, function(err, doc) {
        if (doc) {
            dbRecord.records.insert({
                'title': doc['title']
            }, function() {
                done(null);
            });
        } else {
            console.log(that.title + ' not found!');
            done(null);
        }
    });
}

Creater.prototype.insertRecords = function(done) {
    console.log('\n\n-------- 2016 0520 step10 --------- ' + that.title );
    dbIMDB.imdb.findOne({title: that.title}, function(err, doc) {
        if (doc) {
            Url = "http://top250.info/movie/?" + doc['idIMDB'].slice(2)+'/full';
            request({
                url: Url,
                encoding: "utf8",
                method: "GET"
            }, function(err, response, body) {
                if (err || !body) { return; }
                var $ = cheerio.load(body);
                var movieRight = {},
                    token,
                    year,
                    month,
                    date,
                    position,
                    rating,
                    votes,
                    cast = [];

                movieRight = $('.movie_right');
                //fetch record
                var collecton = $(movieRight).find('table').find('tr');
                
                var records = [];

                for (i=0; i< collecton.length; i++) {
                    token = $(collecton[i]).find('td').text();
                    
                    if (!token.replace(/\s/g, '').length) {
                        console.log('got space string');
                        continue;
                    } else {
                        /*console.log(token.lastIndexOf('.') - findposition(token))
                        console.log(token);*/
                        year = token.substring(0,4);
                        month = token.substring(5,7);
                        date = token.substring(8,10);
                        position = token.substring(10, findposition(token));
                        rating = token.substring(token.lastIndexOf('.')-1,token.lastIndexOf('.')+2);
                        votes = token.substring(token.lastIndexOf('.')+2,token.length);
                        records.push({
                            'position': position, 
                            'year': year,
                            'month': month,
                            'date': date,
                            'rating': rating,
                            'votes': votes
                        });
                        console.log(year+' ' + month + ' ' + date + ' ' + position + ' ' + rating + ' ' + votes + '\n');
                    }
                }

                dbRecord.records.findOne({'title': doc['title']}, function(err, doc) {
                    dbRecord.records.update({'title': doc['title']}, {'$set': {'records': records}}, function() {
                        done(null);
                    });
                });
            });
        } else {
            console.log(that.title + ' not found!');
            done(null);
        }
    });
}

var findposition = function(token) {
    if (token.indexOf('*') == -1) {
        if (token.indexOf('↓') == -1) {
            if (token.indexOf('↑') == -1) {
                return token.lastIndexOf('-');
            }
            else {
                return token.indexOf('↑');
            }
        } else {
            return token.indexOf('↓');
        }
    } else { 
        return token.indexOf('*');
    }
}

function updateThumbnailWizard(doc, gallery, done) {
    if (!updateThumbnail.length) {
        doc["gallery_full"] = gallery;
        dbIMDB.imdb.update({
            'title': doc['title']}, doc);
        done(null);
        return console.log('Done!!!!');
    }
    var item = updateThumbnail.pop();
    if (item['title'].indexOf(',') != -1) {
        var bar = item['title'].split(',');
        console.log('\n\n----->' + bar[1] + ' ' + bar[0] + '\n\n');
        item['title'] = bar[1] + ' ' + bar[0];
        var thumbnail = new Thumbnail(item.title.trim(), item.thumbnailUrl);
    } else {
        var thumbnail = new Thumbnail(item.title, item.thumbnailUrl);
    }

    console.log('Requests Left: ' + updateThumbnail.length);
    thumbnail.on('error', function (error) {
      console.log(error);
      updateThumbnailWizard(doc, gallery, done);
    });

    thumbnail.on('complete', function (item) {
        // console.log(listing);
        gallery.push(item);
        console.log(item + ' got complete!');
        updateThumbnailWizard(doc, gallery, done);
    });
}

module.exports = Creater;

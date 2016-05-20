var http = require('http');
var cheerio = require('cheerio');
var util = require('util');
var config = require('../config');
var myapiToken = config.myapiToken;
var dbIMDB = config.dbIMDB;
var dbRecord = config.dbRecord;
var async = require('async');
var request = require("request");
var MovieInfomer = require('../MovieInfomer');
var Trailer = require('../Trailer');
var EventEmitter = require('events').EventEmitter;
/*
 * Scraper Constructor
**/
function Creater (title, position) {
    this.title = title;
    this.position = position;
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

  dbIMDB.imdb.findOne({'title': that['title']}, function(err, doc) {

      if (!doc) {
        console.log('\n\n' + that['title'] + ' not found!');
        that.createMovie();
        return;     
      }

      dbIMDB.imdb.update({'title': that['title']}, {'$set': {'top': parseInt(that['position'])}}, function() {
        that.emit('updated', that.title);
      });
  })
};

Creater.prototype.createMovie = function () {
  var that = this;
  async.series([
  // fetch top 250 record In Out List
  function (done) {
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

    
        /*if (that.title == 'PK') {
            console.log('\n\n-------- 2016 0520 title --------- : ' + imdb_baseUrl + detailUrl[245]['attribs']['href']);
            dbIMDB.imdb.insert({
                'top': 248, 
                'title': $(title[245]).text(),
                'year': $(year[245]).text().slice(1,5),
                'rating': $(rating[245]).text(),
                'description': title[245]['attribs']['title'],
                'detailUrl': imdb_baseUrl + detailUrl[245]['attribs']['href']
            });
        }*/

        dbIMDB.imdb.insert({
            'top': that.position, 
            'title': $(title[that.position-1]).text(),
            'year': $(year[that.position-1]).text().slice(1,5),
            'rating': $(rating[that.position-1]).text(),
            'description': title[that.position-1]['attribs']['title'],
            'detailUrl': imdb_baseUrl + detailUrl[that.position-1]['attribs']['href']
        });

        done(null);
    });
  },
  //fetch update info into Obj
  function (done) {
    console.log('\n\n-------- 2016 0520 step2 --------- ' + that.title );
    dbIMDB.imdb.findOne({title: that.title}, function(err, doc) {
        if (doc) {
            new MovieInfomer(that.title, myapiToken, dbIMDB, done);
        } else {
            console.log(that.title + ' not found!');
            done(null);
        }
    });
  },
  function (done) {
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
                    if (typeof(url)!=='undefined') {
                        console.log(doc['title']);
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
                        dbIMDB.imdb.update({'title': doc['title']}, {'$set': {'posterUrl': path}});
                    } else {
                        console.log(doc['title']);
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
                        foo['attribs']['src'];
                        dbIMDB.imdb.update({'title':doc['title']}, doc);

                        var bar = $('.minPosterWithPlotSummaryHeight .poster a')[0];
                        var path = 'http://www.imdb.com' + bar['attribs']['href'];
                        console.log(path);
                        dbIMDB.imdb.update({'title': doc['title']}, {'$set': {'posterUrl': path}});
                    }
                    done(null);
              });
            } else {
                console.log(that.title + ' not found!');
                done(null);
            }
        });
  },
  function (done) {
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
  },
  function (done) {
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
                            var gallery_length = $('.page_list a').length/2+1;
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
  },
  function (done) {
        console.log('\n\n-------- 2016 0520 step6 ---------' + that.title );
        dbIMDB.imdb.findOne({title: that.title}, function(err, doc) {
          if (doc) {
            var gallery = [];
            for(var i in doc['gallery_thumbnail']) {
                console.log(doc['gallery_thumbnail'][i]['detailUrl']);

                var options = {
                  url: doc['gallery_thumbnail'][i]['detailUrl'],
                  encoding: "utf8",
                  method: "GET"
                };

                var callback = function(err, res, body) {
                        if (err || !body)
                            return;
                        var $ = cheerio.load(body);
                        // console.log($('.photo a img')[0]['attribs']['src'])
                        gallery.push({
                            type: 'full',
                            url: $('.photo a img')[0]['attribs']['src'],
                        })

                        doc["gallery_full"] = gallery;
                        dbIMDB.imdb.update({'title': doc['title']}, doc);
                        done(null);
                };
                console.log(i);
                request(options, callback);
                
            }  
          } else {
            console.log(that.title + ' not found!');
            done(null);
          } 
        });
        
  },
  function (done) {
        console.log('\n\n-------- 2016 0520 step7 ---------' + that.title );
         dbIMDB.imdb.findOne({title: that.title}, function(err, doc) {
            if (doc) {
                request({
                    url: doc['posterUrl'],
                    encoding: 'utf8',
                    method: "GET" }, function(err, res, body){
                        if (err || !body)
                            return;
                        var $ = cheerio.load(body);
                        var url = $('.photo img')[0];
                        console.log(doc['top']+':');
                        console.log(url['attribs']['src']);
                        dbIMDB.imdb.update({'title': doc['title']}, {'$set': {'posterUrl': url['attribs']['src']}});
                        done(null);
                });       
            } else {
                console.log(that.title + ' not found!');
                done(null);
            }
        });
  },
  function (done) {
    console.log('\n\n-------- 2016 0520 step8 --------- ' + that.title );
    dbIMDB.imdb.findOne({title: that.title}, function(err, doc) {
        if (doc) {
            new Trailer(that.title, youTube, dbIMDB, done);
        } else {
            console.log(that.title + ' not found!');
            done(null);
        }
    });
  },
  function (done) {
    console.log('\n\n-------- 2016 0520 step9 --------- ' + that.title );
    dbIMDB.imdb.findOne({title: that.title}, function(err, doc) {
        if (doc) {
            dbRecord.records.insert({
                'title': doc['title']
            });
            done(null);
        } else {
            console.log(that.title + ' not found!');
            done(null);
        }
    });
  },
  function (done) {
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

                dbRecord.records.find({'title': doc['title']}).forEach(function(err, movie) {
                    dbRecord.records.update({'title': movie['title']}, {'$set': {'records': records}});
                    done(null);
                });
            });
        } else {
            console.log(that.title + ' not found!');
            done(null);
        }
    });
  }
 ], function (err) {
        if (err) console.error(err.stack);
        console.log('\n\n-------- 2016 0520 final step ---------' + that.title );
        console.log('all finished!!');
  }); 
};

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

module.exports = Creater;

var http = require('http');
var cheerio = require('cheerio');
var util = require('util');
var config = require('../config');
var myapiToken = config.myapiToken;
var dbIMDB = config.dbIMDB;
var youTube = config.youTube;
var dbRecord = config.dbRecord;
var async = require('async');
var request = require("request");
var MovieInfomer = require('../MovieInfomer');
var Trailer = require('../Trailer');
var Thumbnail = require('./Thumbnail');
var EventEmitter = require('events').EventEmitter;
var updateThumbnail = [];
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

        // console.log('\n\n-------- 2016 0520 title --------- : ' + imdb_baseUrl + detailUrl[that.position-1]['attribs']['href']);
        console.log('\n\n-------- 2016 0520 title --------- : ' + $(title[that.position-1]).text() + '\n' + that.title);
        dbIMDB.imdb.insert({
            'top': parseInt(that.position), 
            'title': that.title,
            'year': $(year[that.position-1]).text().slice(1,5),
            'rating': $(rating[that.position-1]).text(),
            'description': title[that.position-1]['attribs']['title'],
            'detailUrl': imdb_baseUrl + detailUrl[that.position-1]['attribs']['href'],
            'Infotitle': that.title
        });
        done(null);
    });
  },
  //fetch update info into Obj
  function (done) {
    console.log('\n\n-------- 2016 0520 step2 --------- ' + that.title );
    dbIMDB.imdb.findOne({title: that.title}, function(err, doc) {
        if (doc) {
            new MovieInfomer(that.title, myapiToken, 0, done);
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
                        var hash = $('.slate_wrapper .poster img')[0];
                        hash = hash['attribs']['src'].split('images')[1].split('._V1')[0].slice(3);
                        if (hash.indexOf('@')!= -1) {
                            hash = hash.split('@')[0];
                        }
                        console.log('hash: ' + hash);
                        dbIMDB.imdb.update({'title': doc['title']}, {'$set': {'posterUrl': path}});
                        dbIMDB.imdb.update({'title': doc['title']}, {'$set': {'posterHash': hash}});
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
                        dbIMDB.imdb.update({'title': doc['title']}, {'$set': {'posterUrl': path}});
                        dbIMDB.imdb.update({'title': doc['title']}, {'$set': {'posterHash': hash}});
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
  },
  function (done) {
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
  },
  function (done) {
    console.log('\n\n-------- 2016 0520 step8 --------- ' + that.title );
    dbIMDB.imdb.findOne({title: that.title}, function(err, doc) {
        if (doc) {
            new Trailer(that.title, youTube, 0, done);
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
 ], function (err) {
        if (err) console.error(err.stack);
        console.log('\n\n-------- 2016 0520 final step ---------' + that.title );
        that.emit('updated', that.title);
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

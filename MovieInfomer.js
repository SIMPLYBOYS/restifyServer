var http = require('http');
var cheerio = require('cheerio');
var util = require('util');
var request = require("request");
var async = require('async');
var EventEmitter = require('events').EventEmitter;
var STATUS_CODES = http.STATUS_CODES;
/*
 * Scraper Constructor
**/
function MovieInformer (title, apiToken, dbIMDB, done) {
    this.title = title;
    this.apiToken = apiToken;
    this.dbIMDB = dbIMDB;
    this.init();
    this.done = done;
}
/*
 * Make it an EventEmitter
**/
util.inherits(MovieInformer, EventEmitter);

/*
 * Initialize scraping
**/
MovieInformer.prototype.init = function () {
    var self = this;
    console.log('init MovieInformer!');
    self.on('finish', function (movieInfo) {
        // console.log(movieInfo);
        var info = JSON.parse(movieInfo);
            info = info[0];
        console.log(self.title);

        async.series([
            function (done) {
              self.dbIMDB.imdb.update({'title': self.title}, {'$set': {'detailContent': {
                    summery: info['simplePlot'],
                    country: info['countries'],
                    rated: info['rated']
                }}
              }, function(){
                done(null);
              });
            },
            function (done) {
              self.dbIMDB.imdb.update({'title': self.title}, {'$set': {'plot': info['plot']
                }
              }, function() {
                done(null);
              });
            },
            function (done) {
              self.dbIMDB.imdb.update({'title': self.title}, {'$set': {'genres': info['genres']
                }
              }, function() {
                done(null);
              });
            },
            function (done) {
              self.dbIMDB.imdb.update({'title': self.title}, {'$set': {'metascore': info['metascore']
                }
              }, function() {
                done(null);
              });
            },
            function (done) {
              self.dbIMDB.imdb.update({'title': self.title}, {'$set': {'rating': info['rating']
                }
              }, function() {
                done(null);
              });
            },
            function (done) {
              self.dbIMDB.imdb.update({'title': self.title}, {'$set': {'votes': info['votes']
                }
              }, function() {
                done(null);
              });
            },
            function (done) {
              self.dbIMDB.imdb.update({'title': self.title}, {'$set': {'runtime': info['runtime']
                }
              }, function(){
                done(null);
              });
            },
            function (done) {
              self.dbIMDB.imdb.update({'title': self.title}, {'$set': {'directors': info['directors']
                }
              }, function(){
                done(null);
              });
            },
            function (done) {
              self.dbIMDB.imdb.update({'title': self.title}, {'$set': {'writers': info['writers']
                }
              }, function() {
                done(null);
              });
            },
            function (done) {
              self.dbIMDB.imdb.update({'title': self.title}, {'$set': {'idIMDB': info['idIMDB']
                }
              }, function() {
                done(null);
              });
            },
            function (done) {
              self.dbIMDB.imdb.update({'title': self.title}, {'$set': {'releaseDate': parseInt(info['releaseDate'])
                }
              }, function() {
                done(null);
              });
            },
            function (done) {
              self.dbIMDB.imdb.update({'title': self.title}, {'$set': {'year': parseInt(info['year'])
                }
              }, function() {
                done(null);
              });
            }
          ],
          function(err) {
            if (self.done)
              self.done(null);
          });
    });
    self.findMovieInfo();
};

/*
 * Parse html and return an object
**/
MovieInformer.prototype.findMovieInfo = function () {
    var self = this;
    if (self.title.trim() == 'Tôkyô monogatari')
      var Url = "http://api.myapifilms.com/imdb/idIMDB?idIMDB=tt0046438"+ "&token=" + self.apiToken;
    else
      var Url = "http://api.myapifilms.com/imdb/idIMDB?title="+ self.title + "&token=" + self.apiToken;
    request({
        url: Url,
        encoding: 'utf8',
        method: "GET"
    }, function(err, req, json) {
        if(err || !json) { return; }
        var movieInfo = JSON.parse(json),
            bar = movieInfo['data']['movies'];
            // console.log(json);

        self.emit('finish', JSON.stringify(bar));
    });
};

module.exports = MovieInformer;

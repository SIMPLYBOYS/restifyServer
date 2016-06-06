var http = require('http');
var cheerio = require('cheerio');
var util = require('util');
var request = require("request");
var async = require('async');
var EventEmitter = require('events').EventEmitter;
var config = require('./config');
var dbIMDB = config.dbIMDB;
var STATUS_CODES = http.STATUS_CODES;
/*
 * Scraper Constructor
**/
function MovieInformer (title, apiToken, innerCount, innerallback) {
    this.title = title;
    this.apiToken = apiToken;
    this.count = innerCount;
    this.done = innerallback;
    this.init();
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
    console.log('init MovieInformer ' + self.title);
    self.on('finish', function (movieInfo) {
        console.log('parse finish');
        // console.log(movieInfo);
        var info = JSON.parse(movieInfo);
            info = info[0];
        console.log(info);

        async.series([
            function (done) {
              dbIMDB.imdb.update({'title': self.title}, {'$set': {'detailContent': {
                    summery: info['simplePlot'],
                    country: info['countries'],
                    rated: info['rated']
                }}
              }, function(err, doc){
                console.log(err);
                console.log('step1');
                done(null);
              });
            },
            function (done) {
              dbIMDB.imdb.update({'title': self.title}, {'$set': {'plot': info['plot']
                }
              }, function() {
                console.log('step2');
                done(null);
              });
            },
            function (done) {
              dbIMDB.imdb.update({'title': self.title}, {'$set': {'genres': info['genres']
                }
              }, function() {
                console.log('step3');
                done(null);
              });
            },
            function (done) {
              dbIMDB.imdb.update({'title': self.title}, {'$set': {'metascore': info['metascore']
                }
              }, function() {
                console.log('step4');
                done(null);
              });
            },
            function (done) {
              dbIMDB.imdb.update({'title': self.title}, {'$set': {'rating': info['rating']
                }
              }, function() {
                console.log('step5');
                done(null);
              });
            },
            function (done) {
              dbIMDB.imdb.update({'title': self.title}, {'$set': {'votes': info['votes']
                }
              }, function() {
                console.log('step6');
                done(null);
              });
            },
            function (done) {
              dbIMDB.imdb.update({'title': self.title}, {'$set': {'runtime': info['runtime']
                }
              }, function(){
                console.log('step7');
                done(null);
              });
            },
            function (done) {
              dbIMDB.imdb.update({'title': self.title}, {'$set': {'directors': info['directors']
                }
              }, function(){
                console.log('step8');
                done(null);
              });
            },
            function (done) {
              dbIMDB.imdb.update({'title': self.title}, {'$set': {'writers': info['writers']
                }
              }, function() {
                console.log('step9');
                done(null);
              });
            },
            function (done) {
              dbIMDB.imdb.update({'title': self.title}, {'$set': {'idIMDB': info['idIMDB']
                }
              }, {multi: true}, function() {
                console.log('step10' + ' ==> ' + info['idIMDB']);
                done(null);
              });
            },
            function (done) {
              dbIMDB.imdb.update({'title': self.title}, {'$set': {'releaseDate': parseInt(info['releaseDate'])
                }
              }, function() {
                console.log('step11');
                done(null);
              });
            },
            function (done) {
              dbIMDB.imdb.update({'title': self.title}, {'$set': {'year': parseInt(info['year'])
                }
              }, function() {
                console.log('step12');
                done(null);
              });
            }
          ],
          function(err) {
            if (self.done) {
              console.log('last step');
              self.done(null, self.count);
            }
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

var http = require('http');
var cheerio = require('cheerio');
var util = require('util');
var request = require("request");
var async = require('async');
var EventEmitter = require('events').EventEmitter;
var config = require('./config');
var mongojs = require('mongojs');
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
              if (self.title == 'Ben-Hur') {
                dbIMDB.imdb.findOne({'_id': mongojs.ObjectId('5705057233c8ea8e13b62488')}, {'$set': {'detailContent': {
                      summery: info['simplePlot'],
                      country: info['countries'],
                      rated: info['rated']
                  }}
                },
                  function(err, doc) {
                    console.log(err);
                    console.log('step1');
                    done(null);
                });
              } else {
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
              }
            },
            function (done) {
              if (self.title == 'Ben-Hur') {
                dbIMDB.imdb.findOne({'_id': mongojs.ObjectId('5705057233c8ea8e13b62488')}, {'$set': {'plot': info['plot']
                  }
                }, function(err, doc) {
                  console.log('step2');
                  done(null);
                });
              } else {
                dbIMDB.imdb.update({'title': self.title}, {'$set': {'plot': info['plot']
                  }
                }, function() {
                  console.log('step2');
                  done(null);
                });
              }
            },
            function (done) {
              if (self.title == 'Ben-Hur') {
                dbIMDB.imdb.findOne({'_id': mongojs.ObjectId('5705057233c8ea8e13b62488')},  {'$set': {'genres': info['genres']
                  }
                }, function(err, doc) {
                  console.log('step3');
                  done(null);
                });
              } else {
                dbIMDB.imdb.update({'title': self.title}, {'$set': {'genres': info['genres']
                  }
                }, function() {
                  console.log('step3');
                  done(null);
                });
              }
            },
            function (done) {
              if (self.title == 'Ben-Hur') {
                dbIMDB.imdb.findOne({'_id': mongojs.ObjectId('5705057233c8ea8e13b62488')}, {'$set': {'metascore': info['metascore']
                  }
                }, function() {
                  console.log('step4');
                  done(null);
                });
              } else {
                dbIMDB.imdb.update({'title': self.title}, {'$set': {'metascore': info['metascore']
                  }
                }, function() {
                  console.log('step4');
                  done(null);
                });
              }
            },
            function (done) {
              if (self.title == 'Ben-Hur') {
                dbIMDB.imdb.findOne({'_id': mongojs.ObjectId('5705057233c8ea8e13b62488')}, {'$set': {'rating': info['rating']
                  }
                }, function() {
                  console.log('step5');
                  done(null);
                });
              } else {
                dbIMDB.imdb.update({'title': self.title}, {'$set': {'rating': info['rating']
                  }
                }, function() {
                  console.log('step5');
                  done(null);
                });
              }
            },
            function (done) {
              if (self.title == 'Ben-Hur') {
                dbIMDB.imdb.findOne({'_id': mongojs.ObjectId('5705057233c8ea8e13b62488')},{'$set': {'votes': info['votes']
                  }
                }, function() {
                  console.log('step6');
                  done(null);
                });
              } else {
                dbIMDB.imdb.update({'title': self.title}, {'$set': {'votes': info['votes']
                  }
                }, function() {
                  console.log('step6');
                  done(null);
                });
              }
            },
            function (done) {
              if (self.title == 'Ben-Hur') {
                dbIMDB.imdb.findOne({'_id': mongojs.ObjectId('5705057233c8ea8e13b62488')}, {'$set': {'runtime': info['runtime']
                  }
                }, function(){
                  console.log('step7');
                  done(null);
                });
              } else {
                dbIMDB.imdb.update({'title': self.title}, {'$set': {'runtime': info['runtime']
                  }
                }, function(){
                  console.log('step7');
                  done(null);
                });
              }
            },
            function (done) {
              if (self.title == 'Ben-Hur') {
                dbIMDB.imdb.findOne({'_id': mongojs.ObjectId('5705057233c8ea8e13b62488')}, {'$set': {'directors': info['directors']
                  }
                }, function(){
                  console.log('step8');
                  done(null);
                });
              } else {
                dbIMDB.imdb.update({'title': self.title}, {'$set': {'directors': info['directors']
                  }
                }, function(){
                  console.log('step8');
                  done(null);
                });
              }  
            },
            function (done) {
              if (self.title == 'Ben-Hur') {
                dbIMDB.imdb.findOne({'_id': mongojs.ObjectId('5705057233c8ea8e13b62488')}, {'$set': {'writers': info['writers']
                  }
                }, function() {
                  console.log('step9');
                  done(null);
                });
              } else {
                 dbIMDB.imdb.update({'title': self.title}, {'$set': {'writers': info['writers']
                  }
                }, function() {
                  console.log('step9');
                  done(null);
                });
              }
            },
            function (done) {
              if (self.title == 'Ben-Hur') {
                dbIMDB.imdb.findOne({'_id': mongojs.ObjectId('5705057233c8ea8e13b62488')}, {'$set': {'idIMDB': info['idIMDB']
                  }
                }, function() {
                  console.log('step10' + ' ==> ' + info['idIMDB']);
                  done(null);
                });
              } else {
                dbIMDB.imdb.update({'title': self.title}, {'$set': {'idIMDB': info['idIMDB']
                  }
                }, {multi: true}, function() {
                  console.log('step10' + ' ==> ' + info['idIMDB']);
                  done(null);
                });
              }
            },
            function (done) {
              if (self.title == 'Ben-Hur') {
                dbIMDB.imdb.findOne({'_id': mongojs.ObjectId('5705057233c8ea8e13b62488')}, {'$set': {'releaseDate': parseInt(info['releaseDate'])
                  }
                }, function() {
                  console.log('step11');
                  done(null);
                });
              } else {
                dbIMDB.imdb.update({'title': self.title}, {'$set': {'releaseDate': parseInt(info['releaseDate'])
                  }
                }, function() {
                  console.log('step11');
                  done(null);
                });
              }      
            },
            function (done) {
              if (self.title == 'Ben-Hur') {
                dbIMDB.imdb.findOne({'_id': mongojs.ObjectId('5705057233c8ea8e13b62488')}, {'$set': {'year': parseInt(info['year'])
                  }
                }, function() {
                  console.log('step12');
                  done(null);
                });
              } else {
                dbIMDB.imdb.update({'title': self.title}, {'$set': {'year': parseInt(info['year'])
                  }
                }, function() {
                  console.log('step12');
                  done(null);
                });
              } 
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

function specialCase(title) {
  if (title == 'Tôkyô monogatari')
    return true;
  else if (title == 'Невероятная история') {
    return true;
  } else {
    return false;
  }
}

function getImdbId(title) {
  switch (title) {
    case 'Tôkyô monogatari':
      return 'tt0046438';
      break;
    case 'Невероятная история':
      return 'tt2283748'
      break;
    default: 
      console.log('no matching title')
      break;
  }
}

/*
 * Parse html and return an object
**/
MovieInformer.prototype.findMovieInfo = function () {
    var self = this;
    var title = self.title.trim();
    if (specialCase(title))
      var Url = "http://api.myapifilms.com/imdb/idIMDB?idIMDB=" + getImdbId(title) + "&token=" + self.apiToken;
    else
      var Url = "http://api.myapifilms.com/imdb/idIMDB?title="+ title + "&token=" + self.apiToken;
    request({
        url: Url,
        encoding: 'utf8',
        method: "GET"
    }, function(err, req, json) {
        if(err || !json) { return; }
        console.log(json);
        var movieInfo = JSON.parse(json),
            bar = movieInfo.hasOwnProperty('data') ? movieInfo['data']['movies'] : null;

        if (!bar)
          self.done(null, self.count);
        else
          self.emit('finish', JSON.stringify(bar));
    });
};

module.exports = MovieInformer;

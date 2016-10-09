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
    console.log('init MovieInformer ====>' + self.title);
    self.on('finish', function (movieInfo) {
        console.log('parse finish');
        var info = JSON.parse(movieInfo);
            info = info[0];
        console.log(info);

        async.series([
            function (done) {
              if (self.title == 'Ben-Hur') {
                dbIMDB.imdb.findOne({'_id': mongojs.ObjectId('5705057233c8ea8e13b62488')}, {$set: {
                    detailContent: {
                        summery: info['simplePlot'],
                        // country: info['countries'].split('"')[1].split('"')[0],
                        country: info['countries'][0],
                        rated: info['rated']
                    },
                    plot: info['plot'],
                    genres: info['genres'],
                    metascore: info['metascore'],
                    rating: {
                        score: info['rating'],
                        votes: info['votes']
                    },
                    runtime: info['runtime'],
                    directors: info['directors'],
                    writers: info['writers'],
                    idIMDB: info['idIMDB'],
                    releaseDate: parseInt(info['releaseDate']),
                    year: parseInt(info['year'])
                  }
                }, function(err, doc) {
                    console.log(err);
                    console.log('step1');
                    done(null);
                });
              } else {
                dbIMDB.imdb.update({'title': self.title}, {$set: {
                    detailContent: {
                        summery: info['simplePlot'],
                        // country: info['countries'].split('"')[1].split('"')[0],
                        country: info['countries'][0],
                        rated: info['rated']
                    },
                    plot: info['plot'],
                    genres: info['genres'],
                    metascore: info['metascore'],
                    rating: {
                        score: info['rating'],
                        votes: info['votes']
                    },
                    runtime: info['runtime'],
                    directors: info['directors'],
                    writers: info['writers'],
                    idIMDB: info['idIMDB'],
                    releaseDate: parseInt(info['releaseDate']),
                    year: parseInt(info['year'])
                  }
                }, function(err, doc){
                  console.log(err);
                  done(null);
                });
              }
            },
          ],
          function(err) {
            if (self.done) {
               console.log('init MovieInformer ====>' + self.title + ' finish!!!');
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
            info = movieInfo.hasOwnProperty('data') ? movieInfo['data']['movies'] : null;

        if (!info)
          self.done(null, self.count);
        else
          self.emit('finish', JSON.stringify(info));
    });
};

module.exports = MovieInformer;

var http = require('http');
var cheerio = require('cheerio');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var mongojs = require('mongojs');
var config = require('../config');
var dbJapan = config.dbJapan;
var dbKorea = config.dbKorea;
var STATUS_CODES = http.STATUS_CODES;
/*
 * Scraper Constructor
**/
function TrendsTrailer (country, title, youTube, innerCount, callback) {
    this.country = country;
    this.title = title;
    this.youTube = youTube;
    this.count = innerCount;
    this.done = callback;
    this.init();
}
/*
 * Make it an EventEmitter
**/
util.inherits(TrendsTrailer, EventEmitter);

/*
 * Initialize scraping
**/
TrendsTrailer.prototype.init = function () {
    var self = this;
    console.log('init trailer! ');
    self.on('finish', function (trailerUrl) {
        console.log(trailerUrl);
        if (self.country == 'jp') {
          dbJapan.japan.update({'title': self.title}, {'$set': {'trailerUrl': trailerUrl}
                }, function() {
                  if (self.done) {
                    self.done(null, self.count);
                  }  
          });
        } else if (self.country == 'kr') {
          dbKorea.korea.update({'title': self.title}, {'$set': {'trailerUrl': trailerUrl}
                }, function() {
                  if (self.done) {
                    self.done(null, self.count);
                  }  
          });
        }
    });
    self.findTrailer();
};

/*
 * Parse html and return an object
**/
TrendsTrailer.prototype.findTrailer = function (html) {
    var self = this;
    youTube.search(self.title, 2, function(error, result) {
      if (error) {
        console.log(error);
      } else {
        result['items'].forEach(
          function loop (item, index) {
            if (loop.stop) { return; }
            if (item['id']['videoId']) {
              // console.log(item['id']['videoId']);
              self.emit('finish', 'https://www.youtube.com/watch?v=' + item['id']['videoId']);
              loop.stop = true;
            }
        });
      }
    });
};

module.exports = TrendsTrailer;

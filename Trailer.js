var http = require('http');
var cheerio = require('cheerio');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var STATUS_CODES = http.STATUS_CODES;
/*
 * Scraper Constructor
**/
function Trailer (title, youtube, dbIMDB, done) {
    this.title = title;
    this.youtube = youtube;
    this.dbIMDB = dbIMDB;
    this.init();
    this.done = done;
}
/*
 * Make it an EventEmitter
**/
util.inherits(Trailer, EventEmitter);

/*
 * Initialize scraping
**/
Trailer.prototype.init = function () {
    var self = this;
    console.log('init trailer!');
    self.on('finish', function (trailerUrl) {
        console.log(trailerUrl);
        self.dbIMDB.imdb.update({'title': self.title}, {'$set': {'trailerUrl': trailerUrl}
        }, function(){
          if (self.done)
          self.done(null);
        });
    });
    self.findTrailer();
};

/*
 * Parse html and return an object
**/
Trailer.prototype.findTrailer = function (html) {
    var self = this;
    youTube.search(this.title, 2, function(error, result) {
      if (error) {
         console.log(error);
      } else {
         self.emit('finish', 'https://www.youtube.com/watch?v=' + result['items'][0]['id']['videoId']);
      }
    });
};

module.exports = Trailer;

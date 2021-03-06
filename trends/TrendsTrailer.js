var http = require('http');
var cheerio = require('cheerio');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var mongojs = require('mongojs');
var config = require('../config');
var dbJapan = config.dbJapan;
var dbKorea = config.dbKorea;
var dbFrance = config.dbFrance;
var dbHonKong = config.dbHonKong;
var dbTaiwan = config.dbTaiwan;
var dbChina = config.dbChina;
var dbGermany = config.dbGermany;
var dbAustralia = config.dbAustralia;
var dbThailand = config.dbThailand;
var dbPoland = config.dbPoland;
var dbItalia = config.dbItalia;
var dbIndia = config.dbIndia;
var dbSpain = config.dbSpain;
var dbUK = config.dbUK;
var dbUSA = config.dbUSA;
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
          dbJapan.japan.update({title: self.title}, {'$set': {trailerUrl: trailerUrl}
                }, function() {
                  if (self.done) {
                    self.done(null, self.count);
                  }  
          });
        } else if (self.country == 'kr') {
          dbKorea.korea.update({title: self.title}, {'$set': {trailerUrl: trailerUrl}
                }, function() {
                  if (self.done) {
                    self.done(null, self.count);
                  }  
          });
        } else if (self.country == 'fr') {
          dbFrance.france.update({title: self.title}, {'$set': {trailerUrl: trailerUrl}
                }, function() {
                  if (self.done) {
                    self.done(null, self.count);
                  }  
          });
        } else if (self.country == 'tw') {
          dbTaiwan.taiwan.update({title: self.title}, {'$set': {trailerUrl: trailerUrl}
                }, function() {
                  if (self.done) {
                    self.done(null, self.count);
                  }  
          });
        } else if (self.country == 'us') {
          dbUSA.usa.update({title: self.title}, {'$set': {trailerUrl: trailerUrl}
                }, function() {
                  if (self.done) {
                    self.done(null, self.count);
                  }  
          });
        } else if (self.country == 'cn') {
          dbChina.china.update({title: self.title}, {'$set': {trailerUrl: trailerUrl}
                }, function() {
                if (self.done) {
                  self.done(null, self.count);
                }  
          });
        } else if (self.country == 'gm') {
          dbGermany.germany.update({title: self.title}, {'$set': {trailerUrl: trailerUrl}
                }, function() {
                if (self.done) {
                  self.done(null, self.count);
                }  
          });
        } else if (self.country == 'hk') {
          dbHonKong.honkong.update({title: self.title}, {'$set': {trailerUrl: trailerUrl}
                }, function() {
                if (self.done) {
                  self.done(null, self.count);
                }  
          });
        } else if (self.country == 'uk') {
          dbUK.uk.update({title: self.title}, {'$set': {trailerUrl: trailerUrl}
                }, function() {
                if (self.done) {
                  self.done(null, self.count);
                }  
          });
        } else if (self.country == 'au') {
          dbAustralia.australia.update({title: self.title}, {'$set': {trailerUrl: trailerUrl}
                }, function() {
                if (self.done) {
                  self.done(null, self.count);
                }  
          });
        } else if (self.country == 'tl') {
          dbThailand.thailand.update({title: self.title}, {'$set': {trailerUrl: trailerUrl}
                }, function() {
                if (self.done) {
                  self.done(null, self.count);
                }  
          });
        } else if (self.country == 'id') {
          dbIndia.india.update({title: self.title}, {'$set': {trailerUrl: trailerUrl}
                }, function() {
                if (self.done) {
                  self.done(null, self.count);
                }  
          });
        } else if (self.country == 'it') {
          dbItalia.italia.update({title: self.title}, {'$set': {trailerUrl: trailerUrl}
                }, function() {
                if (self.done) {
                  self.done(null, self.count);
                }  
          });
        } else if (self.country == 'sp') {
          dbSpain.spain.update({title: self.title}, {'$set': {trailerUrl: trailerUrl}
                }, function() {
                if (self.done) {
                  self.done(null, self.count);
                }  
          });
        } else if (self.country == 'pl') {
          dbPoland.poland.update({title: self.title}, {'$set': {trailerUrl: trailerUrl}
                }, function() {
                if (self.done) {
                  self.done(null, self.count);
                }  
          });
        }
    });
    self.on('fail', function(){
      if (self.done) {
        self.done(null, self.count);
      }  
    });
    self.findTrailer();
};

/*
 * Parse html and return an object
**/
TrendsTrailer.prototype.findTrailer = function (html) {
    var self = this;
    var query = self.country == 'tw' ? ' 預告' : ' trailer';
    youTube.search(this.title+query, 2, function(error, result) {
      if (error) {
        console.log(error);
      } else {
        if (result['items'].length > 0) {
          result['items'].forEach(
            function loop (item, index) {
              if (loop.stop)  return; 
              if (item['id']['videoId']) {
                // console.log(item['id']['videoId']);
                self.emit('finish', 'https://www.youtube.com/watch?v=' + item['id']['videoId']);
                loop.stop = true;
              } else {
                console.log('no trailer were found!');
                self.emit('fail', null);
              }
          });
        } else {
          self.emit('fail', null);
        }
      }
    });
};

module.exports = TrendsTrailer;

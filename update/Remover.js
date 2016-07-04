var http = require('http');
var cheerio = require('cheerio');
var util = require('util');
var config = require('../config');
var dbIMDB = config.dbIMDB;
var EventEmitter = require('events').EventEmitter;
var STATUS_CODES = http.STATUS_CODES;
/*
 * Scraper Constructor
**/
function Remover (title, position) {
    this.title = title;
    this.position = position;
    this.init();
}
/*
 * Make it an EventEmitter
**/
util.inherits(Remover, EventEmitter);

/*
 * Initialize scraping
**/
Remover.prototype.init = function () {
    this.on('updated', function (title) {
        console.log('\n====> \"'+title + '\" got updated!!!');
        this.emit('complete', title);
    });
    this.updateMovie();
};

/*
 * Parse html and return an object
**/
Remover.prototype.updateMovie = function () {
  
  var that = this;

  dbIMDB.imdb.findOne({'Infotitle': that['title']}, function(err, doc) {

      if (!doc) {
        console.log('\n\n' + that['title'] + 'not found!');
        return;     
      }

      dbIMDB.imdb.update({'Infotitle': that['title']}, {'$unset': {'top': 1}}, function() {
        that.emit('updated', that.title);
      });
  })
};

module.exports = Remover;

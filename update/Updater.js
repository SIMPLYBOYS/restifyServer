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
function Updater (title, position) {
    this.title = title;
    this.position = position;
    this.init();
}
/*
 * Make it an EventEmitter
**/
util.inherits(Updater, EventEmitter);

/*
 * Initialize scraping
**/
Updater.prototype.init = function () {
    this.on('updated', function (title) {
        console.log('\n====> \"'+title + '\" got updated!!!');
        this.emit('complete', title);
    });
    this.updateMovie();
};

/*
 * Parse html and return an object
**/
Updater.prototype.updateMovie = function () {
  
  var that = this;

  dbIMDB.imdb.findOne({'title': that['title']}, function(err, doc) {

      if (!doc) {
        console.log('\n\n' + doc['title'] + 'not found!');
        return;     
      }

      dbIMDB.imdb.update({'title': that['title']}, {'$set': {'top': parseInt(that['position'])}}, function() {
        that.emit('updated', that.title);
      });
  })
};

module.exports = Updater;

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
function Thumbnail (title, url) {
    this.title = title;
    this.url = url;
    this.init();
}
/*
 * Make it an EventEmitter
**/
util.inherits(Thumbnail, EventEmitter);

/*
 * Initialize scraping
**/
Thumbnail.prototype.init = function () {
    var model;
    var self = this;
    self.on('loaded', function (html) {
        model = self.parsePage(html);
        self.emit('complete', model);
    });
    self.loadWebPage();
};

Thumbnail.prototype.loadWebPage = function () {
  var self = this;
  http.get(self.url, function (res) {
    var body = '';
    if(res.statusCode !== 200) {
      return self.emit('error', STATUS_CODES[res.statusCode]);
    }
    res.on('data', function (chunk) {
      body += chunk;
    });
    res.on('end', function () {
      self.emit('loaded', body);
    });
  })
  .on('error', function (err) {
    self.emit('error', err);
  });      
};

Thumbnail.prototype.parsePage = function (html) {
  var $ = cheerio.load(html);

  var model = {
    type: 'full',
    url: $('.photo a img')[0]['attribs']['src'],
  }
  return model;
};

module.exports = Thumbnail;

var http = require('http');
var cheerio = require('cheerio');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var STATUS_CODES = http.STATUS_CODES;
/*
 * Scraper Constructor
**/
function usCastAvatarScraper(avatar) {
    console.log(avatar);
    this.url = avatar['link'];
    this.title = avatar['title'];
    this.cast = avatar['cast'];
    this.init();
}
/*
 * Make it an EventEmitter
**/
util.inherits(usCastAvatarScraper, EventEmitter);

/*
 * Initialize scraping
**/
usCastAvatarScraper.prototype.init = function () {
    var model;
    var self = this;
    self.on('loaded', function (html) {
        model = self.parsePage(html);
        self.emit('complete', model);
    });
    self.loadWebPage();
};

usCastAvatarScraper.prototype.loadWebPage = function () {
  var self = this;
  // console.log('\n\nLoading ' + website);
  console.log('loading ' + self.url);
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

/*
 * Parse html and return an object
**/
usCastAvatarScraper.prototype.parsePage = function (html) {
  var $ = cheerio.load(html);
  var picturesUrl;
  var title;

  picturesUrl = $('#name-overview-widget .image img').attr('src');

  console.log('title ---> ' + this.title);
  console.log('cast ---> ' + this.cast);
  console.log('picturesUrl ---> ' + picturesUrl);

  return model = {
    title: this.title,
    cast: this.cast,
    picturesUrl: picturesUrl
  };
};

module.exports = usCastAvatarScraper;

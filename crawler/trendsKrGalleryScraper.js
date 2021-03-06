var http = require('http');
var cheerio = require('cheerio');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var STATUS_CODES = http.STATUS_CODES;
/*
 * Scraper Constructor
**/
function trendsKrGalleryScraper (url) {
    this.url = url;
    this.init();
}
/*
 * Make it an EventEmitter
**/
util.inherits(trendsKrGalleryScraper, EventEmitter);

/*
 * Initialize scraping
**/
trendsKrGalleryScraper.prototype.init = function () {
    var model;
    var self = this;
    self.on('loaded', function (html) {
        model = self.parsePage(html);
        self.emit('complete', model);
    });
    self.loadWebPage();
};

trendsKrGalleryScraper.prototype.loadWebPage = function () {
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
trendsKrGalleryScraper.prototype.parsePage = function (html) {
  var $ = cheerio.load(html);
  var picturesUrl;
  var title;

  $('.h_movie a').each(function(index, item){
    if (index ==0)
      title = $(item).text();
  });
  console.log('title ---> ' + title);
  picturesUrl = $('.viewer_img img').attr('src');
   console.log('picturesUrl ---> ' + picturesUrl);

  return model = {
    title: title,
    picturesUrl: picturesUrl
  };
};

module.exports = trendsKrGalleryScraper;

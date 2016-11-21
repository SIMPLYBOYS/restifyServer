var http = require('http');
var cheerio = require('cheerio');
var util = require('util');
var request = require("request");
var request = request.defaults({jar: true});
var EventEmitter = require('events').EventEmitter;
var STATUS_CODES = http.STATUS_CODES;
/*
 * Scraper Constructor
**/
function trendsFrGalleryScraper (url) {
    this.url = url;
    this.init();
}
/*
 * Make it an EventEmitter
**/
util.inherits(trendsFrGalleryScraper, EventEmitter);

/*
 * Initialize scraping
**/
trendsFrGalleryScraper.prototype.init = function () {
    var model;
    var self = this;
    self.on('loaded', function (html) {
        model = self.parsePage(html);
        self.emit('complete', model);
    });
    self.loadWebPage();
};

trendsFrGalleryScraper.prototype.loadWebPage = function () {
  var self = this;
  console.log('loading ' + self.url);
  request({
      url: self.url,
      encoding: 'utf8',
      followRedirect: true,
      timeout: 2500,
      maxRedirects:1,
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.87 Safari/537.36',
        'Accept' : 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8' 
      },
      method: "GET",
  }, function(err, response, body) {
          if (err || !body) { 
              console.log(err);
              self.emit('error', null);
              return;
          }
          self.emit('loaded', body);
  });
};

/*
 * Parse html and return an object
**/
trendsFrGalleryScraper.prototype.parsePage = function (html) {
  var $ = cheerio.load(html);
  var picturesUrl;
  var title;

  // title = $('.titlebar-title a').text();
  $('.breadcrumb a').each(function(index, item){
      if (index == 4)
        title = $(item).text();
  })

  console.log('title ---> ' + title);
  picturesUrl = $('.picture img').attr('src');
  console.log('picturesUrl ---> ' + picturesUrl);

  return model = {
    title: title,
    picturesUrl: picturesUrl
  };
};

module.exports = trendsFrGalleryScraper;

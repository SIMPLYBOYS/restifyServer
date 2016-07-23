var http = require('http');
var cheerio = require('cheerio');
var util = require('util');
var request = require("request");
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
  request({
      url: self.url,
      encoding: 'utf8',
      followRedirect: true,
      timeout: 1500,
      maxRedirects:1,
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.87 Safari/537.36',
        'Accept' : 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8' 
      },
      method: "GET",
    }, function(err, response, body) {
          if (err || !body) { 
             console.log(err.code);
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

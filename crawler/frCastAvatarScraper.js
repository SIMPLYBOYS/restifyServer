var http = require('http');
var cheerio = require('cheerio');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var request = require("request");
var request = request.defaults({jar: true});
var STATUS_CODES = http.STATUS_CODES;
/*
 * Scraper Constructor
**/
function frCastAvatarScraper(avatar) {
    console.log(avatar);
    this.url = avatar['link'];
    this.title = avatar['title'];
    this.cast = avatar['cast'];
    this.init();
}
/*
 * Make it an EventEmitter
**/
util.inherits(frCastAvatarScraper, EventEmitter);

/*
 * Initialize scraping
**/
frCastAvatarScraper.prototype.init = function () {
    var model;
    var self = this;
    self.on('loaded', function (html) {
        model = self.parsePage(html);
        self.emit('complete', model);
    });
    self.loadWebPage();
};

frCastAvatarScraper.prototype.loadWebPage = function () {
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
frCastAvatarScraper.prototype.parsePage = function (html) {
  var $ = cheerio.load(html);
  var picturesUrl;
  var title;

  // title = $('.titlebar-title a').text();
  $('.img_side_content').each(function(index, item){
      if (index == 0)
        picturesUrl = $(item).find('img').attr('src');
  });

  console.log('title ---> ' + this.title);
  console.log('cast ---> ' + this.cast);
  console.log('picturesUrl ---> ' + picturesUrl);

  return model = {
    title: this.title,
    cast: this.cast,
    picturesUrl: picturesUrl
  };
};

module.exports = frCastAvatarScraper;

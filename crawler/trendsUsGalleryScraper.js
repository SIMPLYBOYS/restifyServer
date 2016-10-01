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
function trendsUsGalleryScraper (gallery) {
    this.url = gallery['photoUrl'];
    this.title = gallery['title'];
    this.init();
}
/*
 * Make it an EventEmitter
**/
util.inherits(trendsUsGalleryScraper, EventEmitter);

/*
 * Initialize scraping
**/
trendsUsGalleryScraper.prototype.init = function () {
    var model;
    var self = this;
    self.on('loaded', function (html) {
        model = self.parsePage(html);
        self.emit('complete', model);
    });
    self.loadWebPage();
};

trendsUsGalleryScraper.prototype.loadWebPage = function () {
  var self = this;
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
trendsUsGalleryScraper.prototype.parsePage = function (html) {

  var $ = cheerio.load(html);
  var self = this;
  var picturesUrl;
  // var title;
  var position = self.url.split('pos_')[1];

  if (typeof(position) == 'undefined') {
    position = self.url.split('sf_')[1];
  } 

  if (typeof(position) == 'undefined') {
    position = self.url.split('evt_')[1];
  }

  if (typeof(position) == 'undefined') {
    position = self.url.split('pbl_')[1];
  }

  if (typeof(position) == 'undefined') {
    position = self.url.split('art_')[1];
  }

  if (typeof(position) == 'undefined') {
    position = self.url.split('bts_')[1];
  }

  if (typeof(position) == 'undefined') {
    position = self.url.split('prd_')[1];
  }

  if (typeof(position) == 'undefined') {
    position = self.url.split('ukn_')[1];
  }

  // title = $('.parent a').text();

  // if (title == '')
  //   title = $('title').text().split('(')[0].trim();

  picturesUrl = $('.photo img').attr('src');

  if (typeof(picturesUrl) == 'undefined') {
    var foo = $('#imageJson').text();
    var bar = JSON.parse(foo);
    if (typeof(bar) == 'undefined')
      self.emit('error', null);

    bar.mediaViewerModel.allImages[position-1]['src']
    picturesUrl = bar.mediaViewerModel.allImages[position-1]['src'];
  }

  return model = {
    title: this.title,
    picturesUrl: picturesUrl
  };
};

module.exports = trendsUsGalleryScraper;

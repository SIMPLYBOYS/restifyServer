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
function upComingGalleryScraper (url) {
    this.url = url;
    this.init();
}
/*
 * Make it an EventEmitter
**/
util.inherits(upComingGalleryScraper, EventEmitter);

/*
 * Initialize scraping
**/
upComingGalleryScraper.prototype.init = function () {
    var model;
    var self = this;
    self.on('loaded', function (html) {
        model = self.parsePage(html);
        self.emit('gallery_complete', model);
    });
    self.on('404', function() {
      self.emit('error');
    });
    self.loadWebPage();
};

upComingGalleryScraper.prototype.loadWebPage = function () {
  var self = this;
  console.log('loading ' + self.url);

  request({
        url: self.url,
        encoding: 'utf8',
        followRedirect: true,
        maxRedirects:5,
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.87 Safari/537.36',
          'Accept' : 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8' 
        },
        method: "GET",
    }, function(err, response, body) {
            if (err || !body) { return; }
            self.emit('loaded', body);
    });      
};

/*
 * Parse html and return an object
**/
upComingGalleryScraper.prototype.parsePage = function (html) {

  var $ = cheerio.load(html);
  var self = this;
  var picturesUrl;
  var title;
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

  position = parseInt(position.split(',').join(''));
  let foo = $('script').get()[0].children[0].data.trim();
  picturesUrl = foo.split('msrc')[position].split('src')[1].split('\":"')[1].split('jpg')[0]+'jpg';
  title = $('title').text().split('(')[0].trim();

  if (title == '404 Error - IMDb') {
     self.emit('404');
     return;
  }

  console.log('title ====> ' + title);

  return model = {
    title: title,
    picturesUrl: picturesUrl
  };
};

module.exports = upComingGalleryScraper;

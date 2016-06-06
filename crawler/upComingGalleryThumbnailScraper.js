var http = require('http');
var cheerio = require('cheerio');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var STATUS_CODES = http.STATUS_CODES;
/*
 * Scraper Constructor
**/
function upComingGalleryThumbnailScraper (url) {
    this.url = url;
    this.init();
}
/*
 * Make it an EventEmitter
**/
util.inherits(upComingGalleryThumbnailScraper, EventEmitter);

/*
 * Initialize scraping
**/
upComingGalleryThumbnailScraper.prototype.init = function () {
    var model;
    var self = this;
    self.on('loaded', function (html) {
        model = self.parsePage(html);
        self.emit('complete', model);
    });
    self.loadWebPage();
};

upComingGalleryThumbnailScraper.prototype.loadWebPage = function () {
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
upComingGalleryThumbnailScraper.prototype.parsePage = function (html) {
  var $ = cheerio.load(html);
  var picturesUrl = [];
  var title;

  // fetch for gallery_thumbnail url
  title = $('.parent a').text();
  $('.media_index_thumb_list a').each(function(index, item) {
    var foo = $(this)[0]['attribs']['href'];
    if (foo.localeCompare('/register/login') != 0) {
      picturesUrl.push({ type: 'thumbnail',
        url:  null,
        detailUrl: 'http://www.imdb.com' + foo});
    }
  })

  var model = {
    title: title,
  	picturesUrl: picturesUrl
  }
  return model;
};

module.exports = upComingGalleryThumbnailScraper;

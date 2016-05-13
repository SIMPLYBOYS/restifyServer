var http = require('http');
var cheerio = require('cheerio');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var STATUS_CODES = http.STATUS_CODES;
/*
 * Scraper Constructor
**/
function upComingScraper (url) {
    this.url = url;
    this.init();
}
/*
 * Make it an EventEmitter
**/
util.inherits(upComingScraper, EventEmitter);

/*
 * Initialize scraping
**/
upComingScraper.prototype.init = function () {
    var model;
    var self = this;
    self.on('loaded', function (html) {
        model = self.parsePage(html);
        self.emit('complete', model);
    });
    self.loadWebPage();
};

upComingScraper.prototype.loadWebPage = function () {
  var self = this;
  // console.log('\n\nLoading ' + website);
  console.log('loading ' + 'http:\/\/' + self.url);
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
upComingScraper.prototype.parsePage = function (html) {
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

  // fetch for readMore info
  /*title = $('.title_wrapper h1').text();
  var bar = title.trim().split('(')[0];
  title = bar.slice(0, bar.length-1);
  // console.log('title: ' + bar);
  console.log($('.combined-see-more a').length + ' title: ' + bar);
  
  if ($('.combined-see-more a').length == 1)
    return model = {title: title, url: "", page: 0};

  var url = $('.combined-see-more a')[1]['attribs']['href'];
  var path = 'http://www.imdb.com' + url;
  var foo = $('.combined-see-more a')[1]['children'];
  var page = $(foo[0]).text();
  console.log('page: '+page);
  page = Math.ceil(parseInt(page.split("photos")[0]) / 48);

  return model = {
    title: title,
    url: path,
    page: page
  };*/
};

module.exports = upComingScraper;

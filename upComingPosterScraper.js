var http = require('http');
var cheerio = require('cheerio');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var STATUS_CODES = http.STATUS_CODES;
/*
 * Scraper Constructor
**/
function upComingPosterScraper (url) {
  console.log("0512: " + url);
    this.url = url;
    this.init();
}
/*
 * Make it an EventEmitter
**/
util.inherits(upComingPosterScraper, EventEmitter);

/*
 * Initialize scraping
**/
upComingPosterScraper.prototype.init = function () {
    var model;
    var self = this;
    self.on('loaded', function (html) {
        model = self.parsePage(html);
        self.emit('poster_complete', model);
    });
    self.loadWebPage();
};

upComingPosterScraper.prototype.loadWebPage = function () {
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
upComingPosterScraper.prototype.parsePage = function (html) {
    //------ Step1 ------//
    /*var $ = cheerio.load(html);
    var url = $('.slate_wrapper .poster a img')[0];
    var title = $('.title_wrapper h1').text().split('(')[0].trim();

    if (typeof(url)!=='undefined') {
      var bar = $('.slate_wrapper .poster a')[0];
      
      console.log(title);
      console.log(bar['attribs']['href']);
      var path = 'http://www.imdb.com' + bar['attribs']['href'];
    } else {
      var bar = $('.minPosterWithPlotSummaryHeight .poster a')[0];
      var path = 'http://www.imdb.com' + bar['attribs']['href'];
      console.log(title);
      console.log(bar['attribs']['href']);
    }
    return model = {
      title: title,
      url: path
    };*/

    //------ Step2 ------//
    var $ = cheerio.load(html);
    var url = $('.photo img')[0];
    var title = $('.parent a').text();

    console.log(title + '\n' + url['attribs']['src']);

    return model = {
      title: title,
      url: url['attribs']['src']
    };

};

module.exports = upComingPosterScraper;

var http = require('http');
var cheerio = require('cheerio');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var STATUS_CODES = http.STATUS_CODES;
/*
 * Scraper Constructor
**/
function upComingPosterDescriptionScraper (url) {
    this.url = url;
    this.init();
}
/*
 * Make it an EventEmitter
**/
util.inherits(upComingPosterDescriptionScraper, EventEmitter);

/*
 * Initialize scraping
**/
upComingPosterDescriptionScraper.prototype.init = function () {
    var model;
    var self = this;
    self.on('loaded', function (html) {
        model = self.parsePage(html);
        self.emit('complete', model);
    });
    self.loadWebPage();
};

upComingPosterDescriptionScraper.prototype.loadWebPage = function () {
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
upComingPosterDescriptionScraper.prototype.parsePage = function (html) {
    var $ = cheerio.load(html);
    var url = $('.slate_wrapper .poster a img')[0];
    var title = $('.title_wrapper h1').text().split('(')[0].trim();
    var director = [], stars = [];
    var length = $('.credit_summary_item').length;
    // console.log('\n\n0513 length ====> ' + length + '\n\n');
    $('.credit_summary_item').each(function(index, item) { 
      if (index != 1 || length == 2) {
        bar = $(item).find('a');
        bar.each(function(order, item) {
          if (index == 0)
            director.push($(item).text());
          else if (index == 1 && length == 2)
            stars.push($(item).text());
          else if (index == 2) {
            stars.push($(item).text());
          }
        });
      }
    });

    // console.log('director: ' + director.length + '\n' + 'stars: ' + stars.length);
    
    description = director[0] + ' (dir.), ';stars.length

    for(var i=0; i< stars.length-1; i++)
      description += stars[i];

    console.log('description: ' + description);

    if (typeof(url)!=='undefined') {
      var bar = $('.slate_wrapper .poster a')[0];
      var foo = $('.slate_wrapper .poster img')[0];
      console.log(title);
      console.log(bar['attribs']['href']);
      var path = 'http://www.imdb.com' + bar['attribs']['href'];
      var hash = foo['attribs']['src'].split('images')[1];
      hash = hash.split('@')[0].slice(3);
      console.log('hash code: ' + hash);
    } else {
      var bar = $('.minPosterWithPlotSummaryHeight .poster a')[0];
      if (typeof(bar) == 'undefined') { //the movie without poster now 
        return model = {
          title: title,
          description: description
        }
      }
      var foo = $('.minPosterWithPlotSummaryHeight .poster img')[0];
      var path = 'http://www.imdb.com' + bar['attribs']['href'];
      var hash = foo['attribs']['src'].split('images')[1];
      hash = hash.split('@')[0].slice(3);
      console.log(bar['attribs']['href']);
    }

    return model = {
      title: title,
      url: path,
      description: description,
      hash: hash
    };
};

module.exports = upComingPosterDescriptionScraper;

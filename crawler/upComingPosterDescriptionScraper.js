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
    // var url = $('.slate_wrapper .poster a img')[0];
    var hash = $('.slate_wrapper .poster img')[0];
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
    
    description = director[0] + ' (dir.), ';

    for(var i=0; i< stars.length-1; i++)
      description += stars[i];

    console.log('description: ' + description);

    if (typeof(hash)!='undefined') {
        hash = hash['attribs']['src'].split('images')[3].split('._V1')[0].slice(3);
        path = $('.slate_wrapper .poster a').length > 0 ? 'http://www.imdb.com'+$('.slate_wrapper .poster a')[0]['attribs']['href'] : 'http://ia.media-imdb.com/images/G/01/imdb/images/nopicture/180x268/film-173410679._CB282471105_.png';
        if (hash.indexOf('@')!= -1) 
            hash = hash.split('@')[0];
    } else if ($('.minPosterWithPlotSummaryHeight .poster img') !=  null) {
        obj = $('.minPosterWithPlotSummaryHeight .poster img')[0];

        if (typeof(obj) != 'undefined') {
            hash = obj['attribs']['src'].split('images')[3].split('._V1')[0].slice(3);
            path = 'http://www.imdb.com'+$('.minPosterWithPlotSummaryHeight .poster a')[0]['attribs']['href'];
            if (hash.indexOf('@')!= -1) 
                hash = hash.split('@')[0];
        }  

    } else {
        obj = $('.poster img')[0];

        if (typeof(obj) != 'undefined') {
            hash = obj['attribs']['src'].split('images')[3].split('._V1')[0].slice(3);
            path = 'http://www.imdb.com'+$('.minPosterWithPlotSummaryHeight .poster a')[0]['attribs']['href'];
            if (hash.indexOf('@')!= -1) 
                hash = hash.split('@')[0];
        }  
    }

    return model = {
      title: title,
      url: path,
      description: description,
      hash: hash
    };
};

module.exports = upComingPosterDescriptionScraper;

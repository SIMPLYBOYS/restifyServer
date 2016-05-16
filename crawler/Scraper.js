var http = require('http');
var cheerio = require('cheerio');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var STATUS_CODES = http.STATUS_CODES;
/*
 * Scraper Constructor
**/
function Scraper (url) {
    this.url = url;
    this.init();
}
/*
 * Make it an EventEmitter
**/
util.inherits(Scraper, EventEmitter);

/*
 * Initialize scraping
**/
Scraper.prototype.init = function () {
    var model;
    var self = this;
    self.on('loaded', function (html) {
        model = self.parsePage(html);
        self.emit('complete', model);
    });
    self.loadWebPage();
};

Scraper.prototype.loadWebPage = function () {
  var self = this;
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
Scraper.prototype.parsePage = function (html) {
  var $ = cheerio.load(html);
  var length = $('.list_item').length;
  var groups = [];
  var movies = [];

  $('.li_group a').each(function(index, item){
   console.log($(this).text());
   groups.push({ 'month': $(this).text()});
  });

  $('.list_item').each(function(index, item){
    console.log($(this).find('h4 a').text());
    var bar = $(this).find('h4 a').attr('href').split('/');
    bar[3] = 'mediaindex' + bar[3];

    movies.push({
      title: $(this).find('h4 a').text().trim().split('(')[0],
      detailUrl: 'http://www.imdb.com' + $(this).find('h4 a').attr('href'),
      galleryUrl: 'http://www.imdb.com' + bar.join('/'),
      idIMDB: $(this).find('h4 a').attr('href').split('/')[2]
    })   
  });

  var model = {
  	length: length,
  	groups: groups,
  	movies: movies
  }
  return model;
};

module.exports = Scraper;

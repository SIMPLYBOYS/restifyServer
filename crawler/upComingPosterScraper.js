var http = require('http');
var cheerio = require('cheerio');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var STATUS_CODES = http.STATUS_CODES;
/*
 * Scraper Constructor
**/
function upComingPosterScraper (obj) {
    this.url = obj.url;
    this.hash = obj.hash;
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
    self.on('loaded', function (json) {
        model = self.parseJSON(json);
        self.emit('complete', model);
    });
    self.loadWebPage();
};

upComingPosterScraper.prototype.loadWebPage = function () {
  var self = this;
  // console.log('\n\nLoading ' + website);
  console.log('loading ' + self.url);
  var foo = self.url;
  var bar = foo.split('title')[1];
  foo = foo.split('title')[0] + '_json/title' + bar.split('mediaviewer')[0] + 'mediaviewer';
  // foo = foo.split('?')[0] + '/tr?' + foo.split('?')[1]; //tricky part since 2016/6/5
  http.get(foo, function (res) {
    var body = '';
    if(res.statusCode !== 200) {
      return self.emit('error', STATUS_CODES[res.statusCode]);
    }
    res.on('data', function (chunk) {
      body += chunk;
    });
    res.on('end', function () {
      // console.log(JSON.parse(body)['allImages']);
      var json = JSON.parse(body)['allImages'];
      self.emit('loaded', json);
    });
  })
  .on('error', function (err) {
    self.emit('error', err);
  });      
};

/*
 * Parse html and return an object
**/
upComingPosterScraper.prototype.parseJSON = function (json) {
    var that = this;
    var url;
    var title;
    json.forEach(function(item, index){
      // console.log(item);
      // console.log(item['src'].indexOf(that.hash));
      if (item['src'].indexOf(that.hash) != -1) {
        url = item['src'];
        title = item['relatedTitles'][0]['displayName']
      }
    });

    return model = {
      title: title,
      url: url
    }
};

module.exports = upComingPosterScraper;

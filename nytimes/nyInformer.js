var http = require('http');
var cheerio = require('cheerio');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var request = require("request");
var request = request.defaults({jar: true});
var mongojs = require('mongojs');
var config = require('../config');
var dbJapan = config.dbJapan;
var STATUS_CODES = http.STATUS_CODES;
/*
 * Scraper Constructor
**/
function nyInformer (url) {
    this.url = url;
    this.init();
}
/*
 * Make it an EventEmitter
**/
util.inherits(nyInformer, EventEmitter);

/*
 * Initialize scraping
**/
nyInformer.prototype.init = function () {
    var self = this;
    console.log('init nyInformer! ');
    self.on('loaded', function (body) {
        console.log('complete: ' + body);
        this.emit('complete', body);
    });
    self.on('redirect', function (url) {
        console.log('redirect url:' + url);
        self.redirectPage(url);
    });
    // self.loadWebPage(self.url);
    self.fetchInfo();
};

nyInformer.prototype.loadWebPage = function (url) {
  var self = this;
  console.log('loadWebPage: ' + url);
  // http.get(self.url, function (res) {
  //   res.on('data', function (chunk) {
  //     console.log(chunk);
  //   });
  // }).on('error', function (err) {
  //   console.error(err);
  // });

  http.get(self.url, function (res) {
    var body = '';

    /*if(res.statusCode !== 200) {
      console.log('error: ');
      console.log(res);
      return self.emit('error', STATUS_CODES[res.statusCode]);
    } */

    console.log('location =====>' + res['headers']['location']);

    if (res.statusCode == 303) {
      console.log('return 303');
      self.emit('redirect', res['headers']['location']);
    }

    if (res.statusCode == 302) {
      self.emit('redirect', res['headers']['location']);
    }

    res.on('data', function (chunk) {
      body += chunk;
    });

    res.on('end', function () {
      var $ = cheerio.load(body);
      // console.log(body);
      // self.emit('loaded', body);
    });

  })
  .on('error', function (err) {
    self.emit('error', err);
  });      
};

nyInformer.prototype.redirectPage = function (url) {
  var self = this;
  console.log('redirectPage: ' + url);

  http.get(url, function (res) {
    var body = '';  

    console.log(res);

    console.log('location ====> '+ res['headers']['location']);

    if (res.statusCode == 303) {
      console.log('return 303');
      self.emit('redirect', res['headers']['location']);
    }

    if (res.statusCode == 302) {
      console.log('return 302');
      self.emit('redirect', res['headers']['location']);
    }

    res.on('data', function (chunk) {
      body += chunk;
    });
    res.on('end', function () {
      var $ = cheerio.load(body);
      console.log(body);
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
nyInformer.prototype.fetchInfo = function () {
    var self = this;
    request({
            url: self.url,
            encoding: 'utf8',
            followRedirect: true,
            maxRedirects:20,
            headers: {
              'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.87 Safari/537.36',
              'Accept' : 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8' 
            },
            method: "GET",
        }, function(err, response, body) {
                if (err || !body) { return; }
                var $ = cheerio.load(body);
                var story = '';
                var editor = '';
                var date = '';
                console.log($('.story-body').length);
                if ($('.story-body').length > 0) {
                  $('.story-body .story-body-text').each(function(index, item){
                      console.log($(item).text());
                      story +=  '\n\n' + $(item).text();
                  })
                  editor = 'By ' + $('.byline-author').text();
                  date = $('.byline-dateline .dateline').text();
                } else {
                  $('#articleBody p').each(function(index, item) {
                      console.log($(item).text());
                      story += $(item).text();
                  })
                  editor = $('.byline').text();
                  date = $('.timestamp').text().split(':')[1].trim();
                }
              
                self.emit('loaded', {
                    story: story,
                    headline: null,
                    image: { src: $('.story-body .image img').attr('data-mediaviewer-src'),
                             description: $('.caption-text').text()},
                    editor: editor,
                    date: date,
                    url: self.url
                });
    });
};

module.exports = nyInformer;

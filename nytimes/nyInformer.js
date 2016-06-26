var http = require('http');
var cheerio = require('cheerio');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var request = require("request");
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
              'Cookie' : 'RMID=007f01012b1b576f77e40006; anchorview=true; __gads=ID=55dc12682325644e:T=1466922985:S=ALNI_MZy5xiYz4cZZT5NuiFgOab0r-m1qA; OX_plg=swf|shk|pm; optimizelyEndUserId=oeu1466922994809r0.8343571956324147; _cb_ls=1; _dyid=9137803847265122290; _dyfs=true; __cfduid=dcc210843c223f73325cbb882f438a7a81466932328; NYT-mab=%7B%221%22%3A%22CTM%22%7D; _cb=DoZ5CJGJ8Ff764v4; _chartbeat2=.1466922995274.1466935977149.1; optimizelySegments=%7B%223315571554%22%3A%22direct%22%2C%223321851195%22%3A%22false%22%2C%223334171090%22%3A%22none%22%2C%223336921036%22%3A%22gc%22%7D; optimizelyBuckets=%7B%225341442317%22%3A%225353881961%22%7D; _dycst=dk.l.c.ws.frv2.; _dy_geo=TW.AS.TW_03.TW_03_Taipei; _dy_df_geo=Taiwan..Taipei; _dy_toffset=-2; krux_segs=; walley=GA1.2.218565183.1466922985; _gat_r2d2=1; _sp_id.75b0=0d0d788c7679e43d.1466922995.4.1466938099.1466932432; _sp_ses.75b0=*; _chartbeat4=t=BR9eGwDsgnfbB6WcLjBQwST9D1vHcf&E=16&EE=16&x=96.36363427501084&c=40.71&y=4445&w=719; _dyus_8765260=53%7C0%7C0%7C16%7C0%7C0.0.1466922996902.1466935979173.12982.0%7C177%7C27%7C5%7C116%7C5%7C0%7C0%7C0%7C0%7C0%7C0%7C5%7C0%7C0%7C0%7C0%7C0%7C5%7C0%7C0%7C0%7C0%7C0; mnet_session_depth=3; NYT-wpAB=0033|0&0036|0&0051|0&0052|5&0064|1&0066|0; nyt-a=d0c10e5a1e654a2d217051c88deee97a; nyt-m=DBB1189597CB8EC4B884C182F1C8372A&e=i.1467331200&t=i.10&v=i.1&l=l.15.453718683.-1.-1.-1.-1.-1.-1.-1.-1.-1.-1.-1.-1.-1.-1&n=i.2&g=i.0&rc=i.0&er=i.1466923002&vr=l.4.1.0.0.0&pr=l.4.9.0.0.0&vp=i.0&gf=l.10.453718683.-1.-1.-1.-1.-1.-1.-1.-1.-1&ft=i.0&fv=i.0&gl=l.2.-1.-1&rl=l.1.-1&cav=i.1&imu=i.1&igu=i.1&prt=i.5&kid=i.1&ica=i.1&iue=i.0&ier=i.0&iub=i.0&ifv=i.0&igd=i.0&iga=i.1&imv=i.0&igf=i.1&iru=i.0&ird=i.0&ira=i.1&iir=i.1&abn=s.close_door_90_10_jun2016&abv=i.1; adxcs=s*3eb69=0:1; NYT-S=0MvJ6DGui8btPDXrmvxADeHFcWfhIbFN1PdeFz9JchiAI32QSUxrnkuIV.Ynx4rkFI',
              'Accept' : 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8' 
            },
            method: "GET",
        }, function(err, response, body) {
                if (err || !body) { return; }
                var $ = cheerio.load(body);
                // foo['contents'].push($('.headline').text());$('.headline').find('.title').text()
                var story = '';
                $('.story-body .story-body-text').each(function(index, item){
                    console.log($(item).text());
                    story += $(item).text();
                })
                // console.log($('.story-body .story-body-text').length);
                self.emit('loaded', {
                    story: story,
                    headline: null,
                    image: { src: $('.story-body .image img').attr('data-mediaviewer-src'),
                             description: $('.caption-text').text()}
                });
    });
};

module.exports = nyInformer;

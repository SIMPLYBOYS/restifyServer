var http = require('http');
var cheerio = require('cheerio');
var util = require('util');
var config = require('../config');
var request = require("request");
var mongojs = require('mongojs');
var EventEmitter = require('events').EventEmitter;
var usCastAvatarScraper = require('../crawler/usCastAvatarScraper');
var dbIMDB = config.dbIMDB;
var dbRecord = config.dbRecord;
var dbReview = config.dbReview;
var async = require('async');
var STATUS_CODES = http.STATUS_CODES;
/*
 * Scraper Constructor
**/
function Updater (title, position, type, value) {

    this.infoTitle = title;

    if (title.indexOf(',') != -1) {
        title = title.split('(')[0];
        title = title.split(',')[1].trim()+" "+title.split(',')[0]
    }

    this.title = title;
    this.position = position;
    this.type = type;

    switch (type) {
      case 'record':
        this.record = value; 
        break;
      case 'delta':
        this.delta = value;
    }

    this.init();
}
/*
 * Make it an EventEmitter
**/
util.inherits(Updater, EventEmitter);

/*
 * Initialize scraping
**/
Updater.prototype.init = function () {
    console.log('init Updater');
    this.on('updated', function (title) {
        console.log('\n====> \"'+title + '\" got updated!!!');
        this.emit('complete', title);
    });

    this.on('infoTitle', function(title) {
        this.updateMovie_InfoTitle();
    });

    this.on('data not founded', function(title) {
      console.log('\n====> \"'+title + '\" not updated!!!');
      this.emit('complete', title);
    })
    
    switch(this.type) {
      case 'record': 
        this.updateRecord();
        break;
      case 'delta':
        this.updateMovie();
        break;
      case 'cast':
        this.updateCastReview();
        break;
      case 'vote':
        this.updateVote();
    } 
};

Updater.prototype.updateCastReview = function () {
  var CastPages = [];
  var avatarUrl = [];
  var ReviewPages = [];
  var castItem = {};
  var Cast = [];
  var that = this;
  async.series([
      function(callback) {
          console.log('preparePages ----> ' + that['title']);
          dbIMDB.imdb.findOne({title: that['title']}, function(err, doc) {
            console.log('detail: '+ doc['detailUrl']);
            request({
              url: doc['detailUrl'],
              encoding: "utf8",
              method: "GET"}, function(err, res, body) {
                  if (err || !body) 
                      return;

                  var $ = cheerio.load(body);
                  var url = $('.slate_wrapper .poster a img')[0];
                  var foo = $('.minPosterWithPlotSummaryHeight .poster img')[0];

                  castItem['castUrl'] = doc['detailUrl'].split('?')[0]+'fullcredits?ref_=tt_cl_sm#cast';
                  castItem['title'] = doc['title'];

                  $('.titleReviewBarItem .subText a').each(function(index, item) {
                    if ($(item).attr('href') == 'reviews?ref_=tt_ov_rt') {
                      ReviewPages.push({
                          reviewUrl: doc['detailUrl'].split('?')[0]+$(item).attr('href'),
                          title: doc['title'],
                          votes: parseInt($(item).text().split('user')[0].trim().replace(',',''))
                      });
                    }
                  });
                  
                  callback(null);
            });
          });
      },
      function(callback) {
        request({
              url: castItem['castUrl'], 
              encoding: "utf8",
              method: "GET"
        }, function(err, response, body) {
              var $ = cheerio.load(body);
              console.log('insertCast ----> ' + that['title']);
              $('.cast_list tr').each(function(index, item) {
                  if (index > 0) {
                      var name = $(item).find('.itemprop span').text();
                      var link = 'http://www.imdb.com'+$(item).find('.primary_photo a').attr('href');
                      avatarUrl.push({
                          link: link,
                          cast: name,
                          title: castItem['title']
                      });
                      if (typeof($(item).find('.character a')[0])!='undefined')
                          var as = $(item).find('.character a').text().trim();
                      Cast.push({
                          cast: name,
                          as: as,
                          link: link,
                          avatar: null
                      });
                  }
              });

              dbIMDB.imdb.findOne({title: castItem['title']}, function(err, docs) {
                  if (typeof(docs['cast'])!='undefined') {
                      callback(null);
                  } else {
                      dbIMDB.imdb.update({title: castItem['title']}, {$set: {
                          cast: Cast
                      }}, function(){
                          callback(null);
                      });
                  }
              });
        });
      },
      function(callback) { 
        if (!avatarUrl.length) {
            callback(null);
            return console.log('!!!!');
        }
        console.log('insertCastAvatar ----> ' + that['title']);
        var limit = avatarUrl.length;
        var count = 0;
        var avatar;
        async.whilst(
            function () { console.log('count: ' + count + ' limit: ' + limit); return count < limit; },
            function (done) {
              avatar = avatarUrl.pop();
              console.log('avatarPages left: ' + avatarUrl.length);
              var scraper = new usCastAvatarScraper(avatar);
              scraper.on('error', function (error) {
                console.log(error);
                console.log('got error when avatarPages left: ' + avatarUrl.length);
                count++;
                done(null);
              });
              scraper.on('complete', function (listing) {
                  var title = listing['title'];
                  console.log(listing['picturesUrl']);
                  dbIMDB.imdb.findAndModify({
                      query: { 'title': title , 'cast.cast': listing['cast']},
                      update: { $set: { 'cast.$.avatar': listing['picturesUrl']} },
                      new: true
                  }, function (err, doc, lastErrorObject) {
                      if (doc) {
                          count++;
                          done(null);
                      } else {
                          console.log(listing['title'] + 'not found!');
                          var title = listing['title'].split('�');
                          var foo;
                          title.forEach(function(item, index){
                              if (item.length > 0)
                                  foo = item;
                          });
                          var query = {'originTitle': new RegExp(foo, 'i') };
                          console.log(query);
                          dbIMDB.imdb.findAndModify({
                              query: { 'title': title , 'cast.cast': listing['cast']},
                              update: { $set: { 'cast.$.avatar': listing['picturesUrl']} },
                              new: true
                          }, function (err, doc, lastErrorObject) {
                              console.log(doc);
                              count++;
                              done(null);
                          });
                      }           
                  });
              });
            },
            function (err, n) {
                callback(null);
            }
        );
      },
      function(callback) {
        console.log('insertReview -------->');
        var innerCount = 0,
            reviewer = [],
            name,
            avatar,
            topic,
            text = [],
            point = null,
            date,
            url;
            review = ReviewPages.pop();
            async.whilst(
                function () { console.log('innerCount: ' + innerCount); return innerCount < parseInt(review['votes']); },
                function (innercallback) {  
                    url = review['reviewUrl'].split('reviews?')[0]+'reviews?start='+innerCount;
                    console.log('reviewUrl: '+ url);
                    request({
                        url: url,   
                        encoding: "utf8",
                        method: "GET"
                    }, function(err, response, body) {
                        var $ = cheerio.load(body);
                        $('#tn15content div').each(function(index, item) { 

                            if (index%2 ==0) {
                                topic = $(item).find('h2').text().trim();
                                avatar = $(item).find('img')[0]['attribs']['src'];
                                name = typeof($(item).find('a')[1]) != 'undefined' ? ['children'][0]['data'] : null;

                                if (typeof($(item).find('img')[1])!='undefined')
                                    point = parseInt($(item).find('img')[1]['attribs']['alt'].split('/')[0]);
                                if ($(item).find('small').length == 2)
                                    date = $(item).find('small')[1]['children'][0]['data'];
                                else if ($(item).find('small').length == 3)
                                    date = $(item).find('small')[2]['children'][0]['data'];

                                reviewer.push({
                                    name: name,
                                    avatar: avatar,
                                    topic: topic,
                                    text: null,
                                    point: point,
                                    date: date
                                });
                            }
                        });

                        console.log(reviewer);
                         
                        $('#tn15content p').each(function(index, item) {
                            if($(item).text().indexOf('***') !=0 && $(item).text() !='Add another review')
                                text.push($(item).text().trim().replace(/\n/g,''));
                        });

                        // console.log(text);
                        innerCount+=10;
                        innercallback(null, innerCount);  
                    });
                },
                function (err, n) {
                    console.log(review['title'] + '-------->');

                    text.forEach(function(item, index) {
                        reviewer[index]['text'] = item
                    });

                    dbIMDB.imdb.findOne({title: review['title']}, function(err, doc) {
                        if (doc) {
                            dbReview.reviews.insert({
                                'title': doc['title']
                            }, function() {
                                dbReview.reviews.update({'title': doc['title']}, {$set: {review: reviewer}}, function() {
                                    callback(null);
                                });
                            });
                        } else {
                            console.log(that.title + ' not found!');
                            callback(null);
                        }
                    });               
                }
            );
      }
  ],
  function(err, results) {
      that.emit('updated', that.title);  
      console.log('updateCastReview finished!');
  });
};

Updater.prototype.updateVote = function () {
  var that = this;
  console.log('updateVote ----> ' + that['title']);
  dbIMDB.imdb.findOne({title: that['title']}, function(err, doc) {
    console.log('detail: '+ doc['detailUrl']);
    request({
      url: doc['detailUrl'],
      encoding: "utf8",
      method: "GET"}, function(err, res, body) {
          if (err || !body) 
              return;

          var $ = cheerio.load(body);
          var votes;
          var rating;

          rating = parseFloat($('.imdbRating .ratingValue strong span').text());
          votes = parseInt($('.imdbRating a').text());
          dbIMDB.imdb.update({'title': that['title']}, {'$set': {
              rating: {
                  score: rating,
                  votes: votes
              }
          }}, function() {
              console.log(that['title']+' updated!');
              that.emit('updated', that.title);
          });
    });
  });
};

Updater.prototype.updateMovie_InfoTitle = function () {
    var that = this;
    
    dbIMDB.imdb.findOne({title: that['infoTitle']}, function(err, doc) {
        if (!doc) {
          console.log('\n\n' + that['infoTitle'] + ' not found!');
          that.emit('data not founded', that['infoTitle']);
          return;     
        }

        dbIMDB.imdb.update({'title': that['infoTitle']}, {'$set': {'top': parseInt(that['position'])}}, function() {
          dbIMDB.imdb.update({'title': doc['title']}, {'$set': {'delta': that['delta']}}, function() {
            that.emit('updated', that['infoTitle']);
          });
        });

    });
};

Updater.prototype.updateMovie = function () {
  
  var that = this;

  dbIMDB.imdb.findOne({'title': that['title']}, function(err, doc) {

      if (!doc) {
        console.log('\n\n' + that['title'] + ' not found!');
        that.emit('data not founded', that.title);
        return;     
      }

      if (!specialCase(doc['title'])) {
        dbIMDB.imdb.update({'title': that['title']}, {'$set': {'top': parseInt(that['position'])}}, function() {
          dbIMDB.imdb.update({'title': doc['title']}, {'$set': {'delta': that['delta']}}, function() {
            that.emit('updated', that.title);
          });
        });
      } else if (doc['title'] == 'Ben-Hur') {
        dbIMDB.imdb.update({ _id: mongojs.ObjectId('5734d89f39c619427064d312')}, {'$set': {'top': parseInt(that['position'])}},
           function() {
              dbIMDB.imdb.update({_id: mongojs.ObjectId('5734d89f39c619427064d312')}, {'$set': {'delta': that['delta']}}, function() {
                that.emit('updated', that.title);
              });
        });
      } else if (doc['title'] == 'Sunrise') {
        dbIMDB.imdb.update({ _id: mongojs.ObjectId('5705057233c8ea8e13b6244a')}, {'$set': {'top': parseInt(that['position'])}},
           function() {
              dbIMDB.imdb.update({_id: mongojs.ObjectId('5705057233c8ea8e13b6244a')}, {'$set': {'delta': that['delta']}}, function() {
                that.emit('updated', that.title);
              });
        });
      }

  });
};

Updater.prototype.updateRecord = function () {
  
  var that = this;

  dbIMDB.imdb.findOne({'title': that['title']}, function(err, doc) {
      if (!doc) {
        console.log('\n\n' + that['title'] + ' not found!');
        return;     
      } else {
        Url = "http://top250.info/movie/?" + doc['idIMDB'].slice(2)+'/full';
        request({
            url: Url,
            encoding: "utf8",
            method: "GET"
        }, function(err, response, body) {
             if (err || !body) { return; }
               var $ = cheerio.load(body);
               var movieRight = {},
                   token,
                   year,
                   month,
                   date,
                   position,
                   rating,
                   votes,
                   cast = [];

               movieRight = $('.movie_right');
               //fetch record
               var collecton = $(movieRight).find('table').find('tr');
                
               var records = [];

               for (i=0; i< collecton.length; i++) {
                   token = $(collecton[i]).find('td').text();
                    
                   if (!token.replace(/\s/g, '').length) {
                       console.log('got space string');
                       continue;
                   } else {
                       /*console.log(token.lastIndexOf('.') - findposition(token))
                       console.log(token);*/
                       year = token.substring(0,4);
                       month = token.substring(5,7);
                       date = token.substring(8,10);
                       position = token.substring(10, findposition(token));
                       rating = token.substring(token.lastIndexOf('.')-1,token.lastIndexOf('.')+2);
                       votes = token.substring(token.lastIndexOf('.')+2,token.length);
                       records.push({
                           'position': position, 
                           'year': year,
                           'month': month,
                           'date': date,
                           'rating': rating,
                           'votes': votes
                       });
                       console.log(year+' ' + month + ' ' + date + ' ' + position + ' ' + rating + ' ' + votes + '\n');
                  }
              }

              dbRecord.records.update({title: that.title}, {'$set': {'records': records}}, function() {
                  console.log('records: ' + records.length);
                  that.emit('updated', that.title);
              });
        });
      }
  })
};

function specialCase(title) {
  switch (title) {
    case 'Ben-Hur':
    case 'Sunrise':
      return true;
    default:
      return false;
  }
  return false;
}

var findposition = function(token) {
    if (token.indexOf('*') == -1) {
        if (token.indexOf('↓') == -1) {
            if (token.indexOf('↑') == -1) {
                return token.lastIndexOf('-');
            }
            else {
                return token.indexOf('↑');
            }
        } else {
            return token.indexOf('↓');
        }
    } else { 
        return token.indexOf('*');
    }
}

module.exports = Updater;

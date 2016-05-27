var http = require('http');
var cheerio = require('cheerio');
var util = require('util');
var config = require('../config');
var request = require("request");
var mongojs = require('mongojs');
var dbIMDB = config.dbIMDB;
var dbRecord = config.dbRecord;
var EventEmitter = require('events').EventEmitter;
var STATUS_CODES = http.STATUS_CODES;
/*
 * Scraper Constructor
**/
function Updater (title, position, type, value) {
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
    this.on('updated', function (title) {
        console.log('\n====> \"'+title + '\" got updated!!!');
        this.emit('complete', title);
    });
    
    switch(this.type) {
      case 'record': 
        this.updateRecord();
        break;
      case 'delta':
        this.updateMovie();
    } 
};

Updater.prototype.updateMovie = function () {
  
  var that = this;

  dbIMDB.imdb.findOne({'title': that['title']}, function(err, doc) {

      if (!doc) {
        console.log('\n\n' + that['title'] + 'not found!');
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

      //TODO add delta field in db.imdb collection
  })
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

              dbRecord.records.update({'title': that.title}, {'$set': {'records': records}}, function() {
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

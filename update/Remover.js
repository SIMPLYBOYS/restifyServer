var http = require('http');
var cheerio = require('cheerio');
var util = require('util');
var config = require('../config');
var dbIMDB = config.dbIMDB;
var EventEmitter = require('events').EventEmitter;
var STATUS_CODES = http.STATUS_CODES;
/*
 * Scraper Constructor
**/
function Remover (title, position) {
    this.title = title;
    this.infoTitle = title;

    if (title.indexOf(',') != -1) {
        title = title.split('(')[0];
        title = title.split(',')[1].trim()+" "+title.split(',')[0]
    }

    this.position = position;
    this.init();
}
/*
 * Make it an EventEmitter
**/
util.inherits(Remover, EventEmitter);

/*
 * Initialize scraping
**/
Remover.prototype.init = function () {
    console.log('init Remover');
    this.on('updated', function (title) {
        console.log('\n====> \"'+title + '\" got updated!!!');
        this.emit('complete', title);
    });

    this.on('infoTitle_special', function(title) {
        this.updateMovie_InfoTitle_special();
    });

    this.on('infoTitle_case1', function(title) {
        this.updateMovie_InfoTitle_case1();
    });

    this.on('infoTitle_case2', function(title) {
        this.updateMovie_InfoTitle_case2();
    });

    this.on('infoTitle_case3', function(title) {
        this.updateMovie_InfoTitle_case3();
    });

    this.on('data not founded', function(title) {
      console.log('\n====> \"'+title + '\" not updated!!!');
      this.emit('complete', title);
    })

    this.updateMovie();
};

Remover.prototype.updateMovie_InfoTitle_special = function () {
    var that = this,
        title = that['infoTitle'];

    console.log('update by infoTitle special ==>');

    dbIMDB.imdb.findOne({Infotitle: title}, function(err, doc) {
        if (!doc) {
          console.log('\n\n' + title + ' not found!');
          that.emit('infoTitle_case1', title);
          return;     
        }
        dbIMDB.imdb.update({title: doc['title']}, {'$unset': {'top': 1}}, function() {
          that.emit('updated', that['infoTitle']);
        });
    });
}

Remover.prototype.updateMovie_InfoTitle_case1 = function () {
  var that = this,
      title = that['infoTitle'];

    console.log('update by infoTitle case1 ==>');

    if (title.indexOf(',') != -1) {
        title = title.split(',')[1].trim()+" "+title.split(',')[0].toLowerCase();
    }

    dbIMDB.imdb.find({title: title}, function(err, doc) {
        if (!doc) {
          console.log('\n\n' + title + ' not found!');
          that.emit('infoTitle_case2', title);
          return;
        }
        dbIMDB.imdb.update({'title': title}, {'$unset': {'top': 1}}, function() {
          that.emit('updated', that['infoTitle']);
        });
    }); 
};

Remover.prototype.updateMovie_InfoTitle_case2 = function () {
    var that = this,
        title = that['infoTitle'];

    console.log('update by infoTitle case2 ==>');

    dbIMDB.imdb.find({title: title}, function(err, doc) {
        if (!doc) {
          console.log('\n\n' + title + ' not found!');
          that.emit('infoTitle_case3', title);
          return;
        }
        dbIMDB.imdb.update({'title': title}, {'$unset': {'top': 1}}, function() {
          that.emit('updated', that['infoTitle']);
        });
    }); 
};

Remover.prototype.updateMovie_InfoTitle_case3 = function () {
    var that = this,
        title = that['infoTitle'],
        selector = {"title": {$regex: "/"+title.split(',')[0]+"/", $options:"i"}},
        query = {title: new RegExp(title.split(',')[0], 'i') };

    console.log('update by infoTitle case3 ==>');

    dbIMDB.imdb.findOne({title: query.title}, function(err, doc) {
        if (!doc) {
          console.log('\n\n' + title + ' not found!');
          that.emit('data not founded', title);
          return;
        }
        dbIMDB.imdb.update({'title': title}, {'$unset': {'top': 1}}, function() {
          that.emit('updated', that['infoTitle']);
        });
    });
};


/*
 * Parse html and return an object
**/
Remover.prototype.updateMovie = function () {
  
  var that = this;

  dbIMDB.imdb.findOne({'title': that['title']}, function(err, doc) {

      if (!doc) {
        console.log('\n\n' + that['title'] + ' not found!');
        that.emit('infoTitle_special', that.title);
        return;     
      }

      dbIMDB.imdb.update({'title': that['title']}, {'$unset': {'top': 1}}, function() {
        that.emit('updated', that.title);
      });
  })
};

module.exports = Remover;

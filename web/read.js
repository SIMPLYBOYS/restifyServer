'use strict';

var config = require('../config');
var url = require('url');
var cacheAccess = require('../memory_cache/redis');
/*var redisClient = require('redis').createClient;
var redis = redisClient(6379, 'localhost');*/
var redis = require("redis");
var redisClient = redis.createClient();
var dbIMDB = config.dbIMDB;
var dbUpComing = config.dbUpComing;
var dbPosition = config.dbPosition;
var dbToday = config.dbToday;
var dbRecord = config.dbRecord;
var dbJapan = config.dbJapan;
var dbKorea = config.dbKorea;
var dbFrance = config.dbFrance;
var dbTaiwan = config.dbTaiwan;
var dbReview = config.dbReview;
var dbGermany = config.dbGermany;
var dbAustralia = config.dbAustralia;
var dbHonKong = config.dbHonKong;
var dbItalia = config.dbItalia;
var dbSpain = config.dbSpain;
var dbThailand = config.dbThailand;
var dbIndia = config.dbIndia;
var dbPoland = config.dbPoland;
var dbChina = config.dbChina;
var dbUK = config.dbUK;
var dbUSA = config.dbUSA;
var dbUser = config.dbUser;
var dbPtt = config.dbPtt;
var myapiToken = config.myapiToken;
var Updater = require('../update/Updater');
var nyInformer = require('../nytimes/nyInformer');
var elastic = require('../search/elasticsearch');
var google = require('google');
var request = require("request");
var async = require('async');
var moment = require("moment");
var async = require('async');
var OpenCC = require('opencc');
var opencc = new OpenCC('s2tw.json');
var updateMovies = [];

const monthList = [
    {start: '0101', end: '0131'},
    {start: '0201', end: '0228'},
    {start: '0301', end: '0331'},
    {start: '0401', end: '0430'},
    {start: '0501', end: '0531'},
    {start: '0601', end: '0630'},
    {start: '0701', end: '0731'},
    {start: '0801', end: '0831'},
    {start: '0901', end: '0930'},
    {start: '1001', end: '1031'},
    {start: '1101', end: '1130'},
    {start: '1201', end: '1231'},
    {start: '0101', end: '0131'},
    {start: '0201', end: '0228'}
];

const genreList = [
    {type: "Animation"},
    {type: "Action"},
    {type: "Adventure"},
    {type: "Biography"},
    {type: "Comedy"},
    {type: "Crime"},
    {type: "Documentary"},
    {type: "Drama"},
    {type: "Family"},
    {type: "Fantasy"},
    {type: "Film-Noir"},
    {type: "History"},
    {type: "Horror"},
    {type: "Music"},
    {type: "Musical"},
    {type: "Mystery"},
    {type: "Romance"},
    {type: "Sci-Fi"},
    {type: "Sport"},
    {type: "Thriller"},
    {type: "War"},
    {type: "Western"}
];

const client_id = '713961bd892a424f84585a57067750bf'; // Your client id
// const client_secret = '7db9e0e7761a4fd5b2e4653a7229e1b4'; // Your secret
const client_secret = 'fa2ea00c7c8c4660925e8ffb550e2b69';
const redirect_uri = 'worldmovie-login://callback'; // Your redirect uri

exports.read = function (req, res, next) {
    console.log('from: '+ req.query.from +'\n to: ' + req.query.to + '\n title: ' + req.query.title);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8'});
    var foo = {};
    if (typeof(req.query.title)!= 'undefined') {      
        dbIMDB.imdb.find({'title': req.query.title}, function(err, docs) {
                foo['contents'] = docs;
                foo['byTitle'] = true;
                res.end(JSON.stringify(foo));
        });
    } else if (typeof(req.query.to)!= 'undefined' && typeof(req.query.from)!= 'undefined') { 
        dbIMDB.imdb.find({'top': {$lte:parseInt(req.query.to), $gte: parseInt(req.query.from)}}).sort({'top':parseInt(req.query.ascending)}, function(err, docs){
            var foo = {};
            foo['contents'] = docs;
            foo['byTitle'] = false;
            var missing = 0;
            for (var i=0; i<docs.length; i++) {
                if (typeof(docs[i]['cast']) == 'undefined') {
                    missing++;
                    console.log(docs[i]['title'] + '\n' + docs[i]['top']);
                }
            }
            console.log('missing: ' + missing);
            res.end(JSON.stringify(foo));
        });
    } else if (typeof(req.query.release_to)!= 'undefined' && typeof(req.query.release_from)!= 'undefined') { 
        dbIMDB.imdb.find({releaseDate: {$gte: parseInt(req.query.release_from), $lte: parseInt(req.query.release_to)}}).sort({'releaseDate': 1}, function(err, docs){
            var foo = {};
            foo['contents'] = docs;
            foo['byTitle'] = false;
            var bar = [];
            console.log(docs.length);
            for (var i=0; i<docs.length; i++) {
                if (typeof(docs[i]['description']) == 'undefined')
                    bar.push(docs[i]['title']);
            }
            res.end(JSON.stringify(foo));
        });
    } else {
        res.send('like missing query params!');
        res.end();
    }
};

exports.imdb_home = function(req, res, next) {
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8'});
    var foo = {};
    dbIMDB.imdb.find({'top': {$lte:parseInt(req.query.to), $gte: parseInt(req.query.from)}}).limit(10, function(err, docs) {
        var foo = {},
            movies = [];
        for (var i=0; i<docs.length; i++) {
            movies.push({ 
              'title' : docs[i]['title'],
              'detailUrl': docs[i]['detailUrl'],
              'posterUrl': docs[i]['posterUrl']
            });
        }
        foo['contents'] = movies;
        res.end(JSON.stringify(foo));
    });
}

exports.ptt_movies = function(req, res, next) {
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8'});
    var foo = {};
    dbPtt.ptt.find({}).sort({'date': -1, '_id': -1}).skip(parseInt(req.query.skip)).limit(10, function(err, docs) {
        var foo = {};
        foo['contents'] = docs;
        res.end(JSON.stringify(foo));
    });
}

exports.ptt_home = function(req, res, next) {
  var foo = {'contents': []};
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8'});
  cacheAccess.getPttHome(redisClient, function(movies) {
    console.log('ptt_home =========> ');
    if (!movies) {
        console.log("no movies");
        res.end("waiting for a while!");
    } else {
      console.log(movies)
      var bar = movies.split(',')
      console.log(bar.length);
      bar.forEach(function(item, index) {
        foo['contents'].push(opencc.convertSync(item));
      });
      res.end(JSON.stringify(foo));
    } 
  });
};

exports.upcoming = function(req, res, next) {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8'});
    var foo = {};
    dbIMDB.imdb.find({releaseDate: {$gte: parseInt(req.query.release_from)}}).sort({'releaseDate': 1}).skip(parseInt(req.query.skip)).limit(10, function(err, docs){
        var foo = {};
        foo['contents'] = docs;
        foo['byTitle'] = false;
        var bar = [];
        console.log(docs.length);
        for (var i=0; i<docs.length; i++) {
            if (typeof(docs[i]['description']) == 'undefined')
                bar.push(docs[i]['title']);
        }
        res.end(JSON.stringify(foo));
    });
};

exports.world = function (req, res, next) {
    var country = req.params.country,
        foo = {};

    res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});

    switch (parseInt(country)) {
       case 1:
           dbAustralia.australia.find({'title': req.query.title}, function(err, docs) {
             foo['contents'] = docs;
             res.end(JSON.stringify(foo));
           });
          break;
       case 2:
           dbChina.china.find({'title': req.query.title}, function(err, docs) {
             foo['contents'] = docs;
             res.end(JSON.stringify(foo));
           });
          break;
       case 3:
           dbFrance.france.find({'title': req.query.title}, function(err, docs) {
             foo['contents'] = docs;
             res.end(JSON.stringify(foo));
           });
          break;
       case 4:
          dbGermany.germany.find({'title': req.query.title}, function(err, docs) {
            foo['contents'] = docs;
            res.end(JSON.stringify(foo));
          });
          break;
       case 5:
          dbHonKong.honkong.find({'title': req.query.title}, function(err, docs) {
            foo['contents'] = docs;
            res.end(JSON.stringify(foo));
          });
          break;
       case 6:
          dbIndia.india.find({'title': req.query.title}, function(err, docs) {
            foo['contents'] = docs;
            res.end(JSON.stringify(foo));
          });
          break;
       case 7:
          dbItalia.italia.find({'title': req.query.title}, function(err, docs) {
            foo['contents'] = docs;
            res.end(JSON.stringify(foo));
          });
          break;
       case 8:
          dbJapan.japan.find({'title': req.query.title}, function(err, docs) {
            foo['contents'] = docs;
            res.end(JSON.stringify(foo));
          });
          break;
       case 9:
          dbKorea.korea.find({'title': req.query.title}, function(err, docs) {
            foo['contents'] = docs;
            res.end(JSON.stringify(foo));
          });
          break;
       case 10:
          dbPoland.poland.find({'title': req.query.title}, function(err, docs) {
            foo['contents'] = docs;
            res.end(JSON.stringify(foo));
          });
          break;
       case 11:
          dbSpain.spain.find({'title': req.query.title}, function(err, docs) {
            foo['contents'] = docs;
            res.end(JSON.stringify(foo));
          });
          break;
       case 12: 
          dbTaiwan.taiwan.find({'title': req.query.title}, function(err, docs) {
            foo['contents'] = docs;
            res.end(JSON.stringify(foo));
          });
          break;
       case 13:
          dbThailand.thailand.find({'title': req.query.title}, function(err, docs) {
            foo['contents'] = docs;
            res.end(JSON.stringify(foo));
          });
          break;
       case 15:
          dbUK.uk.find({'title': req.query.title}, function(err, docs){
            foo['contents'] = docs;
            res.end(JSON.stringify(foo));
          });
          break;
       default:
          dbIMDB.imdb.find({'title': req.query.title}, function(err, docs) {
            foo['contents'] = docs;
            res.end(JSON.stringify(foo));
          });
          break;
    }
};

exports.worldReview = function(req, res) {
    var country = req.params.country,
        foo = {},
        start = parseInt(req.query.start),
        end = start + 10;

    res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});

    switch (parseInt(country)) {
       case 1:
        dbAustralia.australia.find({title: req.query.title}, {review:1, title:1}).sort({'top': parseInt(req.query.ascending)},
          function(err, doc) {
            foo['title'] = doc[0]['title'];
            foo['review'] = doc[0]['review'].slice(start,end);
            foo['byTitle'] = false;
            foo['size'] = doc[0]['review'].length;
            res.end(JSON.stringify(foo));
        });
        break;
       case 2:
        dbChina.china.find({title: req.query.title}, {review:1, title:1}).sort({'top': parseInt(req.query.ascending)},
          function(err, doc) {
            foo['title'] = doc[0]['title'];
            foo['review'] = doc[0]['review'].slice(start,end);
            foo['byTitle'] = false;
            foo['size'] = doc[0]['review'].length;
            res.end(JSON.stringify(foo));
        });
        break;
       case 3:
        dbFrance.france.find({title: req.query.title}, {review:1, title:1}).sort({'top': parseInt(req.query.ascending)},
          function(err, doc) {
            foo['title'] = doc[0]['title'];
            foo['review'] = doc[0]['review'].slice(start,end);
            foo['byTitle'] = false;
            foo['size'] = doc[0]['review'].length;
            res.end(JSON.stringify(foo));
        });
        break;
       case 4:
        dbGermany.germany.find({title: req.query.title}, {review:1, title:1}).sort({'top': parseInt(req.query.ascending)},
          function(err, doc) {
            foo['title'] = doc[0]['title'];
            foo['review'] = doc[0]['review'].slice(start,end);
            foo['byTitle'] = false;
            foo['size'] = doc[0]['review'].length;
            res.end(JSON.stringify(foo));
        });
        break;
       case 5:
        dbHonKong.honkong.find({title: req.query.title}, {review:1, title:1}).sort({'top': parseInt(req.query.ascending)},
          function(err, doc) {
            foo['title'] = doc[0]['title'];
            foo['review'] = doc[0]['review'].slice(start,end);
            foo['byTitle'] = false;
            foo['size'] = doc[0]['review'].length;
            res.end(JSON.stringify(foo));
        });
        break;
       case 6:
        dbIndia.india.find({title: req.query.title}, {review:1, title:1}).sort({'top': parseInt(req.query.ascending)},
          function(err, doc) {
            foo['title'] = doc[0]['title'];
            foo['review'] = doc[0]['review'].slice(start,end);
            foo['byTitle'] = false;
            foo['size'] = doc[0]['review'].length;
            res.end(JSON.stringify(foo));
        });
        break;
       case 7:
        dbItalia.italia.find({title: req.query.title}, {review:1, title:1}).sort({'top': parseInt(req.query.ascending)},
          function(err, doc) {
            foo['title'] = doc[0]['title'];
            foo['review'] = doc[0]['review'].slice(start,end);
            foo['byTitle'] = false;
            foo['size'] = doc[0]['review'].length;
            res.end(JSON.stringify(foo));
        });
        break;
       case 8:
        dbJapan.japan.find({title: req.query.title}, {review:1, title:1}).sort({'top': parseInt(req.query.ascending)},
          function(err, doc) {
            foo['title'] = doc[0]['title'];
            foo['review'] = doc[0]['review'].slice(start,end);
            foo['byTitle'] = false;
            foo['size'] = doc[0]['review'].length;
            res.end(JSON.stringify(foo));
        });
        break;
       case 9:
        dbKorea.korea.find({title: req.query.title}, {review:1, title:1}).sort({'top': parseInt(req.query.ascending)},
          function(err, doc) {
            foo['title'] = doc[0]['title'];
            foo['review'] = doc[0]['review'].slice(start,end);
            foo['byTitle'] = false;
            foo['size'] = doc[0]['review'].length;
            res.end(JSON.stringify(foo));
        });
        break;
       case 10:
        dbPoland.poland.find({title: req.query.title}, {review:1, title:1}).sort({'top': parseInt(req.query.ascending)},
          function(err, doc) {
            foo['title'] = doc[0]['title'];
            foo['review'] = doc[0]['review'].slice(start,end);
            foo['byTitle'] = false;
            foo['size'] = doc[0]['review'].length;
            res.end(JSON.stringify(foo));
        });
        break;
       case 11:
        dbSpain.spain.find({title: req.query.title}, {review:1, title:1}).sort({'top': parseInt(req.query.ascending)},
          function(err, doc) {
            foo['title'] = doc[0]['title'];
            foo['review'] = doc[0]['review'].slice(start,end);
            foo['byTitle'] = false;
            foo['size'] = doc[0]['review'].length;
            res.end(JSON.stringify(foo));
        });
        break;
       case 12: 
        dbTaiwan.taiwan.find({title: req.query.title}, {review:1, title:1}).sort({'top': parseInt(req.query.ascending)},
          function(err, doc) {
            foo['title'] = doc[0]['title'];
            foo['review'] = doc[0]['review'].slice(start,end);
            foo['byTitle'] = false;
            foo['size'] = doc[0]['review'].length;
            res.end(JSON.stringify(foo));
        });
        break;
       case 13:
        dbThailand.thailand.find({title: req.query.title}, {review:1, title:1}).sort({'top': parseInt(req.query.ascending)},
          function(err, doc) {
            foo['title'] = doc[0]['title'];
            foo['review'] = doc[0]['review'].slice(start,end);
            foo['byTitle'] = false;
            foo['size'] = doc[0]['review'].length;
            res.end(JSON.stringify(foo));
        });
        break;
       case 15:
        dbUK.uk.find({title: req.query.title}, {review:1, title:1}).sort({'top': parseInt(req.query.ascending)},
          function(err, doc) {
            foo['title'] = doc[0]['title'];
            foo['review'] = doc[0]['review'].slice(start,end);
            foo['byTitle'] = false;
            foo['size'] = doc[0]['review'].length;
            res.end(JSON.stringify(foo));
        });
        break;
       default:
        cacheAccess.findImdbReviewsByTitleCached(dbReview, redisClient, req.query.title, start, end, function(movie) {
            if (!movie) 
                res.status(500).send('Server error');
            else 
                res.end(movie);
        });
        break;
    }
};

exports.access_refresh_token = function(req, res) {
  var code = req.query.code;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'authorization_code',
      redirect_uri: redirect_uri,
      code: code
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token,
        'expires_in': body.expires_in,
        'scope': body.scope,
        'refresh_token': body.refresh_token
      });
    }
  });
};

exports.refresh_token = function(req, res) {
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token,
        'expires_in': body.expires_in
      });
    }
  });
};

exports.getGenre = function(req, res) {
    // console.log('date -------> ' + moment().subtract(10, 'days').calendar());
    var country = req.query.country,
        searchYearStart = req.query.year == "All" ? parseInt("19000101") : parseInt(req.query.year+"0101"),
        searchYearEnd = req.query.year == "All" ? parseInt("20171231") : parseInt(req.query.year+"1231");
    res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'}); 

    switch (parseInt(country)) {
       case 1:
          dbAustralia.australia.find({genre: req.query.type}).sort({releaseDate:-1}).limit(10).skip(req.query.page*10, function(err, docs){
            res.end(JSON.stringify(docs));
          });
          break;
       case 2:
          dbChina.china.find({genre: req.query.type, releaseDate:{$lte: searchYearEnd, $gte: searchYearStart}}).sort({releaseDate:-1}).limit(10).skip(req.query.page*10, function(err, docs){
            res.end(JSON.stringify(docs));
          });
          break;
       case 3:
          dbFrance.france.find({genre: req.query.type}).sort({releaseDate:-1}).limit(10).skip(req.query.page*10, function(err, docs){
            res.end(JSON.stringify(docs));
          });
          break;
       case 4:
          dbGermany.germany.find({genre: req.query.type}).sort({releaseDate:-1}).limit(10).skip(req.query.page*10, function(err, docs){
            res.end(JSON.stringify(docs));
          });
          break;
       case 5:
          dbHonKong.honkong.find({genre: req.query.type, releaseDate:{$lte: searchYearEnd, $gte: searchYearStart}}).sort({releaseDate:-1}).limit(10).skip(req.query.page*10, function(err, docs){
            res.end(JSON.stringify(docs));
          });
          break;
       case 6:
          dbIndia.india.find({genre: req.query.type}).sort({releaseDate:-1}).limit(10).skip(req.query.page*10, function(err, docs){
            res.end(JSON.stringify(docs));
          });
          break;
       case 7:
          dbItalia.italia.find({genre: req.query.type}).sort({releaseDate:-1}).limit(10).skip(req.query.page*10, function(err, docs){
            res.end(JSON.stringify(docs));
          });
          break;
       case 8:
          dbJapan.japan.find({genre: req.query.type, releaseDate:{$lte: searchYearEnd, $gte: searchYearStart}}).sort({releaseDate:-1}).limit(10).skip(req.query.page*10, function(err, docs){
            res.end(JSON.stringify(docs));
          });
          break;
       case 9:
          dbKorea.korea.find({genre: req.query.type, releaseDate:{$lte: searchYearEnd, $gte: searchYearStart}}).sort({releaseDate:-1}).limit(10).skip(req.query.page*10, function(err, docs){
            res.end(JSON.stringify(docs));
          });
          break;
       case 10:
          dbPoland.poland.find({genre: req.query.type}).sort({releaseDate:-1}).limit(10).skip(req.query.page*10, function(err, docs){
            res.end(JSON.stringify(docs));
          });
          break;
       case 11:
          dbSpain.spain.find({genre: req.query.type}).sort({releaseDate:-1}).limit(10).skip(req.query.page*10, function(err, docs){
            res.end(JSON.stringify(docs));
          });
          break;
       case 12: 
          dbTaiwan.taiwan.find({genre: req.query.type, releaseDate:{$lte: searchYearEnd, $gte: searchYearStart}}).sort({releaseDate:-1}).limit(10).skip(req.query.page*10, function(err, docs){
            res.end(JSON.stringify(docs));
          });
          break;
       case 13:
          dbThailand.thailand.find({genre: req.query.type}).sort({releaseDate:-1}).limit(10).skip(req.query.page*10, function(err, docs){
            res.end(JSON.stringify(docs));
          });
          break;
       case 15:
          dbUK.uk.find({genre: req.query.type}).sort({releaseDate:-1}).limit(10).skip(req.query.page*10, function(err, docs){
            res.end(JSON.stringify(docs));
          });
          break;
       default:
          dbIMDB.imdb.find({genre: req.query.type}).sort({releaseDate:-1}).limit(10).skip(req.query.page*10, function(err, docs){
            res.end(JSON.stringify(docs));
          });
          break;
    }
};

exports.getGenreTopic = function(req, res) {
    var count = 0;
    async.whilst(
        function () { return count < genreList.length;},
        function (callback) {
            var random = Math.floor((Math.random() * 500)+1);
            dbIMDB.imdb.find({genre:genreList[count]['type']}).limit(1).skip(random, function(err, doc) {
                genreList[count]['imageUrl'] = doc[0]['posterUrl'];
                count++;
                callback(null, count);      
            });
        },
        function (err, results) {
            console.log('results ===>' + JSON.stringify(genreList));
            res.end(JSON.stringify(genreList));
        }
    );
};

exports.imdbReview = function(req, res) {
    console.log(req.query.title);
    var foo = {};
    var start = parseInt(req.query.start);
    var end = start + 10;
    res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});   
    cacheAccess.findImdbReviewsByTitleCached(dbReview, redisClient, req.query.title, start, end, function(movie) {
        if (!movie) 
            res.status(500).send('Server error');
        else 
            res.end(movie);
    });
};

exports.upComing = function(req, res, next) {
    if (typeof(req.query.month) != 'undefined') {
        dbUpComing.upComing.find({'month': req.params.month}, function(err, docs) {
            for (var i in docs[0]['movies']) {   
                var title = docs[0]['movies'][i]['title'];
                title = title.slice(0, title.length-1);
                dbIMDB.imdb.find({title: title}).forEach(function(err, item) {
                    console.log(item['title']);
                    console.log(item['year']);
                    // console.log(item['readMore']['page']);
                    /*if (item['gallery_thumbnail'].length >0) {
                        for (var j in item['gallery_thumbnail']){
                            if (item['gallery_thumbnail'][j]['url'])
                                console.log(item['gallery_thumbnail'][j]['url']);
                            // upComingGalleryPages.push()
                        }
                        console.log(item['gallery_thumbnail']);
                    }*/
                });
            }
            res.end(JSON.stringify(docs[0]['movies']));
        });
    } else {
        res.send('please insert query month');
        res.end();
    }    
};

exports.upcomingList = function(req, res, next) {
    var count = 1;
    var limit = 13;
    var List = [];
    var foo = {'contents': ''};
    async.whilst(
        function () { return count < limit; },
        function (callback) {
            var year = moment().format('YYYY');
            dbIMDB.imdb.find({releaseDate: {$gte: parseInt(year + monthList[count-1]['start']), 
                $lte: parseInt(year + monthList[count-1]['end'])}}).sort({'releaseDate': 1},
                function(err, doc){
                    if (doc) {
                        List.push(doc.length);
                        count++;
                        callback(null, count);
                    } else {
                        console.log('something wrong with the docs in month: ' + monthList[count-1]['start']);
                        List.push(0);
                        count++;
                        callback(null, count);
                    }
                });         
        },
        function (err, results) {
            console.log('results ===>' + List);
            foo['contents'] = List;
            res.end(JSON.stringify(foo));
        }
    );
};

exports.nyTimes = function(req, res) {
    var foo = {'contents': []};
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8'});
    if (typeof(req.query.url)!= 'undefined') {      
        console.log(req.query.url);

        var informer = new nyInformer(req.query.url);
        informer.on('complete', function(result){
            console.log('complete: ' + result);
            foo['contents'].push(result);
            res.end(JSON.stringify(foo));
        });
    }
};

exports.nyTimes_home = function(req, res) {
    var foo = {'contents': []};
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8'});
    cacheAccess.getNyTimesHome(redisClient, function(movies) {
      console.log('nyTimes_home =========> ');
      if (!movies) {
          console.log("no movies");
          res.end("waiting for a while!");
      } else {
        var bar = JSON.parse(movies);
        console.log(bar.length);
        bar.forEach(function(item, index) {
          foo['contents'].push(item);
        });
        res.end(JSON.stringify(foo));
      } 
    });
};

exports.my_nyTimes = function(req, res) {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8'});
    dbUser.user.findOne({fbId: req.params.fbId}, function(err, doc) {
        if (doc) {
            console.log(doc['name']);
            doc.hasOwnProperty('nyTimes') ? res.end(JSON.stringify(doc['nyTimes'])) : res.end(JSON.stringify([]));
        } else {
            res.end(JSON.stringify({ content: 'user not exisit!'}));
        }
    });
};

exports.my_movies = function(req, res) {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8'});
    dbUser.user.findOne({fbId: req.params.fbId}, function(err, doc) {
        if (doc) {
            console.log(doc['name']);
            doc.hasOwnProperty('movies') ? res.end(JSON.stringify(doc['movies'])) : res.end(JSON.stringify([]));
        } else {
            res.end(JSON.stringify({ content: 'user not exisit!'}));
        }
    });
};

exports.postPages = function(req, res) {
  var postCh = Math.floor(Math.random() * (6-0));
  var foo = {'contents': []};
  switch (parseInt(postCh)) {
       case 0:
          dbJapan.japan.find({top:{$lte:5,$gte:1}},{posterUrl:1}, function(err, docs) {
            foo['contents'] = docs;
            res.end(JSON.stringify(foo));
          });
          break;
       case 1:
          dbUSA.usa.find({top:{$lte:5,$gte:1}},{posterUrl:1}, function(err, docs) {
            foo['contents'] = docs;
            res.end(JSON.stringify(foo));
          });
          break;
       case 2:
          dbTaiwan.taiwan.find({top:{$lte:5,$gte:1}},{posterUrl:1}, function(err, docs) {
            foo['contents'] = docs;
            res.end(JSON.stringify(foo));
          });
          break;
       case 3:
          dbKorea.korea.find({top:{$lte:5,$gte:1}},{posterUrl:1}, function(err, docs) {
            foo['contents'] = docs;
            res.end(JSON.stringify(foo));
          });
          break;
       case 4:
          dbFrance.france.find({top:{$lte:5,$gte:1}},{posterUrl:1}, function(err, docs) {
            foo['contents'] = docs;
            res.end(JSON.stringify(foo));
          });
          break;
       case 5:
          dbChina.china.find({top:{$lte:5,$gte:1}},{posterUrl:1}, function(err, docs) {
            foo['contents'] = docs;
            res.end(JSON.stringify(foo));
          });
          break;
       default:
          dbGermany.germany.find({top:{$lte:5,$gte:1}},{posterUrl:1}, function(err, docs) {
            foo['contents'] = docs;
            res.end(JSON.stringify(foo));
          });
          break;
    }
}

exports.getTitle = function(req, res) {
    var foo = {'contents': []};
    dbIMDB.imdb.find({'top': {$lte:250, $gte: 1}}).sort({'top':1}, function(err, docs){
        for (var i=0; i<docs.length; i++) {
            foo['contents'].push({
                title: docs[i]['title'],
                description: docs[i]['description'],
                posterUrl: docs[i]['posterUrl']
            });
        }
        dbIMDB.imdb.find({releaseDate: {$gte: 20160701, $lte: 20161031}}).sort({'releaseDate': 1}, function(err, docs){
            for (var j=0; j<docs.length; j++) {
                foo['contents'].push({
                    title: docs[j].hasOwnProperty('title') ? docs[j]['title'] : '',
                    description: docs[j].hasOwnProperty('description') ? docs[j]['description']: '',
                    posterUrl: docs[j].hasOwnProperty('posterUrl') ? docs[j]['posterUrl'] : ''
                });
            }
            res.end(JSON.stringify(foo));
        });
    });
};

exports.getPosition = function(req, res) {
    if (!req.query.date)
        res.end('missing date');
     dbPosition.position.find({date: req.query.date}, function(err, docs) {
        if (docs.length == 0)
            res.end('no item found!');
        res.end(JSON.stringify(docs));
     });
}

exports.krTrends = function(req, res) {
    console.log('krTrends');
    var foo = {};
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8'});
    if (typeof(req.query.title)!= 'undefined') {      
        dbKorea.korea.find({'title': req.query.title}, {review:0}, function(err, docs) {
                foo['contents'] = docs;
                foo['byTitle'] = true;
                res.end(JSON.stringify(foo));
        });
    } else {
        dbKorea.korea.find({'top': {$lte:20, $gte: 1}}, {review:0}).sort({'top': parseInt(req.query.ascending)},
         function(err, docs) {
            console.log(docs)
            foo['contents'] = docs;
            foo['byTitle'] = false;
            res.end(JSON.stringify(foo));
        });
    }
};

exports.krTrendsReview = function(req, res) {
    console.log(req.query.title);
    var foo = {};
    var start = parseInt(req.query.start);
    var end = start + 10;
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8'});   
    dbKorea.korea.find({title: req.query.title}, {review:1, title:1}).sort({'top': parseInt(req.query.ascending)},
      function(err, doc) {
        // console.log(doc[0]['review']);
        foo['title'] = doc[0]['title'];
        foo['review'] = doc[0]['review'].slice(start,end);
        foo['byTitle'] = false;
        foo['size'] = doc[0]['review'].length;
        res.end(JSON.stringify(foo));
    });
}

exports.usTrends = function(req, res) {
    console.log('dbUSA');
    var foo = {};
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8'});
    if (typeof(req.query.title)!= 'undefined') {      
        dbUSA.usa.find({'title': req.query.title}, {review:0}, function(err, docs) {
                foo['contents'] = docs;
                foo['byTitle'] = true;
                res.end(JSON.stringify(foo));
        });
    } else {
        dbUSA.usa.find({'top': {$lte:10, $gte: 1}}, {review:0}).sort({'top': parseInt(req.query.ascending)},
         function(err, docs) {
            console.log(docs);
            foo['contents'] = docs;
            foo['byTitle'] = false;
            res.end(JSON.stringify(foo));
        });
    }
};

exports.usTrendsReview = function(req, res) {
    console.log(req.query.title);
    var foo = {};
    var start = parseInt(req.query.start);
    var end = start + 10;
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8'});   
    dbUSA.usa.find({title: req.query.title}, {review:1, title:1}).sort({'top': parseInt(req.query.ascending)},
      function(err, doc) {
        // console.log(doc[0]['review']);
        foo['title'] = doc[0]['title'];
        foo['review'] = doc[0]['review'].slice(start,end);
        foo['byTitle'] = false;
        foo['size'] = doc[0]['review'].length;
        res.end(JSON.stringify(foo));
    });
};

exports.usTrendsDirector = function(req, res) {
    console.log(req.query.title);
    var foo = {};
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8'});   
    dbIMDB.imdb.find({"staff.staff": req.query.name}, {}, function(err, docs) {
        foo['contents'] = docs;
        foo['byTitle'] = false;
        res.end(JSON.stringify(foo));
    });
};

exports.explorePeople = function(req, res) {
  var bar = {},
      content = [],
      follow = [];
  res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
  dbUser.user.find({fbId: req.params.fbId}, function(err, doc) {

      if (typeof(doc[0]['follow']) != 'undefined') {
        doc[0]['follow'].forEach(function(item, index) {
            follow.push({
              fbId: item['fbId']
            });
        });
      }
      
      dbUser.user.find({}, function(err, docs) {
          docs.forEach(function(item, index) {
              var foo = {}
              foo['name'] = item['name'];
              foo['fbId'] = item['fbId'];
              foo['total'] = 0;
              if (typeof(item['nyTimes']) != 'undefined')
                  foo.total += item['nyTimes'].length;
              if (typeof(item['movies']) != 'undefined')
                  foo.total += item['movies'].length;
              if (follow.length > 0) {
                follow.some(function(person, index, array) {
                  if (person['fbId'] == foo['fbId']) {
                    foo['follow'] = true;
                    return true;
                  } else {
                    foo['follow'] = false;
                  } 
                });
              } else {
                foo['follow'] = false;
              }
              
              content.push(foo);
          });
          console.log(content);
          bar['contents'] = content;
          res.end(JSON.stringify(bar));
      });
  });
};

exports.social = function(req, res) {
  var bar = {},
      content = [],
      person = [],
      type = req.params.type;
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8'});
  dbUser.user.find({fbId: req.params.fbId}, function(err, doc) {

      if (typeof(doc[0][type]) == 'undefined') {
          bar['contents'] = content;
          res.end(JSON.stringify(bar));
          return;
      }

      doc[0][type].forEach(function(item, index) {
          person.push({
            fbId: item['fbId']
          });
      });

      var count = 0;
      async.whilst(
          function() { return count < person.length; },
          function(callback) {
              dbUser.user.find({fbId: person[count]['fbId']}, function(err, docs) {
                var foo = {}
                docs.forEach(function(item, index) {
                  foo.name = item['name'];
                  foo.fbId = item['fbId'];
                  foo.total = 0;
                  if (typeof(item['nyTimes']) != 'undefined')
                      foo.total += item['nyTimes'].length;
                  if (typeof(item['movies']) != 'undefined')
                      foo.total += item['movies'].length;
                  content.push(foo);
                });
                count++;
                callback(null, count);
              });
          },
          function(err, n) {
              console.log('get '+type+' data finish!' + n);
              console.log(content);
              bar['contents'] = content;
              res.end(JSON.stringify(bar));
          }
      );
  });
};

exports.gmTrends = function(req, res) {
    console.log('dbGermany');
    var foo = {};
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8'});
    if (typeof(req.query.title)!= 'undefined') {      
        dbGermany.germany.find({'title': req.query.title}, {review:0}, function(err, docs) {
                foo['contents'] = docs;
                foo['byTitle'] = true;
                res.end(JSON.stringify(foo));
        });
    } else {
        dbGermany.germany.find({'top': {$lte:10, $gte: 1}}, {review:0}).sort({'top': parseInt(req.query.ascending)},
         function(err, docs) {
            console.log(docs);
            foo['contents'] = docs;
            foo['byTitle'] = false;
            res.end(JSON.stringify(foo));
        });
    }
};

exports.gmTrendsReview = function(req, res) {
    console.log(req.query.title);
    var foo = {};
    var start = parseInt(req.query.start);
    var end = start + 10;
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8'});   
    dbGermany.germany.find({title: req.query.title}, {review:1, title:1}).sort({'top': parseInt(req.query.ascending)},
      function(err, doc) {
        // console.log(doc[0]['review']);
        foo['title'] = doc[0]['title'];
        foo['review'] = doc[0]['review'].slice(start,end);
        foo['byTitle'] = false;
        foo['size'] = doc[0]['review'].length;
        res.end(JSON.stringify(foo));
    });
};

exports.twTrends = function(req, res) {
    console.log('dbTaiwan');
    var foo = {};
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8'});
    if (typeof(req.query.title)!= 'undefined') {      
        dbTaiwan.taiwan.find({'title': req.query.title}, {review:0}, function(err, docs) {
                foo['contents'] = docs;
                foo['byTitle'] = true;
                res.end(JSON.stringify(foo));
        });
    } else {
        dbTaiwan.taiwan.find({'top': {$lte:20, $gte: 1}}, {review: 0, detailUrl: 0}).limit(20).sort({'top': parseInt(req.query.ascending)},
         function(err, docs) {
            console.log(docs)
            foo['contents'] = docs;
            foo['byTitle'] = false;
            res.end(JSON.stringify(foo));
        });
    }
};

exports.twTrendsReview = function(req, res) {
    console.log(req.query.title);
    var foo = {};
    var start = parseInt(req.query.start);
    var end = start + 10;
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8'});   
    dbTaiwan.taiwan.find({title: req.query.title}, {review:1, title:1}).sort({'top': parseInt(req.query.ascending)},
      function(err, doc) {
        // console.log(doc[0]['review']);
        foo['title'] = doc[0]['title'];
        foo['review'] = doc[0]['review'].slice(start,end);
        foo['byTitle'] = false;
        foo['size'] = doc[0]['review'].length;
        res.end(JSON.stringify(foo));
    });
};

exports.cnTrends = function(req, res) {
    console.log('dbChina');
    var foo = {};
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8'});
    if (typeof(req.query.title)!= 'undefined') {      
        dbChina.china.find({'trailerTitle': req.query.title}, {review:0}, function(err, docs) {
                foo['contents'] = docs;
                foo['byTitle'] = true;
                res.end(JSON.stringify(foo));
        });
    } else {
        dbChina.china.find({'top': {$lte:10, $gte: 1}}, {review:0}).sort({'top': parseInt(req.query.ascending)},
         function(err, docs) {
            console.log(docs);
            foo['contents'] = docs;
            foo['byTitle'] = false;
            res.end(JSON.stringify(foo));
        });
    }
};

exports.cnTrendsReview = function(req, res) {
    console.log(req.query.title);
    var foo = {};
    var start = parseInt(req.query.start); 
    var end = start + 10;
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8'});   
    dbChina.china.find({trailerTitle: req.query.title}, {review:1, title:1}).sort({'top': parseInt(req.query.ascending)},
      function(err, doc) {
        console.log(doc);
        foo['title'] = doc[0]['title'];
        foo['review'] = doc[0]['review'].slice(start,end);
        foo['byTitle'] = false;
        foo['size'] = doc[0]['review'].length;
        res.end(JSON.stringify(foo));
    });
};

exports.frTrends = function(req, res) {
    console.log('frTrends');
    var foo = {};
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8'});
    if (typeof(req.query.title)!= 'undefined') {      
        dbFrance.france.find({'title': req.query.title}, {review:0}, function(err, docs) {
                foo['contents'] = docs;
                foo['byTitle'] = true;
                res.end(JSON.stringify(foo));
        });
    } else {
        dbFrance.france.find({'top': {$lte:9, $gte: 1}}, {review:0}).sort({'top': parseInt(req.query.ascending)},
         function(err, docs) {
            console.log(docs)
            foo['contents'] = docs;
            foo['byTitle'] = false;
            res.end(JSON.stringify(foo));
        });
    }
};

exports.frTrendsReview = function(req, res) {
    console.log(req.query.title.slice(1, req.query.title.length-1));
    var foo = {};
    var start = parseInt(req.query.start);
    var end = start + 10;
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8'});   
    dbFrance.france.find({title: req.query.title}, {review:1, title:1}).sort({'top': parseInt(req.query.ascending)},
      function(err, doc) {
        // console.log(doc[0]['review']);
        foo['title'] = doc[0]['title'];
        foo['review'] = doc[0]['review'].slice(start,end);
        foo['byTitle'] = false;
        foo['size'] = doc[0]['review'].length;
        res.end(JSON.stringify(foo));
    });
}

exports.jpTrends = function(req, res) {
    var foo = {};
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8'});
    if (typeof(req.query.title)!= 'undefined') {      
        dbJapan.japan.find({'title': req.query.title}, function(err, docs) {
                foo['contents'] = docs;
                foo['byTitle'] = true;
                res.end(JSON.stringify(foo));
        });
    } else {
        dbJapan.japan.find({'top': {$lte:10, $gte: 1}}, {review:0}).sort({'top': parseInt(req.query.ascending)},
         function(err, docs) {
            console.log(docs)
            foo['contents'] = docs;
            foo['byTitle'] = false;
            res.end(JSON.stringify(foo));
            // res.json(data, {'content-type': 'application/json; charset=utf-8'}); // also set charset to utf-8
        });
    }        
};

exports.jpTrendsReview = function(req, res) {
    console.log(req.query.title);
    var foo = {};
    var start = parseInt(req.query.start);
    var end = start + 10;
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8'});   
    dbJapan.japan.find({title: req.query.title}, {review:1, title:1}).sort({'top': parseInt(req.query.ascending)},
      function(err, doc) {
        // console.log(doc[0]['review']);
        foo['title'] = doc[0]['title'];
        foo['review'] = doc[0]['review'].slice(start,end);
        foo['byTitle'] = false;
        foo['size'] = doc[0]['review'].length;
        res.end(JSON.stringify(foo));
    });
}

function updatePositionWizard(done) {
    if (!updateMovies.length) {
        done(null);
        return console.log('Done!!!!');
    }

    var item = updateMovies.pop();
    if (item['title'].indexOf(',') != -1) {
        var bar = item['title'].split(',');
        console.log('\n\n----->' + bar[1] + ' ' + bar[0] + '\n\n');
        item['title'] = bar[1] + ' ' + bar[0];
        if (item['title'].trim().indexOf('aboliques') != -1) {
            item['title'] = 'Les diaboliques';
        }
        var updater = new Updater(item.title.trim(), item.position);
    } else {
        var updater = new Updater(item.title, item.position);
    }

    console.log('Requests Left: ' + updateMovies.length);
    updater.on('error', function (error) {
      console.log(error);
      updatePositionWizard();
    });

    updater.on('complete', function (listing) {
        // console.log(listing);
        console.log(listing + ' got complete!');
        updatePositionWizard();
    });
}

exports.getRecords = function(req, res, next) {
    if (!req.query.title)
        res.end('missing title');
    dbRecord.records.find({'title': req.query.title}, function(err, doc) {
        var object = {};
            object['contents'] = doc;
            
        var bar = JSON.stringify(doc[0]);
        console.log(object['contents']);
        var foo = JSON.parse(bar);
        // console.log(foo['records'].length);
        
        /*if (foo['records'].length > 50) {
            //TODO
        }*/

        res.end(JSON.stringify(object));
    });
};

exports.getToday = function(req, res, next) {
    console.log('getToday ---> '+process.pid);
    dbToday.today.find({'date': moment().format('l')}, function(err, doc) {
        var object = {};
            object['contents'] = doc;
        res.end(JSON.stringify(object));
    });
};

exports.elasticSearch = function(req, res, next) {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8'});
    let scrollId = '';
    let json_res = [];
    let foo = {};

    if (req.params.scrollId == '') {
        elastic.searchDocument(req.params.channel, req.params.input).then(function (result) {
            if (!result.hits.hits.length) {
                console.log('done ---->');
              // console.log('done ----> ' + JSON.stringify(json_res));
              res.end(JSON.stringify(json_res));
              return;
            }

            scrollId = result['_scroll_id'];

            result['hits']['hits'].forEach(function(item, index) {
              if (item['_score'] > 0.9) 
                json_res.push(item);
            });

            // console.log(result.hits.hits.length + ' hits out of ' + result.hits.total);
            foo['search'] = json_res;
            foo['scrollId'] = scrollId;
            foo['total'] = result['hits']['total'];
            res.end(JSON.stringify(foo));
        });
    } else {
      elastic.elasticClient.scroll({
        scroll: '1m',
        scrollId: req.params.scrollId
      }, function(error, response) {
          response['hits']['hits'].forEach(function(hit, index) {
              if (hit['_score'] > 0.9)
                json_res.push(hit);
          });
          foo['search'] = json_res;
          foo['scrollId'] = req.params.scrollId;
          foo['total'] = response['hits']['total'];
          res.end(JSON.stringify(foo));
      });
    } 
};

exports.google = function (req, res, next) {
    google('The Shawshank Redemption trailer', function (err, res){
      if (err) console.error(err)

      for (var i = 0; i < res.links.length; ++i) {
        var link = res.links[i];
        console.log(link.title);
        // console.log(link.href);
        if (link.title.match('YouTube')){
            console.log(link.href);
        }
      }

      if (nextCounter < 4) {
        nextCounter += 1
        if (res.next) res.next()
      }
    });
};

exports.myapi = function(req, res) {
    if (!req.params.title)
        res.end('missing title!');
    request({
        url: "http://api.myapifilms.com/imdb/idIMDB?title="+ req.params.title + "&token=" + myapiToken,
        encoding: 'utf8',
        method: "GET"
    }, function(err, req, json) {
        if(err || !json) { return; }
        var foo = JSON.parse(json),
            bar = foo['data']['movies'];

        console.log(bar[0]['idIMDB']);
        res.end();
    });
};

exports.splash = function(req, res) {
    var random = Math.floor((Math.random() * 7)+1);
    dbIMDB.imdb.find({genre:genreList[count]['type']}).limit(4).skip(random, function(err, docs) {
        console.log(docs);
        var object = {};
        object['content'] = docs;
        res.end(JSON.stringify(object));
    });
}


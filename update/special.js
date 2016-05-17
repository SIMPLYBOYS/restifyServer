var async = require('async');
var request = require("request");
var cheerio = require("cheerio");
var moment = require("moment");
var config = require('../config');
var dbToday = config.dbToday;
var dbIMDB = config.dbIMDB;
var dbPosition = config.dbPosition;
var Obj = {
	date: moment().format('l'),
	sameItem: [],
	upItem: [],
	downItem: []
};

async.series([
  // fetch top 250 record In Out List
  function (done) {
    request({
    	url: 'http://top250.info/charts/?2016/05/17/',
        encoding: "utf8",
        method: "GET"
    }, function(err, response, body) {
    	var $ = cheerio.load(body);
    	Obj.body = body;
    	/*$('.movie_left strong').each(function(index, item){
    			if (index == 2)
    				Obj.InOut = parseInt(item['children'][0]['data']);
    			console.log(item['children'][0]['data']);
    	});*/
	    console.log('job1 finish');
	    done(null);
    });
  },
  //fetch update info into Obj
  function (done) {
    var $ = cheerio.load(Obj.body);

    	$('.row_down').each(function(index, item) {
    			/*console.log("\n\nIn ========>");
          console.log(item['children']['type']);*/
          var foo = $(item).text();
          var bar = foo.split('↓');
          token = bar[1].slice(1);
          // console.log(bar[0] + '\n' + bar[1]);
          Obj['downItem'].push({'position': parseInt(bar[0]), 'title': token.split('(')[0]});
    	});

      $('.row_same').each(function(index, item) {
          /*console.log("\n\nIn ========>");
          console.log(item['children'].length);*/
          var foo = $(item).text();
          var bar = foo.split('-');
          token = bar[1].slice(1);
          // console.log(bar[0] + '\n' + bar[1]);
          Obj['sameItem'].push({'position': parseInt(bar[0]), 'title': token.split('(')[0]});
      });

      $('.row_up').each(function(index, item) {
         /* console.log("\n\nIn ========>");
          console.log(item['children↑'].length);*/
          var foo = $(item).text();
          var bar = foo.split('↑');
          token = bar[1].split('(')[0];
          token = token.trimRight();
          console.log(token.slice(token.length-10, token.length));
          // console.log(bar[0] + '\n' + bar[1]);
          Obj['upItem'].push({'position': parseInt(bar[0]), 'title': token.slice(token.length-10, token.length)});
      });

	    console.log('job2 finish');
	    done(null);
  },
  //update imdb database by update info
  function (done) {
      Obj.body = '';
      // console.log(Obj);
      Obj['upItem'].forEach(function(item, index){
        console.log(item);
        // console.log(index);
        dbIMDB.imdb.find({'title': item['title'].split(',')[0]}, function(err, doc) {
          // console.log(doc);
          /*if (index == Obj['upItem']-1) {
            console.log('job3 finish');
            done(null);
          }*/
        });
      });
      /*for (var i=0; i<Obj['upItem'].length; i++) {
        console.log(Obj['upItem'][i]['title']);
        // dbIMDB.imdb.find({'title': Obj['upItem'][i]['title']}, function(err, docs) {
        //     foo['contents'] = docs;
        //     foo['byTitle'] = true;
        //     console.log(docs);
        // });
      }*/
      done(null);
  }
], function (err) {
  if (err) console.error(err.stack);

  console.log('all finished!!');
  process.exit(0);
});
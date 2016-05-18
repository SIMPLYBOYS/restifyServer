var async = require('async');
var request = require("request");
var cheerio = require("cheerio");
var moment = require("moment");
var config = require('../config');
var dbToday = config.dbToday;
var dbPosition = config.dbPosition;
var Obj = {
	date: moment().format('l'),
	up: 0,
	down: 0,
	newIn: 0,
	newItem: [],
	upItem: [],
	downItem: []
};

var today = {
	date: moment().format('l'),
	inList: [],
	outList: []
};

async.series([
  // fetch top 250 record In Out List
  function (done) {
    request({
    	url: 'http://top250.info/',
        encoding: "utf8",
        method: "GET"
    }, function(err, response, body) {
    	var $ = cheerio.load(body);
    	Obj.body = body;
    	$('.movie_left strong').each(function(index, item){
    			if (index == 2)
    				Obj.InOut = parseInt(item['children'][0]['data']);
    			console.log(item['children'][0]['data']);
    	});
	    console.log('job1 finish');
	    done(null);
    });
  },
  //fetch today notification message
  function (done) {
  	console.log('InOut: ' + Obj.InOut);
    if (typeof(Obj.InOut) == 'undefined') {
        console.log('job2 finish');
        done(null);
    } else {
        var $ = cheerio.load(Obj.body);

        $('.movie_left').each(function(index, item) {
            // console.log($(item).text().split('In'));
            var bar = $(item).text().split('In');
            var token = bar[1].split('Out')
            // console.log(token[0]);
            for (var i = 0; i < Obj.InOut; i++) {
                console.log(token[i].replace(/\t/g, '').trim());
                today['inList'].push({'item': token[i].replace(/\t/g, '').trim()});
            }
            today['outList'].push({'item': token[Obj.InOut].split('Position')[0].replace(/\t/g, '').trim()});
        });
        console.log('job2 finish');
        done(null);
    }
  },
  //fetch update top250 movie title with position
  function (done) {
  	console.log('InOut: ' + Obj.InOut);
    var $ = cheerio.load(Obj.body),
    	i = 0,
    	up = 0,
    	down = 0,
    	newIn = 0;

    	$('.row_up').each(function(index, item) {
    		up++;
    		var foo = $(item).find('td').text();
    		var position = foo.split('↑')[0];
    		var title = foo.split('↑')[1].slice(1);
    		Obj['upItem'].push({'position': position, 'title': title});
    		// console.log(item['parent']['children'].length);
    	});
    	
    	$('.row_down').each(function(index, item) {
    		/*if (index == 0)
    			console.log(item);*/
    		down++;
    		var foo = $(item).find('td').text();
    		var position = foo.split('↓')[0];
    		var title = foo.split('↓')[1].slice(1);
    		Obj['downItem'].push({'position': position, 'title': title});
    		// console.log($(item).find('td').text());
    	});
    	
    	$('.row_new').each(function(index, item) {
    		newIn++;
    		var foo = $(item).find('td').text();
    		var position = foo.split('*')[0];
    		var title = foo.split('*')[1];
    		Obj['newItem'].push({'position': position, 'title': title});
    		// console.log($(item).find('td').text());
    	});
    	Obj.body = '';
    	Obj.newIn = newIn;
    	Obj.up = up;
    	Obj.down = down;
    	console.log(Obj);
        console.log(today);
	    console.log('job3 finish');
	    done(null);
  },
  //store data into mongoDB
  function (done) {
    dbToday.today.find({'date': moment().format('l')}, function(err, docs) {
    	if (docs.length >=1) {
    		dbToday.today.update({'date': moment().format('l')}, {'$set': {'inList': today['inList']}});
    		dbToday.today.update({'date': moment().format('l')}, {'$set': {'outList': today['outList']}});
    	} else {
    		dbToday.today.insert(today);
    	}
    });
    dbPosition.position.find({'date': moment().format('l')}, function(err, docs) {
    	if (docs.length >=1) {
    		dbPosition.position.update({'date': moment().format('l')}, {'$set': {'up': Obj['up']}});
    		dbPosition.position.update({'date': moment().format('l')}, {'$set': {'down': Obj['down']}});
    		dbPosition.position.update({'date': moment().format('l')}, {'$set': {'newIn': Obj['newIn']}});
    		dbPosition.position.update({'date': moment().format('l')}, {'$set': {'newItem': Obj['newItem']}});
    		dbPosition.position.update({'date': moment().format('l')}, {'$set': {'upItem': Obj['upItem']}});
    		dbPosition.position.update({'date': moment().format('l')}, {'$set': {'downItem': Obj['downItem']}});
    	} else {
    		dbPosition.position.insert(Obj);
    	}
    	done(null);
    });
  },
  // update Imdb database by position database
  function (done) {
  	console.log('final step:')
    done(null);
  }
], function (err) {
  if (err) console.error(err.stack);

  console.log('all finished!!');
  process.exit(0);
});
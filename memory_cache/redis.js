var config = require('../config');
var async = require('async');
var request = require("request");
var nyInformer = require('../nytimes/nyInformer');
var moment = require("moment");
var kue = require('kue');
var jobs = kue.createQueue();
var OpenCC = require('opencc');
var opencc = new OpenCC('tw2s.json');
var dbPtt = config.dbPtt;

exports.findImdbReviewsByTitleCached = function (dbReview, redis, title, start, end, callback) {
    console.log('findImdbReviewsByTitle Cached ' + title);
    redis.get(title.split(' ').join('_'), function (err, reply) {
        if (err)
        	callback(null);
        else if (reply) { //Reviews exists in cache
            var obj = JSON.parse(reply);
            obj['review'] = obj['review'].slice(start, end);
            console.log(obj['review'].length);
            callback(JSON.stringify(obj));
        } else {
            //Review doesn't exist in cache - we need to query the main database 
            dbReview.reviews.aggregate([{$match:{title: title}},{$limit:1}], function(err, doc) {
            	var review = JSON.stringify(doc);
                var cacheTitle = title.split(' ').join('_'); 
                var obj = {
                  title: doc[0]['title'],
                  byTitle: false,
                  review: doc[0]['review'],
                  size: doc[0]['review'].length
                };
                
                redis.set(cacheTitle, JSON.stringify(obj), function (err, replies) {
                	console.log('cache done ' + err);
                    if (!err) {
                        obj['review'] = obj['review'].slice(start, end);
                        callback(JSON.stringify(obj));
                    }
                });
            });
        }
    });
};

exports.updateNyTimesHome = function(redis, callback) {
    nytimesJob('nytimesHome', redis, callback);
}

exports.getNyTimesHome = function(redis, callback) {
    console.log('getNyTimesHome');
    redis.get('nytimesHome', function(err, reply) {
        if (err) {
            console.log(err);
            callback(null);
        } else if (reply) {
            callback(reply);
        } else {
            callback(null); //feedback to user immediatly
            nytimesJob('nytimesHome', redis, callback);
        }
    });
};

exports.getPttHome = function(redis, callback) {
    console.log('getPttHome');
    redis.get('pttHome', function(err, reply) {
        if (err) {
            console.log(err);
            callback(null);
        } else if (reply) {
            callback(reply);
        } else {
            callback(null); //feedback to user immediatly
            pttJob('pttHome', redis, callback);
        }
    });
};

exports.updatePttHome = function(redis, callback) {
    pttJob('pttHome', redis, callback);
}

function nytimesJob (jobName, redis, callback) {
   var job = jobs.create('register_job', {
     name: jobName
   });
   
   job.on('complete', function() {
      console.log('Job', job.id, 'with name', job.data.name, 'is done');
   }).on('failed', function() {
      console.log('Job', job.id, 'with name', job.data.name, 'has failed');
   });

   async.series([
        fetchLatestReviews
   ],function (err, meta) {
        if (err) console.error(err.stack);
        console.log('all jobs for Nytimes home cache update finished!!');
        redis.set('nytimesHome', JSON.stringify(meta[0]), function (err, replies) {
            console.log('cache done ' + err);
            if (!err) {
                console.log(replies);
                callback(meta[0]);
            }
        });
    });
}

function pttJob (jobName, redis, callback) {
   var job = jobs.create('register_job', {
     name: jobName
   });
   
   job.on('complete', function() {
      console.log('Job', job.id, 'with name', job.data.name, 'is done');
   }).on('failed', function() {
      console.log('Job', job.id, 'with name', job.data.name, 'has failed');
   });

   async.series([
        collectPostTopics
   ],function (err, meta) {
        if (err) console.error(err.stack);
        console.log('all jobs for ptt home cache update finished!!');
        redis.set('pttHome', JSON.stringify(meta[0]), function (err, replies) {
            console.log('cache done ' + err);
            if (!err) {
                console.log(replies);
                callback(meta[0]);
            }
        });
   });
}

function collectPostTopics (done) {
    console.log('collectPostTopics ------>');
    var meta = [],
        bar,
        date;
    bar = moment().format('l').split('/').slice(0,2).join('/');
    date = moment().format('l').split('/')[2]+'/'+bar;
    dbPtt.ptt.find({}).sort({'date': -1, '_id': -1}).limit(20, function(err, docs) {
        var foo = {},
            reg = /^\[|]/
        docs.forEach(function(item, index) {
            reg.exec(item['title'].trim()) ? meta.push(opencc.convertSync(item['title'].split(']')[1]).trim()) : 
                                             meta.push(opencc.convertSync(item['title'].trim()));
        });
        done(null, meta);
    });
}

function fetchLatestReviews (done) {
    console.log('fetchLatestReviews');
    request({
        url: 'https://api.nytimes.com/svc/movies/v2/reviews/search.json?offset=0',
        encoding: "utf8",
        method: "GET",
        headers: {
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.87 Safari/537.36',
            'Accept' : 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'api-key': config.nyTimesKey
        }
    }, function(err, response, body) {
        var result = [],
            meta = [],
            count = 0;

        results = JSON.parse(body)['results'];

        results.forEach(function(item, index) {
            meta.push({
                headline: item['headline'].indexOf('Review:') != -1 ? item['headline'].split('Review:')[1].trim("") : item['headline'],
                link: item['link']['url'],
                picUrl: item['multimedia'] != null ? item['multimedia']['src'] : "http://img.eiga.k-img.com/images/person/noimg/400.png?1423551130"
            });
        });

        console.log('collectPicture -------->');
        async.whilst(
            function() { return count < meta.length},
            function(callback) {
                var informer = new nyInformer(meta[count]['link']);
                informer.on('complete', function(result){
                    console.log('complete: ' + result['image']['src']);
                    if (typeof(result['image']['src']) != 'undefined') 
                        meta[count]['picUrl'] = result['image']['src'];  
                    count++;
                    callback(null, count);
                });
            },
            function(err, n) {
                console.log('collectPicture finish ' + n);
                done(null, meta);
            }
        ); 
    });
}


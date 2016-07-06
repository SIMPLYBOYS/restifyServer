var config = require('../config');
var dbIMDB = config.dbIMDB;
var dbUpComing = config.dbUpComing;
var dbPosition = config.dbPosition;
var dbToday = config.dbToday;
var dbRecord = config.dbRecord;
var dbJapan = config.dbJapan;
var dbKorea = config.dbKorea;
var myapiToken = config.myapiToken;
var Updater = require('../update/Updater');
var nyInformer = require('../nytimes/nyInformer');
var google = require('google');
var request = require("request");
var async = require('async');
var moment = require("moment");
var async = require('async');
var updateMovies = [];
var monthList = [
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
        {start: '1201', end: '1231'}
    ];

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
                // console.log(docs[i]['readMore']['page']);
                // console.log(docs[i]['detailContent']['country']);
            
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
                    // console.log(docs[i]['title']);
                // console.log(docs[i]['posterUrl']);
            }
            res.end(JSON.stringify(foo));
        });
    } else {
        res.send('like missing query params!');
        res.end();
    }
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

exports.monthList = function(req, res, next) {
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
        })
    }
};

exports.getTitle = function(req, res) {
    var foo = {'contents': []};
    dbIMDB.imdb.find({'top': {$lte:250, $gte: 1}}).sort({'top':1}, function(err, docs){
        for (var i=0; i<docs.length; i++) {
            // console.log(docs[i]['title']);
            foo['contents'].push(docs[i]['title']);
        }
        dbIMDB.imdb.find({releaseDate: {$gte: parseInt(20160501), $lte: parseInt(20161031)}}).sort({'releaseDate': 1}, function(err, docs){
            for (var j=0; j<docs.length; j++) {
                // console.log(docs[j]['title']);
                foo['contents'].push(docs[j]['title']);
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

exports.updatePosition = function(req, res) {
    
    dbPosition.position.find({date: moment().format('l')}, function(err, doc) {
        
        doc = doc[0];
        
        if (!doc)
            res.end('fail and finished!!');

        async.series([
          function (done) {
            console.log(doc);
            //type A 
            if (doc['newItem']) {
                doc['newItem'].forEach(function(item, index) {
                     updateMovies.push({'title': item['title'].split('(')[0].trim(),
                        'position': item['position']
                     });
                     //TODO before update the item need to insert hole bunch of data
                })
                done(null);
            } else {
                done(null);
            }
          },
          function (done) {
            //type B
            if (doc['upItem']) {
                doc['upItem'].forEach(function(item, index) {
                    console.log(item['title'].split('(')[0].trim());
                    updateMovies.push({'title': item['title'].split('(')[0].trim(),
                        'position': item['position']
                    });
                })
                done(null);
            } else {
                done(null);
            }
          },
          function (done) {
            //type C
            if (doc['downItem']) {
                doc['downItem'].forEach(function(item, index) {
                    console.log(item['title'].split('(')[0].trim());
                    updateMovies.push({'title': item['title'].split('(')[0].trim(),
                        'position': item['position']
                    });
                })
                done(null);
            } else {
                done(null);
            }
          },
          function (done) {
            var total = updateMovies.length;
            for (var i = 0; i < total+1; i++) {
              updatePositionWizard(done);
            }
          }
        ], function (err) {
          if (err) console.error(err.stack);
          console.log('all finished!!');
          res.end('all finished!!');
        });
    });
    
};

exports.krTrends = function(req, res) {
    console.log('krTrends');
    var foo = {};
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8'});
    if (typeof(req.query.title)!= 'undefined') {      
        dbKorea.korea.find.find({'title': req.query.title}, function(err, docs) {
                foo['contents'] = docs;
                foo['byTitle'] = true;
                res.end(JSON.stringify(foo));
        });
    } else {
        dbKorea.korea.find({'top': {$lte:20, $gte: 1}}).sort({'top': parseInt(req.query.ascending)},
         function(err, docs) {
            console.log(docs)
            foo['contents'] = docs;
            foo['byTitle'] = false;
            res.end(JSON.stringify(foo));
        });
    }
};

exports.getTrends = function(req, res) {
    var foo = {};
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8'});
    if (typeof(req.query.title)!= 'undefined') {      
        dbJapan.japan.find.find({'title': req.query.title}, function(err, docs) {
                foo['contents'] = docs;
                foo['byTitle'] = true;
                res.end(JSON.stringify(foo));
        });
    } else {
        dbJapan.japan.find({'top': {$lte:10, $gte: 1}}).sort({'top': parseInt(req.query.ascending)},
         function(err, docs) {
            console.log(docs)
            foo['contents'] = docs;
            foo['byTitle'] = false;
            res.end(JSON.stringify(foo));
            // res.json(data, {'content-type': 'application/json; charset=utf-8'}); // also set charset to utf-8
        });
    }        
};

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
    dbToday.today.find({'date': moment().format('l')}, function(err, doc) {
        var object = {};
            object['contents'] = doc;
        res.end(JSON.stringify(object));
    });
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

exports.myapi = function(req, res, next) {
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


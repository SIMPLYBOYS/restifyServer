var restify = require('restify');
var cheerio = require("cheerio");
var request = require("request");
var iconv = require('iconv-lite');
var mongojs = require('mongojs');
var BufferHelper = require('bufferhelper');
var cronJob = require('cron').CronJob;
var spawn = require('child_process').spawn;
var config = require('./config');
var fs = require("fs");
var localPath = require('path');
var dbContact = mongojs('http://52.192.246.11/test', ['contact']);
var dbVideos = mongojs('http://52.192.246.11/test', ['videos']);
var dbIMDB = config.dbIMDB;
var dbUpComing = config.dbUpComing;
var dbRecord = config.dbRecord;
var dbToday = config.dbToday;
var moment = require("moment");
var dbUbike = mongojs('http://52.192.246.11/test', ['ubike']);
var myapiToken = config.myapiToken;
var Scraper = require('./crawler/Scraper');
var upComingScraper = require('./crawler/upComingScraper');
var upComingGalleryScraper = require('./crawler/upComingGalleryScraper');
var Trailer = require('./Trailer');
var MovieInfomer = require('./MovieInfomer');
var upComingPosterScraper = require('./crawler/upComingPosterScraper');
var google = require('google');
    
var server = restify.createServer({
  name: 'myapp',
  version: '1.0.0'
});

server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());

youTube = new config.YouTube;
youTube.setKey(config.YouTubeKey);

var https_options = {
    key: fs.readFileSync('./ssl/restify.pem'), //on current folder
    certificate: fs.readFileSync('./ssl/restifycert.pem')
};

var upComingPages = [],
    upComingDetailPages = [],
    upComingGalleryPages = [],
    upComingPosterPages = [];

// store all urls in a global variable  
upComingPages = generateUpComingUrls(10);

/*var https_server = restify.createServer(https_options);
https_server.use(restify.acceptParser(server.acceptable));
https_server.use(restify.queryParser());
https_server.use(restify.bodyParser());

https_server.get('/oauth_k', function(req, res, next) {
    console.log('got oauth redirect call from kaif.io!\n' + req.query.code);
    request({
        url: 'https://kaif.io/oauth/access-token -d \'client_id=2dbc7bc93d1f446f\' -d \'client_secret=954318a490e5439b96722a596d2de567\' -d \'redirect_uri=https%3A%2F%2Fec2-52-193-199-171.ap-northeast-1.compute.amazonaws.com%3A443%2Foauth_k\' -d \'grant_type=authorization_code\' -d \'code='+req.query.code,
        encoding: 'utf8',
        method: "POST"
    }, function(err, response, body){
        if(err || !body) { 
            console.log('got error');
            return;
        }

        console.log(response);
        console.log(body);
    });
    res.end();
});*/

google.resultsPerPage = 10;
var nextCounter = 0;

function generateUpComingUrls(limit) {
  var url = 'http://www.imdb.com/movies-coming-soon/2016-';
  var urls = [];
  var i;
  for (i=5; i <= limit; i++) {
    if (i<10)
        urls.push(url + '0'+ i + '/');
    else
        urls.push(url + i + '/');
  }
  return urls;
}

function generateUpComingDetailUrls(month, callback) {
    // var galleryUrl = [];
    dbUpComing.upComing.find({month: month}).forEach(function(err, doc) {
        if (doc) {
            // console.log(doc['movies']);
           for (var i in doc['movies']) {
                upComingDetailPages.push(doc['movies'][i]['galleryUrl']); 
                /*console.log(doc['movies'][i]['title']);
                var foo = doc['movies'][i]['title'];
                foo = foo.slice(0, foo.length-1);
                dbIMDB.imdb.find({title: foo}).forEach(function(err, item) {
                    console.log(item['title']);
                    console.log(item['readMore']['page']);
                    galleryUrl.push({page: item['readMore']['page']});
                });*/
           }
           callback(upComingDetailPages);
        }
    });
}

function generateUpComingGalleryUrls(month, callback) {
    dbUpComing.upComing.find({'month': month}).forEach(function(err, doc) {
        if (doc) {
            for (var i in doc['movies']) {   
                var title = doc['movies'][i]['title'];
                title = title.slice(0, title.length-1);
                dbIMDB.imdb.find({title: title}).forEach(function(err, item) {
                    if (item['gallery_thumbnail'].length >0) {
                        for (var j in item['gallery_thumbnail']) {
                            upComingGalleryPages.push(item['gallery_thumbnail'][j]['detailUrl']);
                        }
                        callback(upComingGalleryPages);
                    }
                });
            }
        }    
    });
}

function generateUpComingPosterUrls(month, callback) {
    dbUpComing.upComing.find({'month': month}).forEach(function(err, doc) {
        if (doc) {
            for (var i in doc['movies']) {   
                var title = doc['movies'][i]['title'];
                title = title.slice(0, title.length-1);
                console.log('0513 '+title);
                dbIMDB.imdb.find({title: title}, function(err, item){
                    if (typeof(item[0]['idIMDB']) == 'undefined')
                        console.log(item[0]['title']);
                    // console.log(item[0]['idIMDB']);
                    upComingPosterPages.push('http://www.imdb.com/title/' + item[0]['idIMDB'] + '/');
                    callback(upComingPosterPages);
                });
            }
        }    
    });
}

function updateUpComingPosterUrls(month, callback) {
    dbUpComing.upComing.find({'month': month}, function(err, doc){
        doc = doc[0];
        if (doc) {
            for (var i in doc['movies']) { 
                var title = doc['movies'][i]['title'];
                title = title.slice(0, title.length-1);
                dbIMDB.imdb.find({title: title}, function(err, item){
                    console.log(item[0]['posterUrl']);
                    if (typeof(item[0]['posterUrl']) != 'undefined') {
                        upComingPosterPages.push(item[0]['posterUrl']);
                        callback(upComingPosterPages);
                    }   
                });
            }
        }
    });
}

function generateUpComingTrailerUrls(month, callback) {
    dbUpComing.upComing.find({'month': month}).forEach(function(err, doc) {
        if (doc) {
            for (var i in doc['movies']) {   
                var title = doc['movies'][i]['title'];
                console.log(title);
                title = title.slice(0, title.length-1);
                new Trailer(title, youTube, dbIMDB);
            }
            callback('got trailerUrlsuccessfully');
            res.end();
        }    
    });
}

function generateUpComingMovieInfo(month, callback) {
    console.log(month);
    dbUpComing.upComing.find({'month': month}).forEach(function(err, doc) {
        if (doc) {
            for (var i in doc['movies']) {   
                var title = doc['movies'][i]['title'];
                console.log(title);
                title = title.slice(0, title.length-1);
                new MovieInfomer(title, myapiToken, dbIMDB);
            }
            callback('generateUpComingMovieInfo successfully');
            res.end();
        }    
    });
}

function generateUpComingMovieInfo_t(title, callback) {
    dbIMDB.imdb.find({title: title}).forEach(function(err, doc) {
        if (doc) {
            new MovieInfomer(title, myapiToken, dbIMDB);
            callback('generateUpComingMovieInfo successfully');
            res.end();
        }    
    });
}

function upComingPosterWizard() {

    if (!upComingPosterPages.length) {
        return console.log('Done!!!!');
    }

    var url = upComingPosterPages.pop();
    console.log(url);
    var scraper = new upComingPosterScraper(url);
    console.log('Requests Left: ' + upComingPosterPages.length);
    scraper.on('error', function (error) {
      console.log(error);
      upComingPosterWizard();
    });

    scraper.on('complete', function (listing) {
        console.log(listing);
        console.log('complete!');
        dbIMDB.imdb.update({'title': listing['title']}, {'$set': {'posterUrl': listing['url']}
        });
        /*dbIMDB.imdb.update({'title': listing['title']}, {'$set': {'description': listing['description']}
        });*/
        upComingPosterWizard();
    });
}

function upComingGalleryWizard() {

    if (!upComingGalleryPages.length) {
        return console.log('Done!!!!');
    }

    var url = upComingGalleryPages.pop();
    console.log(url);
    var scraper = new upComingGalleryScraper(url);
    console.log('Requests Left: ' + upComingGalleryPages.length);
    scraper.on('error', function (error) {
      console.log(error);
      upComingGalleryWizard();
    });

    scraper.on('complete', function (listing) {
        
        console.log(listing);
        console.log('got complete!');

        dbIMDB.imdb.update({'title': listing['title']}, {'$push': {'gallery_full': { type: 'full', url: listing['url']}
            }
        });

        upComingGalleryWizard();
    });
}

function upComingDetailWizard(month) {

    if (!upComingDetailPages.length) {
        return console.log('Done!!!!');
    }

    var url = upComingDetailPages.pop();
    console.log(url);
    var scraper = new upComingScraper(url);
    console.log('Requests Left: ' + upComingDetailPages.length);
    scraper.on('error', function (error) {
      console.log(error);
      upComingDetailWizard(month);
    });

    scraper.on('complete', function (listing) {

        /*dbIMDB.imdb.insert({
            title: listing['title']
        })*/

        console.log(listing);
        console.log('got complete!');

        dbIMDB.imdb.find({title: listing['title']}).forEach(function(err, doc) {
            dbIMDB.imdb.update({'title': listing['title']}, {'$set': {'gallery_thumbnail': listing['picturesUrl']}});
            // dbIMDB.imdb.update({'title': listing['title']}, {'$set': {'readMore': listing}});
        });

        upComingDetailWizard(month);
    });
}

function upComingWizard() {
  // if the Pages array is empty, we are Done!!
  if (!upComingPages.length) {
    return console.log('Done!!!!');
  }
  var url = upComingPages.pop();
  var scraper = new Scraper(url);
  console.log('Requests Left: ' + upComingPages.length);
  // if the error occurs we still want to create our
  // next request
  scraper.on('error', function (error) {
    console.log(error);
    upComingWizard();
  });

  // if the request completed successfully
  // we want to store the results in our database
  scraper.on('complete', function (listing) {
    // console.log(listing['groups'][0]['month'].split(' ')[0]);
    var month = listing['groups'][0]['month'].split(' ')[0];
    dbUpComing.upComing.insert({
        month: month
    })
    
    dbUpComing.upComing.find({'month': month}).forEach(function(err, doc){
        dbUpComing.upComing.update({'month': month}, {'$set': {'movies': listing['movies']}})
    });
    
    // dbUpComing.upComing.insert()
    console.log('got complete!');
    upComingWizard();
  });
}

server.get('/google', function (req, res, next){
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
    })
});

server.get('/create_upComing', function(req, res, next) {
    var numberOfParallelRequests = 20;
    for (var i = 0; i < numberOfParallelRequests; i++) {
      upComingWizard();
    }
    res.end();
});

server.get('/upComing', function(req, res, next) {

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
});

server.get('/create_upComing_detail', function(req, res, next) {
    generateUpComingDetailUrls(req.params.month, function(urls) {
        var numberOfParallelRequests = 5;
        for (var i = 0; i < numberOfParallelRequests; i++) {
          upComingDetailWizard(req.params.month);
        }
    });
    res.end();
});

server.get('/create_upComing_gallery_full', function(req, res, next) {
    var count=0;
    generateUpComingGalleryUrls(req.params.month, function(urls) {
        var numberOfParallelRequests = 5;
        console.log(urls.length);
        console.log('count: ' + count);
        count++;
        for (var i = 0; i < numberOfParallelRequests; i++) {
          upComingGalleryWizard();
        }
    });
    res.end();
});

server.get('/create_upComing_trailerUrl', function(req, res, next) {
    var count=0;
    generateUpComingTrailerUrls(req.params.month, function(result) {
        count++;
        console.log('count: ' + count);
        console.log(result);
    });
    res.end();
});

server.get('/create_upComing_PosterUrl', function(req, res, next) {
    //------ Step1 ------//
    /*generateUpComingPosterUrls(req.query.month, function(urls) {
        var numberOfParallelRequests = 5;
        for (var i=0; i< numberOfParallelRequests; i++) {
            upComingPosterWizard();
        }
    });*/

    //------ Step2 ------//
    updateUpComingPosterUrls(req.query.month, function(urls) {
        var numberOfParallelRequests = 5;
        // console.log(urls);
        for (var i=0; i< numberOfParallelRequests; i++) {
            upComingPosterWizard();
        }
    })
    res.end();
});

server.get('/create_upComing_movieInfo', function(req, res, next) {
    var count=0;
    console.log("month: " + req.query.month);
    /*generateUpComingMovieInfo(req.query.month, function(result) {
        console.log(result);
    });*/
    generateUpComingMovieInfo_t(req.query.title, function(result) {
        console.log(result);
    });
    res.end();
});

server.get('/myapi', function(req, res, next) {
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
})

server.get('/today', function(req, res, next) {
    dbToday.today.find({'date': moment().format('l')}, function(err, doc){
        res.end(JSON.stringify(doc));
    })
});

/*server.get('insert_data', function(req, res, next){
    obj = {"top":194,"title":"Ben-Hur","year":"1959","posterUrl":"http://ia.media-imdb.com/images/M/MV5BNjg2NjA3NDY2OV5BMl5BanBnXkFtZTgwNzE3NTkxMTE@._V1_SX640_SY720_.jpg","rating":"8.1","description":"William Wyler (dir.), Charlton Heston, Jack Hawkins","detailUrl":"http://www.imdb.com/title/tt0052618/?pf_rd_m=A2FGELUUNOQJNL&pf_rd_p=2398042102&pf_rd_r=18ZPYK4SHEX54X7RBWDS&pf_rd_s=center-1&pf_rd_t=15506&pf_rd_i=top&ref_=chttp_tt_194","detailContent":{"poster":"http://ia.media-imdb.com/images/M/MV5BNjg2NjA3NDY2OV5BMl5BanBnXkFtZTgwNzE3NTkxMTE@._V1_UX182_CR0,0,182,268_AL_.jpg","summery":"When a Jewish prince is betrayed and sent into slavery by a Roman friend, he regains his freedom and comes back for revenge.","country":"USA"},"trailerUrl":"https://www.youtube.com/watch?v=LlzfqVtmxVA","readMore":{"url":"http://www.imdb.com/title/tt0052618/mediaindex?ref_=tt_pv_mi_sm","page":2},"gallery_full":[{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BMTQ4NDQzNTYzNV5BMl5BanBnXkFtZTYwMDE4Mjk5._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BMDQyN2NlYWYtNjUxZi00ZWZkLTllZTItNmFiM2Y1Mjk3NThiXkEyXkFqcGdeQXVyNjUwNzk3NDc@._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BMTQ4NTE2MzUxNV5BMl5BanBnXkFtZTcwOTM1MzUxMQ@@._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BOTQ4NDA0NjE5MF5BMl5BanBnXkFtZTcwNzAyNTQ5Ng@@._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BYTE3ZTY4YWEtMTIzYS00OGI0LWFkNjktMzEwYjI3YWM3ZDkyXkEyXkFqcGdeQXVyNjUwNzk3NDc@._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BNGZmMjI0MGItZmM2Mi00ZWM3LWEyNGEtNzAwMmNjZmUxMDRiXkEyXkFqcGdeQXVyMDUyOTUyNQ@@._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BNTAwODU3NzgxMl5BMl5BanBnXkFtZTcwMzk3OTIyNw@@._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BMTUyMzI2NDI4Nl5BMl5BanBnXkFtZTcwNDIyNTQ5Ng@@._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BNTAyMTk3NTA1N15BMl5BanBnXkFtZTcwMjIyNTQ5Ng@@._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BMTAzNzU0MTc3NTJeQTJeQWpwZ15BbWU3MDI4MjU0OTY@._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BMjExMTE5NTc5MF5BMl5BanBnXkFtZTcwNzg3NjAyMQ@@._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BODA2MzI4OGQtYWNkNi00MThjLWJjMzItMDMwNzFhMWRmODk2XkEyXkFqcGdeQXVyMDI2NDg0NQ@@._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BMTkwNzAxOTQwOF5BMl5BanBnXkFtZTYwNjg0MjU5._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BNjYxMTE1NDEtN2QwMS00YjE1LTk3NGItYWNiM2IwYTViYjNiXkEyXkFqcGdeQXVyNjUwNzk3NDc@._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BMTI0ODU3NTM3M15BMl5BanBnXkFtZTYwMTE4Mjk5._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BNzk0NDYxNTgzNV5BMl5BanBnXkFtZTcwNTIyNTQ5Ng@@._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BMTk1OTU2NjQ1NV5BMl5BanBnXkFtZTcwOTEyNTQ5Ng@@._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BMTc4MTY4MzMzNF5BMl5BanBnXkFtZTYwMDE4MDU5._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BMjI2NTQ2NzEwNF5BMl5BanBnXkFtZTcwNDEyNTQ5Ng@@._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BNjg2NjA3NDY2OV5BMl5BanBnXkFtZTgwNzE3NTkxMTE@._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BMTUzNTI0NDA4NV5BMl5BanBnXkFtZTcwMTgyNTQ5Ng@@._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BMzYwNTMwNDAyNl5BMl5BanBnXkFtZTYwNjQ4ODM5._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BMTUyMjM1MDM1Ml5BMl5BanBnXkFtZTcwMjgyMDIyMQ@@._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BODU2NDM0MDU5Nl5BMl5BanBnXkFtZTYwMDk4NDc5._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BMjE0NzAwOTA1OV5BMl5BanBnXkFtZTcwMzEyNTQ5Ng@@._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BMjAxOTEzMTI0Ml5BMl5BanBnXkFtZTcwMDIyNTQ5Ng@@._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BMTY5OTk4Nzg5MF5BMl5BanBnXkFtZTcwNTAyNTQ5Ng@@._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BMTkwMTUzOTA2Ml5BMl5BanBnXkFtZTcwNjkzMzE2MQ@@._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BMTIxNDU1NzEyNl5BMl5BanBnXkFtZTcwNDEzMzEzMQ@@._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BZDgzY2QyNTQtMDVmZC00MjFhLTgwMjMtNGZjNDY4YTJiOGI5XkEyXkFqcGdeQXVyNTIzOTk5ODM@._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BMTc1ODc2MDI4M15BMl5BanBnXkFtZTcwMjg3NjcyMQ@@._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BMTI3NTM3ODA4OV5BMl5BanBnXkFtZTcwMzM0MjEzMQ@@._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BMTM3OTkxODQ3OF5BMl5BanBnXkFtZTcwMzIyNTQ5Ng@@._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BMTY4NzUxNzg3NV5BMl5BanBnXkFtZTYwMzQwODI5._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BNDc0MTEwNjY5OV5BMl5BanBnXkFtZTYwOTA4Mjk5._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BMTYwMTI2NDk4M15BMl5BanBnXkFtZTcwNDc0NzIxOQ@@._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BODkxOTc0MzU0Ml5BMl5BanBnXkFtZTcwNTgwNjEyMQ@@._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BMTc4NzgyNDI1OV5BMl5BanBnXkFtZTYwMDg3NDY5._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BMTk1NDk1MTEwNl5BMl5BanBnXkFtZTYwOTUyMjU5._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BMjEyNjMzOTk2OF5BMl5BanBnXkFtZTYwNTYxMzY5._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BMTI0NjE4ODQzNl5BMl5BanBnXkFtZTcwMzQwODAzMQ@@._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BNzQyOTQ0ODk2NF5BMl5BanBnXkFtZTcwNTkwOTI3MQ@@._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BNzVmZDhjMDItMTYxNi00N2YzLTllMmEtMmI4OWNjNTQwNTY2XkEyXkFqcGdeQXVyMDUyOTUyNQ@@._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BNDI5Mjk2NTk1OF5BMl5BanBnXkFtZTcwNzU2ODU1NQ@@._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BMTI2NzAzNTU0MF5BMl5BanBnXkFtZTcwMzM3NTEyMQ@@._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BMTQ1NjUyMTMwMF5BMl5BanBnXkFtZTcwMjk3OTIyNw@@._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BZTEwNmEwZTEtNjAyYi00YmU1LWJmOTUtYzIxZmNkOTliYjY1XkEyXkFqcGdeQXVyMDI2NDg0NQ@@._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BNTU3MTg2NDgzMF5BMl5BanBnXkFtZTYwMTE2Mjk4._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BMTA5NzEzMDEzMzReQTJeQWpwZ15BbWU3MDI3MDEwMzE@._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BMTQzNDk2NjI1NV5BMl5BanBnXkFtZTcwNjU1NTgxMQ@@._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BODA1NDQzNTM3MF5BMl5BanBnXkFtZTcwMDgyNTQ5Ng@@._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BMzAxODA1MTE5Ml5BMl5BanBnXkFtZTYwODA4Mjk5._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BMTAyNjk2OTc4MzheQTJeQWpwZ15BbWU3MDcxODEwMjE@._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BMjEzMDEwMjI0OV5BMl5BanBnXkFtZTYwMDU5NTE5._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BMTk4NzAyMDU5Ml5BMl5BanBnXkFtZTcwMzgyNTQ5Ng@@._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BMTg1MzYzMzU0OV5BMl5BanBnXkFtZTcwNTU3NDcyMQ@@._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BMjAyNjc3MDg4Nl5BMl5BanBnXkFtZTYwMTk3Njg4._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BZThjZTdhM2UtNzNkYS00MGMzLWE0OTEtZjFjNWE0ZjY2NDMyXkEyXkFqcGdeQXVyMDI2NDg0NQ@@._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BMTgyODk1MzIxNl5BMl5BanBnXkFtZTYwNzA4Mjk5._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BMTI3MDEyOTQwN15BMl5BanBnXkFtZTYwMDI5NTU5._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BMTg3NTQ1NDk0OF5BMl5BanBnXkFtZTcwNzcyNTMyMQ@@._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BMTY2MDc4NDM0MV5BMl5BanBnXkFtZTcwMzkxMjUxMw@@._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BMzgyMjgwMzcyM15BMl5BanBnXkFtZTYwNjI2ODM5._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BMzEwMjkxMGYtNmIxOS00OWE0LThlZWItZmRmZmZkNTE2OWM4XkEyXkFqcGdeQXVyMDI2NDg0NQ@@._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BNTA4NTY4Nzg1N15BMl5BanBnXkFtZTYwMTI5NTU5._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BMTcxMDIxMTYzOV5BMl5BanBnXkFtZTcwMTEwNDEzMQ@@._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BMGM4ZTcyMTUtN2I1Yi00MDUyLWE3NTgtYmNlZDRlNzE4ZGNkXkEyXkFqcGdeQXVyNjUwNzk3NDc@._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BMTQyMjU4NjU3N15BMl5BanBnXkFtZTcwODEyNTQ5Ng@@._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BMjEyNjUwNzk4Ml5BMl5BanBnXkFtZTcwMDcxNDkyMQ@@._V1_SX640_SY720_.jpg"},{"type":"full","url":"http://ia.media-imdb.com/images/M/MV5BMTc1MjU4NDYwM15BMl5BanBnXkFtZTcwNDk3OTIyNw@@._V1_SX640_SY720_.jpg"}],"plot":"A falsely accused Jewish nobleman survives years of slavery to take vengeance on his Roman best friend, who betrayed him.","genres":["Adventure","Drama","History"],"votes":"","directors":[{"name":"Timur Bekmambetov","id":"nm0067457"}],"writers":[{"name":"Lew Wallace","id":"nm0908753"},{"name":"Keith R. Clarke","id":"nm0164851"}],"runtime":"","metascore":null,"idIMDB":"tt2638144"}
    dbIMDB.imdb.insert(obj, function(err, doc){
        if (err)
            return;
        console.log('success insert data!');
        res.send('success!');
        res.end();
    })
});*/

server.get('insert_imdb_plot', function(req, res, next) {
    var titleUrl, count = parseInt(req.query.to) - parseInt(req.query.from) + 1;
    dbIMDB.imdb.find({'top': {$lte:parseInt(req.query.to), $gte:parseInt(req.query.from)}}).forEach(function(err, doc) {
        titleUrl = "http://api.myapifilms.com/imdb/idIMDB?title=" + doc['title'] + "&token=" + myapiToken;
        // console.log("http://api.myapifilms.com/imdb/idIMDB?title=" + doc['title'] + "&token=" + myapiToken);
        request({
            url: titleUrl,
            encoding: 'utf8',
            method: "GET" }, function(err, res, json) {
                if (err || !json)
                    return;
                count-- ;
                console.log(count);
                var foo = JSON.parse(json),
                    bar = foo['data']['movies']; 
                console.log(bar[0]['plot']);   
                dbIMDB.imdb.update({'title': doc['title']}, {'$set': {'plot': bar[0]['plot']}});
                res.end(JSON.stringify(bar));
        });
    });
});

server.get('insert_imdb_plot_t', function(req, res, next) {
    var titleUrl
    dbIMDB.imdb.find({title: req.query.title}).forEach(function(err, doc) {
        titleUrl = "http://api.myapifilms.com/imdb/idIMDB?title=" + doc['title'] + "&token=" + myapiToken;
        // console.log("http://api.myapifilms.com/imdb/idIMDB?title=" + doc['title'] + "&token=" + myapiToken);
        request({
            url: titleUrl,
            encoding: 'utf8',
            method: "GET" }, function(err, res, json) {
                if (err || !json)
                    return;
                var foo = JSON.parse(json),
                    bar = foo['data']['movies']; 
                console.log(bar[0]['plot']);   
                dbIMDB.imdb.update({'title': doc['title']}, {'$set': {'plot': bar[0]['plot']}});
                res.end(JSON.stringify(bar));
        });
    });
});

server.get('insert_imdb_id', function(req, res, next) {
    var titleUrl, count = parseInt(req.query.to) - parseInt(req.query.from) + 1;
    dbIMDB.imdb.find({'top': {$lte:parseInt(req.query.to), $gte:parseInt(req.query.from)}}).forEach(function(err, doc) {
        titleUrl = "http://api.myapifilms.com/imdb/idIMDB?title=" + doc['title'] + "&token=" + myapiToken;
        // console.log("http://api.myapifilms.com/imdb/idIMDB?title=" + doc['title'] + "&token=" + myapiToken);
        request({
            url: titleUrl,
            encoding: 'utf8',
            method: "GET" }, function(err, res, json) {
                if (err || !json)
                    return;
                count-- ;
                console.log(count);
                var foo = JSON.parse(json),
                    bar = foo['data']['movies']; 
                console.log(bar[0]['idIMDB']);   
                dbIMDB.imdb.update({'title': doc['title']}, {'$set': {'idIMDB': bar[0]['idIMDB']}});
                res.end(JSON.stringify(bar));
        });
    });
});

server.get('insert_imdb_genres', function(req, res, next) {
    var titleUrl, count = parseInt(req.query.to) - parseInt(req.query.from) + 1;
    dbIMDB.imdb.find({'top': {$lte:parseInt(req.query.to), $gte:parseInt(req.query.from)}}).forEach(function(err, doc) {
        titleUrl = "http://api.myapifilms.com/imdb/idIMDB?title=" + doc['title'] + "&token=" + myapiToken;
        // console.log("http://api.myapifilms.com/imdb/idIMDB?title=" + doc['title'] + "&token=" + myapiToken);
        request({
            url: titleUrl,
            encoding: 'utf8',
            method: "GET" }, function(err, res, json) {
                if (err || !json)
                    return;
                count-- ;
                console.log(count);
                var foo = JSON.parse(json),
                    bar = foo['data']['movies']; 
                console.log(bar[0]['genres']);   
                console.log(bar[0]['votes']);
                console.log(bar[0]['directors']);
                console.log(bar[0]['writers']);
                console.log(bar[0]['runtime']);
                console.log(bar[0]['metascore']);

                dbIMDB.imdb.update({'title': doc['title']}, {'$set': {'votes': bar[0]['votes']}});
                dbIMDB.imdb.update({'title': doc['title']}, {'$set': {'genres': bar[0]['genres']}});
                dbIMDB.imdb.update({'title': doc['title']}, {'$set': {'directors': bar[0]['directors']}});
                dbIMDB.imdb.update({'title': doc['title']}, {'$set': {'writers': bar[0]['writers']}});
                dbIMDB.imdb.update({'title': doc['title']}, {'$set': {'runtime': bar[0]['runtime']}});
                dbIMDB.imdb.update({'title': doc['title']}, {'$set': {'metascore': parseInt(bar[0]['metascore'])}});

                res.end(JSON.stringify(bar));
        });
    });
});

server.get('insert_imdb_genres_t', function(req, res, next) {
    var titleUrl;
    dbIMDB.imdb.find({title: req.query.title}).forEach(function(err, doc) {
        titleUrl = "http://api.myapifilms.com/imdb/idIMDB?title=" + doc['title'] + "&token=" + myapiToken;
        // console.log("http://api.myapifilms.com/imdb/idIMDB?title=" + doc['title'] + "&token=" + myapiToken);
        request({
            url: titleUrl,
            encoding: 'utf8',
            method: "GET" }, function(err, res, json) {
                if (err || !json)
                    return;
                var foo = JSON.parse(json),
                    bar = foo['data']['movies']; 
                console.log(bar[0]['genres']);   
                console.log(bar[0]['votes']);
                console.log(bar[0]['directors']);
                console.log(bar[0]['writers']);
                console.log(bar[0]['runtime']);
                console.log(bar[0]['metascore']);

                dbIMDB.imdb.update({'title': doc['title']}, {'$set': {'votes': bar[0]['votes']}});
                dbIMDB.imdb.update({'title': doc['title']}, {'$set': {'genres': bar[0]['genres']}});
                dbIMDB.imdb.update({'title': doc['title']}, {'$set': {'directors': bar[0]['directors']}});
                dbIMDB.imdb.update({'title': doc['title']}, {'$set': {'writers': bar[0]['writers']}});
                dbIMDB.imdb.update({'title': doc['title']}, {'$set': {'runtime': bar[0]['runtime']}});
                dbIMDB.imdb.update({'title': doc['title']}, {'$set': {'metascore': parseInt(bar[0]['metascore'])}});

                res.end(JSON.stringify(bar));
        });
    });
});

server.get('/update_imdb_trailer', function(req, res, next) {
    res.send('update trailer @ ' + new Date());
    var count = 1;
    dbIMDB.imdb.find({'top':{$lte:250, $gte:1}}).forEach(function(err, doc) {
        google(doc['title'] + 'trailer', function (err, res) {
            console.log(count + ': '+ doc['title'] );
            count++;
            for (var i = 0; i < res.links.length; ++i) {
                var link = res.links[i];
                console.log(link.title);
                if (link.title.match('YouTube')) {
                    console.log(link.href);
                    dbIMDB.imdb.update({'title': doc['title']}, {'$set': {'trailerUrl': link.href}});
                }
            }
        });
    });
});

server.get('/youtube_search', function(req, res, next) {
    var movieTitle = req.query.title;

    youTube.search(movieTitle, 2, function(error, result) {
      if (error) {
        console.log(error);
      }
      else {
        console.log(JSON.stringify(result, null, 2));
        res.end(JSON.stringify(result, null, 2));
      }
    });
});

server.get('/echo/:name', function (req, res, next) {
	console.log(req.params);
  res.send(req.params);
  return next();
});

server.get("/contacts", function (req, res, next) {
    dbContact.contact.find(function (err, contacts) {
        res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8'
        });
        console.log('get contacts data ======>');
        console.log(contacts.length);
        var foo = [],
        	bar = {};

        for (i=0; i<contacts.length; i++){
        	foo[i] = contacts[i];
        }
        bar['contacts'] = foo;
        bar['test'] = '轉職';
        res.end(JSON.stringify(bar));
    });
    return next();
});

 // db.videos.aggregate([{$unwind: "$sessions"},{$project:{ page_id: 1, item_name: "$sessions.hashtag", last_updated_utc:1 }}])

 server.get("/videos", function (req, res, next) {
    dbVideos.videos.find(function (err, videos) {
        res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8'
        });
        var foo = {};
        foo['tags'] = videos[0]['tags'];
        foo['sessions'] = videos[0]['sessions'];
        foo['speakers'] = videos[0]['speakers'];
        foo['video_library'] = videos[0]['video_library'];
        res.end(JSON.stringify(foo));
    });
    /*dbVideos.videos.aggregate([{$unwind: "$sessions"},{$project:{ 
    		item_name: "$sessions.hashtag"}}
    	]).toArray(function(err, result){
    		console.log(result);
    	})
    res.end();*/
    return next();
});

server.get("/videos/tags", function (req, res, next) {
    dbVideos.videos.find(function (err, videos) {
        res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8'
        });
        var foo = {};
        foo['tags'] = videos[0]['tags'];
        res.end(JSON.stringify(foo));
    });
    return next();
});

server.get("/videos/sessions", function (req, res, next) {
    dbVideos.videos.find(function (err, videos) {
        res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8'
        });
        
        var foo = {};
        foo['sessions'] = videos[0]['sessions'];
        res.end(JSON.stringify(foo));
    });
    return next();
});

server.get("/videos/speakers", function (req, res, next) {
    dbVideos.videos.find(function (err, videos) {
        res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8'
        });
        
        var foo = {};
        foo['speakers'] = videos[0]['speakers'];
        res.end(JSON.stringify(foo));
    });
    return next();
});

server.get("/videos/video_library", function (req, res, next) {
    dbVideos.videos.find(function (err, videos) {
        res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8'
        });
        
        var foo = {};
        foo['video_library'] = videos[0]['video_library'];
        res.end(JSON.stringify(foo));
    });
    return next();
});

server.get("/crawler", function(req, res, next) {
    request({
        url: "http://blog.infographics.tw",
        encoding: 'utf8',
        method: "GET"
    }, function(err, req, body) {
        if(err || !body) { return; }
        var bufferhelper = new BufferHelper();
        var str = iconv.decode(new Buffer(body), "big5");
        console.log(body);
        var $ = cheerio.load(body);
        var result = [];
        var titles = $("li.item h2");
        
        for(var i=0;i<titles.length;i++) {
            result.push($(titles[i]).text());
        }
            
        console.log(result);
        fs.writeFileSync("result.json", JSON.stringify(result));
        // res.end(body.toString());
        res.end(JSON.stringify(result));
    });
    return next();
});

server.get("/crawler/1", function(req, res, next){
    var foo = JSON.parse(fs.readFileSync('result.json', 'utf8'));
    // var result = iconv.decode(JSON.stringify(foo), 'Big5');
    var bar = {};
    bar['contant'] = foo;
    console.log(JSON.stringify(foo));
    res.writeHead(200, {"Content-Type": "text/html"});
    res.write("<html>");
    res.write("<head>");
    res.write("<meta charset=\"UTF-8\">");
    res.write("<title>Page</title>");
    res.write("</head>");
    res.end(JSON.stringify(bar));
});

server.get("/create_imdb", function(req, res, next) {
    request({
        url: "http://www.imdb.com/chart/top",
        encoding: "utf8",
        method: "GET"
    }, function(err, response, body) {
        if (err || !body) { return; }

        var imdb_baseUrl = 'http://www.imdb.com';
        var $ = cheerio.load(body);
        var poster = {},
            title = {},
            rating = {},
            year = {};

        poster = $('.lister-list tr .posterColumn img');
        title = $('.lister-list tr .titleColumn a');
        rating = $('.lister-list tr .imdbRating strong');
        year = $('.lister-list tr .titleColumn .secondaryInfo');
        detailUrl = $('.titleColumn a');

        for (var i = 0; i<250;i++) { 
            // console.log('http://www.imdb.com' + detailUrl[i]['attribs']['href']);
            dbIMDB.imdb.insert({
                'top': i+1, 
                'title': $(title[i]).text(),
                'year': $(year[i]).text().slice(1,5),
                'posterUrl': poster[i]['attribs']['src'],
                'rating': $(rating[i]).text(),
                'description': title[i]['attribs']['title'],
                'detailUrl': imdb_baseUrl + detailUrl[i]['attribs']['href']
            });
        }
    });
    res.redirect('/create_imdb_detail', next);
});

function is_numeric(str) {
    return /^\d+$/.test(str);
}

server.get("/insert_imdb_cast", function(req, res, next) {
     var count = parseInt(req.query.to) - parseInt(req.query.from) + 1;
     dbIMDB.imdb.find({'top': {$lte:parseInt(req.query.to), $gte:parseInt(req.query.from)}}).forEach(function(err, doc) {
        Url = "http://top250.info/movie/?" + doc['idIMDB'].slice(2)+'/full';
        console.log('from: '+ req.query.from +'\n to: ' + req.query.to);
        request({
            url: Url,
            encoding: "utf8",
            method: "GET"
        }, function(err, response, body) {
            count-- ;
            console.log(count);
            if (err || !body) { return; }
            var record_baseUrl = 'http://top250.info/movie',
                $ = cheerio.load(body),
                movieLeft = {},
                token = null,
                cast = [];

            movieLeft = $('.movie_left');
            //method1
            $(movieLeft).find('p').each(function(index, item) {
                    token = $(this).text();
                    if (token.indexOf("Cast")!= -1) {
                        var bar = token.split(','),
                            foo, name;
                        for (var i=0; i<bar.length; i++) {
                                foo = bar[i].split('/');
                                name = foo[0];
                            for (var j=0; j<name.length; j++) {
                                if (is_numeric(name[j])) {
                                    name = name.slice(0,j);
                                    console.log(name);
                                    if (i==0) {
                                        name = name.slice(6, name.length);
                                        name = name.replace(/\s+/g, '');
                                        console.log(name);
                                        cast.push(name);
                                    } else {
                                        name = name.replace(/\s+/g, '');
                                        cast.push(name);
                                    }
                                    continue;
                                } else if (j==name.length-1) {
                                    console.log(name);
                                }
                            }
                        }
                    }
            });

            dbIMDB.imdb.update({'title': doc['title']}, {'$set': {'cast': cast}});
            res.end();
        });
    }); 
});

server.get('/imdb_records', function(req, res, next) {
    dbRecord.records.find({'title': req.query.title}, function(err, doc) {
        var object = {};
            object['contents'] = doc;
            
        var bar = JSON.stringify(doc[0]);
        var foo = JSON.parse(bar);
        console.log(foo['records'].length);
        
        if (foo['records'].length > 50) {
            //TODO
        }

        res.end(JSON.stringify(object));
    });
});

server.get("/insert_record_title", function(req, res, next) {
    var count = parseInt(req.query.to) - parseInt(req.query.from) + 1;
    dbIMDB.imdb.find({'top': {$lte:parseInt(req.query.to), $gte:parseInt(req.query.from)}}).forEach(function(err, doc) {
        count-- ;
        console.log(count);
        dbRecord.records.insert({
            'title': doc['title']
        });
    });
    res.end();
});

server.get("/create_record", function(req, res, next) {
     var count = parseInt(req.query.to) - parseInt(req.query.from) + 1;
     dbIMDB.imdb.find({'top': {$lte:parseInt(req.query.to), $gte:parseInt(req.query.from)}}).forEach(function(err, doc) {
        Url = "http://top250.info/movie/?" + doc['idIMDB'].slice(2)+'/full';
        console.log('from: '+ req.query.from +'\n to: ' + req.query.to);
        request({
            url: Url,
            encoding: "utf8",
            method: "GET"
        }, function(err, response, body) {
            count-- ;
            console.log(count);
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

            dbRecord.records.find({'title': doc['title']}).forEach(function(err, doc) {
                dbRecord.records.update({'title': doc['title']}, {'$set': {'records': records}});
            });

            res.end();
        });
    }); 
});

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

server.get('/update_imdb_poster', function(req, res, next) {
    res.send('update poster @ ' + new Date());
    dbIMDB.imdb.find({'top':{$lte:250, $gte:1}}).forEach(function(err, doc) {
        request({
            url: doc['posterUrl'],
            encoding: 'utf8',
            method: "GET" }, function(err, res, body){
                if (err || !body)
                    return;
                var $ = cheerio.load(body);
                var url = $('.photo img')[0];
                console.log(doc['top']+':');
                console.log(url['attribs']['src']);
                dbIMDB.imdb.update({'title': doc['title']}, {'$set': {'posterUrl': url['attribs']['src']}});
        });
    });
});

server.get('/update_imdb_readmore', function(req, res, next) {
    dbIMDB.imdb.find({'top': {$lte:250, $gte:1}}).forEach(function(err, doc) {
        request({
            url: doc['detailUrl'],
            encoding: "utf8",
            method: "GET" }, function(err, res, body) {
                if (err || !body)
                    return;
                var $ = cheerio.load(body);
                var url = $('.combined-see-more a')[1]['attribs']['href'];
                var path = 'http://www.imdb.com' + url;
                var foo = $('.combined-see-more a')[1]['children'];
                var page = $(foo[0]).text();
                page = Math.ceil(parseInt(page.split("photos")[0]) / 48);
                console.log('top: ' + doc['top'] + path);
                doc['readMore'] = { 
                    "url": path,
                    "page": page
                };
                dbIMDB.imdb.update({'title': doc['title']}, doc);
            });
    });
    res.send('finish!');
    res.end();
});

// fetch full pixel image Url
server.get('/update_imdb_gallery_f', function(req, res, next) { 
    console.log('from: '+ req.query.from +'\n to: ' + req.query.to);
    dbIMDB.imdb.find({'top': {$lte:parseInt(req.query.to), $gte:parseInt(req.query.from)}}).forEach(function(err, doc) {
        // console.log(doc['gallery_thumbnail']);
        var gallery = [];
        for(var i in doc['gallery_thumbnail']) {
            console.log(doc['gallery_thumbnail'][i]['detailUrl']);

            var options = {
              url: doc['gallery_thumbnail'][i]['detailUrl'],
              encoding: "utf8",
              method: "GET"
            };

            var callback = function(err, res, body) {
                    if (err || !body)
                        return;
                    var $ = cheerio.load(body);
                    // console.log($('.photo a img')[0]['attribs']['src'])
                    gallery.push({
                        type: 'full',
                        url: $('.photo a img')[0]['attribs']['src'],
                    })

                    doc["gallery_full"] = gallery;
                    dbIMDB.imdb.update({'title': doc['title']}, doc);
            };
            console.log(i);
            request(options, callback);
        }
    });
    res.send('finish');
    res.end();
});

//fetch thumbnail image Url
server.get('/update_imdb_gallery_t', function(req, res, next) { 
    console.log('from: '+ req.query.from +'\n to: ' + req.query.to);
    dbIMDB.imdb.find({'top': {$lte:parseInt(req.query.to), $gte:parseInt(req.query.from)}}).forEach(function(err, doc) {
        var gallery = [];
        for (var j=1; j<=doc['readMore']['page']; j++) {

            var bar = doc['readMore']['url'].split('?');

            var options = {
              url: bar[0] + '?page=' +j+'&'+bar[1],
              encoding: "utf8",
              method: "GET"
            };

            console.log(doc['top']);

            var callback = function(err, res, body) {
                    if (err || !body)
                        return;
                    var $ = cheerio.load(body);
                    var gallery_length = $('.page_list a').length/2+1;
                    var url = $('.media_index_thumb_list a img');
                    var detailUrl = $('.media_index_thumb_list a');
                                           
                    url.each(function(index, body) {
                        // console.log(detailUrl[index]['attribs']['href']);  
                        console.log('index: ' + index);
                        // console.log(body['attribs']['src']);
                        gallery.push({
                            type: 'thumbnail',
                            url: body['attribs']['src'],
                            detailUrl: 'http://www.imdb.com' + detailUrl[index]['attribs']['href']
                        })
                    });

                    // console.log(gallery);
                    doc["gallery_thumbnail"] = gallery;
                    dbIMDB.imdb.update({'title': doc['title']}, doc);
            };
            request(options, callback);
        }   
    });
    res.send('finish!');
    res.end();
});

server.get('/update_imdb_gallery_t_2', function(req, res, next) { 
    dbIMDB.imdb.find({'title': req.query.title}).forEach(function(err, doc) {
        var gallery = [];
        for (var j=1; j<=doc['readMore']['page']; j++) {

            var bar = doc['readMore']['url'].split('?');

            var options = {
              url: bar[0] + '?page=' +j+'&'+bar[1],
              encoding: "utf8",
              method: "GET"
            };

            console.log(doc['top']);

            var callback = function(err, res, body) {
                    if (err || !body)
                        return;
                    var $ = cheerio.load(body);
                    var gallery_length = $('.page_list a').length/2+1;
                    var url = $('.media_index_thumb_list a img');
                    var detailUrl = $('.media_index_thumb_list a');
                                           
                    url.each(function(index, body) {
                        // console.log(detailUrl[index]['attribs']['href']);  
                        console.log('index: ' + index);
                        // console.log(body['attribs']['src']);
                        gallery.push({
                            type: 'thumbnail',
                            url: body['attribs']['src'],
                            detailUrl: 'http://www.imdb.com' + detailUrl[index]['attribs']['href']
                        })
                    });

                    // console.log(gallery);
                    doc["gallery_thumbnail"] = gallery;
                    dbIMDB.imdb.update({'title': doc['title']}, doc);
            };
            request(options, callback);
        }   
    });
    res.send('finish!');
    res.end();
});

function create_detail (err, doc) {
    console.log("0512" + doc);
            request({
                url: doc['detailUrl'],
                encoding: "utf8",
                method: "GET" }, function(err, res, body) {
                    if (err || !body) 
                        return;
                    var $ = cheerio.load(body);
                    var url = $('.slate_wrapper .poster a img')[0];
                    var foo = $('.minPosterWithPlotSummaryHeight .poster img')[0];
                    if (typeof(url)!=='undefined') {
                        console.log(doc['title']);
                        console.log('.1-->'+url['attribs']['src']);
                        var poster = url['attribs']['src'];
                        var slate = $('.slate_wrapper .slate a img')[0]['attribs']['src'];
                        var summery = $('.plot_summary .summary_text').text().trim();
                        if ($($('#titleDetails .txt-block')[0]).find('.inline').text() == 'Country:')
                            var country = $('#titleDetails .txt-block')[0];
                        else
                            var country = $('#titleDetails .txt-block')[1];
                        var $country = $(country);
                        if ($country.find('a').length == 1)
                            country = $country.find('a').text();
                        else
                            country = $($country.find('a')[0]).text();
                        doc['detailContent'] = {
                            "poster": poster,
                            "slate": slate,
                            "summery": summery,
                            "country": country
                        };
                        dbIMDB.imdb.update({'title':doc['title']}, doc);
                        var bar = $('.slate_wrapper .poster a')[0];
                        var path = 'http://www.imdb.com' + bar['attribs']['href'];
                        console.log(path);
                        dbIMDB.imdb.update({'title': doc['title']}, {'$set': {'posterUrl': path}});
                    } else {
                        console.log(doc['title']);
                        var poster = foo['attribs']['src'];
                        var summery = $('.minPosterWithPlotSummaryHeight .summary_text').text().trim();
                        if ($($('#titleDetails .txt-block')[0]).find('.inline').text() == 'Country:')
                            var country = $('#titleDetails .txt-block')[0];
                        else
                            var country = $('#titleDetails .txt-block')[1];
                        var $country = $(country);
                        if ($country.find('a').length == 1)
                            country = $country.find('a').text();
                        else
                            country = $($country.find('a')[0]).text()
                        doc['detailContent'] = {
                            "poster": poster,
                            "summery": summery,
                            "country": country
                        };
                        foo['attribs']['src'];
                        dbIMDB.imdb.update({'title':doc['title']}, doc);

                        var bar = $('.minPosterWithPlotSummaryHeight .poster a')[0];
                        var path = 'http://www.imdb.com' + bar['attribs']['href'];
                        console.log(path);
                        dbIMDB.imdb.update({'title': doc['title']}, {'$set': {'posterUrl': path}});
                    }
            });
}

server.get('/create_imdb_detail', function(req, res, next) {
    res.send('Launch crawler @ ' + new Date());
    if (typeof(req.query.title) == 'undefined') {
        dbIMDB.imdb.find({'top':{$lte:parseInt(req.query.to), $gte:parseInt(req.query.from)}}).forEach(create_detail);
    } else {
        dbIMDB.imdb.find({'title': req.query.title}, create_detail);
    }
    
    res.end();
});

server.get('/imdb', function(req, res, next) {
    console.log('from: '+ req.query.from +'\n to: ' + req.query.to + '\n title: ' + req.query.title);
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
});

server.get('/imdb_title', function(req, res) {
    var foo = {'contents': []};
    dbIMDB.imdb.find({'top': {$lte:250, $gte: 1}}).sort({'top':1}, function(err, docs){
        for (var i=0; i<docs.length; i++){
            // console.log(docs[i]['title']);
            foo['contents'].push(docs[i]['title']);
        }
        dbIMDB.imdb.find({releaseDate: {$gte: parseInt(20160501), $lte: parseInt(20160930)}}).sort({'releaseDate': 1}, function(err, docs){
            for (var j=0; j<docs.length; j++){
                // console.log(docs[j]['title']);
                foo['contents'].push(docs[j]['title']);
            }
            res.end(JSON.stringify(foo));
        });
    });
});

server.get('/content/:id', function(req, res, next) {
    var contents = {},
        raw; 

    if (req.params.id == 0) {
        raw = [{'location':'France', 'time': '5/24 am 9:30', 'imgUrl': 'http://www.telegraph.co.uk/travel/destination/article130148.ece/ALTERNATES/w620/parisguidetower.jpg'},
            {'location':'France', 'time': '5/24 am 9:30', 'imgUrl': 'http://www.telegraph.co.uk/travel/destination/article130148.ece/ALTERNATES/w620/parisguidetower.jpg'},
            {'location':'France', 'time': '5/24 am 9:30', 'imgUrl': 'http://www.telegraph.co.uk/travel/destination/article130148.ece/ALTERNATES/w620/parisguidetower.jpg'},
            {'location':'France', 'time': '5/24 am 9:30', 'imgUrl': 'http://www.telegraph.co.uk/travel/destination/article130148.ece/ALTERNATES/w620/parisguidetower.jpg'},
            {'location':'France', 'time': '5/24 am 9:30', 'imgUrl': 'http://www.telegraph.co.uk/travel/destination/article130148.ece/ALTERNATES/w620/parisguidetower.jpg'},
            {'location':'France', 'time': '5/24 am 9:30', 'imgUrl': 'http://www.telegraph.co.uk/travel/destination/article130148.ece/ALTERNATES/w620/parisguidetower.jpg'}];
    } else if (req.params.id == 1) {
        raw = [{'location':'France', 'time': '5/24 am 9:30', 'imgUrl': 'http://www.telegraph.co.uk/travel/destination/article130148.ece/ALTERNATES/w620/parisguidetower.jpg'},
            {'location':'Angleterre', 'time': '5/25 am 10:30', 'imgUrl': 'http://www.traditours.com/images/Photos%20Angleterre/ForumLondonBridge.jpg'},
            {'location':'Allemagne', 'time': '5/26 am 11:30', 'imgUrl': 'http://tanned-allemagne.com/wp-content/uploads/2012/10/pano_rathaus_1280.jpg'},
            {'location':'Espagne', 'time': '5/27 pm 00:30', 'imgUrl': 'http://www.sejour-linguistique-lec.fr/wp-content/uploads/espagne-02.jpg'},
            {'location':'Italie', 'time': '5/28 pm 1:30', 'imgUrl': 'http://retouralinnocence.com/wp-content/uploads/2013/05/Hotel-en-Italie-pour-les-Vacances2.jpg'},
            {'location':'Russie', 'time': '5/29 pm 2:30', 'imgUrl': 'http://www.choisir-ma-destination.com/uploads/_large_russie-moscou2.jpg'}];
    } else if (req.params.id == 2) {
        raw = [ {'location':'Allemagne', 'time': '5/26 am 11:30', 'imgUrl': 'http://tanned-allemagne.com/wp-content/uploads/2012/10/pano_rathaus_1280.jpg'},
            {'location':'Allemagne', 'time': '5/26 am 11:30', 'imgUrl': 'http://tanned-allemagne.com/wp-content/uploads/2012/10/pano_rathaus_1280.jpg'},
            {'location':'Allemagne', 'time': '5/26 am 11:30', 'imgUrl': 'http://tanned-allemagne.com/wp-content/uploads/2012/10/pano_rathaus_1280.jpg'},
            {'location':'Allemagne', 'time': '5/26 am 11:30', 'imgUrl': 'http://tanned-allemagne.com/wp-content/uploads/2012/10/pano_rathaus_1280.jpg'},
            {'location':'Allemagne', 'time': '5/26 am 11:30', 'imgUrl': 'http://tanned-allemagne.com/wp-content/uploads/2012/10/pano_rathaus_1280.jpg'},
            {'location':'Allemagne', 'time': '5/26 am 11:30', 'imgUrl': 'http://tanned-allemagne.com/wp-content/uploads/2012/10/pano_rathaus_1280.jpg'}];
    } else if (req.params.id == 3) {
        raw = [{'location':'Italie', 'time': '5/28 pm 1:30', 'imgUrl': 'http://retouralinnocence.com/wp-content/uploads/2013/05/Hotel-en-Italie-pour-les-Vacances2.jpg'},
           {'location':'Italie', 'time': '5/28 pm 1:30', 'imgUrl': 'http://retouralinnocence.com/wp-content/uploads/2013/05/Hotel-en-Italie-pour-les-Vacances2.jpg'},
           {'location':'Italie', 'time': '5/28 pm 1:30', 'imgUrl': 'http://retouralinnocence.com/wp-content/uploads/2013/05/Hotel-en-Italie-pour-les-Vacances2.jpg'},
           {'location':'Italie', 'time': '5/28 pm 1:30', 'imgUrl': 'http://retouralinnocence.com/wp-content/uploads/2013/05/Hotel-en-Italie-pour-les-Vacances2.jpg'},
           {'location':'Italie', 'time': '5/28 pm 1:30', 'imgUrl': 'http://retouralinnocence.com/wp-content/uploads/2013/05/Hotel-en-Italie-pour-les-Vacances2.jpg'},
           {'location':'Italie', 'time': '5/28 pm 1:30', 'imgUrl': 'http://retouralinnocence.com/wp-content/uploads/2013/05/Hotel-en-Italie-pour-les-Vacances2.jpg'}];
    }

    contents['contents'] = raw;
    res.end(JSON.stringify(contents));
});

server.get('/detail/:place', function(req, res, next) {
    var detail = {},
        raw; 
    
    switch (req.params.place) {
            case "France":
                   raw = [{'location':'France', 'time': '5/24 am 9:30', 'imgUrl': 'http://www.telegraph.co.uk/travel/destination/article130148.ece/ALTERNATES/w620/parisguidetower.jpg'}];
                    break;
            case "Angleterre":
                   raw = [{'location':'Angleterre', 'time': '5/25 am 10:30', 'imgUrl': 'http://www.traditours.com/images/Photos%20Angleterre/ForumLondonBridge.jpg'}]
                    break;
            case "Allemagne":
                   raw = [{'location':'Allemagne', 'time': '5/26 am 11:30', 'imgUrl': 'http://tanned-allemagne.com/wp-content/uploads/2012/10/pano_rathaus_1280.jpg'}]
                    break;
            case "Espagne":
                   raw = [{'location':'Espagne', 'time': '5/27 pm 00:30', 'imgUrl': 'http://www.sejour-linguistique-lec.fr/wp-content/uploads/espagne-02.jpg'}]
                    break;
            case "Italie":
                   raw = [{'location':'Italie', 'time': '5/28 pm 1:30', 'imgUrl': 'http://retouralinnocence.com/wp-content/uploads/2013/05/Hotel-en-Italie-pour-les-Vacances2.jpg'}]
                    break;
            case "Russie":
                   raw = [{'location':'Russie', 'time': '5/29 pm 2:30', 'imgUrl': 'http://www.choisir-ma-destination.com/uploads/_large_russie-moscou2.jpg'}]
                    break;
            default:
                   raw = [{'location':'France', 'time': '5/24 am 9:30', 'imgUrl': 'http://www.telegraph.co.uk/travel/destination/article130148.ece/ALTERNATES/w620/parisguidetower.jpg'}]
                    break;

    }
    detail['contents'] = raw;
    res.end(JSON.stringify(detail));
});

server.get('/create_ubike_nTaipei', function(req, res, next) {

    request({
        url: "http://data.ntpc.gov.tw/api/v1/rest/datastore/382000000A-000352-001",
        encoding: 'utf8',
        method: "GET"
    }, function(err, req, body) {

        var foo,
            bar;
        // console.log(typeof(body));
        foo = JSON.parse(body);
        console.log(foo['result']['records'].length);
        bar = foo['result']['records'];

        dbUbike.ubike.remove({});

        bar.forEach(function(doc, index){
            console.log('insert'+ index);
            dbUbike.ubike.insert(doc);
        });
        // console.log(foo.ubike);
        res.end();
    });
});

/*var job1 = new cronJob('00 15 12 * * 1-7', function(){
    console.log('execute in every 13:18 pm from Monday to Sunday');
});

job1.start();*/

var job2 = new cronJob(config.autoUpdate, function () {
  console.log('开始执行定时更新任务');
  var update = spawn(process.execPath, [localPath.resolve(__dirname, 'update/all.js')]);
  update.stdout.pipe(process.stdout);
  update.stderr.pipe(process.stderr);
  update.on('close', function (code) {
    console.log('finish jobs，code=%d', code);
  });
  /*var special = spawn(process.execPath, [localPath.resolve(__dirname, 'update/special.js')]);
  special.stdout.pipe(process.stdout);
  special.stderr.pipe(process.stderr);
  special.on('close', function (code) {
    console.log('finish jobs，code=%d', code);
  });*/
});

job2.start();
 
server.listen(config.port, function () {
  console.log('%s listening at %s', server.name, server.url);
});

/*https_server.listen(443, function() {
    console.log('%s listening at %s', https_server.name, https_server.url);
});*/

process.on('uncaughtException', function (err) {
  console.error('uncaughtException: %s', err.stack);
})

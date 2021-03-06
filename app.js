var restify = require('restify');
var cheerio = require("cheerio");
var request = require("request");
var iconv = require('iconv-lite');
var mongojs = require('mongojs');
var BufferHelper = require('bufferhelper');
var cronJob = require('cron').CronJob;
var spawn = require('child_process').spawn;
var http = require('http');
var config = require('./config');
var Read = require('./web/read');
var Post = require('./web/post');
var Delelte = require('./web/delete');
var fs = require("fs");
var localPath = require('path');
var dbContact = mongojs('http://52.192.246.11/test', ['contact']);
var dbVideos = mongojs('http://52.192.246.11/test', ['videos']);
var dbIMDB = config.dbIMDB;
var dbUpComing = config.dbUpComing;
var dbRecord = config.dbRecord;
var dbToday = config.dbToday;
// var Special = require("./update/special");
var dbUbike = mongojs('http://52.192.246.11/test', ['ubike']);
var myapiToken = config.myapiToken;
var Trailer = require('./Trailer');
var Position = require('./update/position');
var Record = require('./update/record');
var Review = require('./update/review');
var Ptt = require('./update/ptt');
var upComing = require('./update/upcoming');
var Genre = require('./genre/genre');
var jpTrends = require('./trends/jpTrends');
var krTrends = require('./trends/krTrends');
var frTrends = require('./trends/frTrends');
var twTrends = require('./trends/twTrends');
var twMovies = require('./crawler/taiwanMovies');
var hkMovies = require('./crawler/honkongMovies');
var cnMovies = require('./crawler/chinaMovies');
var jpMovies = require('./crawler/japanMovies');
var krMovies = require('./crawler/koreaMovies');
var frMovies = require('./crawler/franceMovies');
var spMovies = require('./crawler/spainMovies');
var ukMovies = require('./crawler/unitedkingdomMovies');
var gmMovies = require('./crawler/germanyMovies');
var auMovies = require('./crawler/australiaMovies');
var tlMovies = require('./crawler/thailandMovies');
var idMovies = require('./crawler/indiaMovies');
var itMovies = require('./crawler/italiaMovies');
var plMovies = require('./crawler/polandMovies');
var usMovies = require('./crawler/usaMovies');
var usTrends = require('./trends/usTrends');
var cnTrends = require('./trends/cnTrends');
var gmTrends = require('./trends/gmTrends');
var cacheAccess = require('./memory_cache/redis');
var redis = require("redis");
var redisClient = redis.createClient();
var google = require('google');
var nextCounter = 0;

var server = restify.createServer({
  name: 'worldmovies',
  version: '1.0.0'
});

server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());

youTube = new config.YouTube;
youTube.setKey(config.YouTubeKey);

/*var https_options = {
    key: fs.readFileSync('./ssl/restify.pem'), //on current folder
    certificate: fs.readFileSync('./ssl/restifycert.pem')
};*/

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

server.del('/nyTimes/:fbId/:headline', Delelte.nyTimes);

server.del('/movies/:fbId/:title/', Delelte.movies);

server.post('/nyTimes/:fbId', Post.nyTimes);

server.post('/movies/:fbId', Post.movies);

server.get('/my_nyTimes/:fbId', Read.my_nyTimes);

server.get('/my_movies/:fbId', Read.my_movies);

server.get('/postPages', Read.postPages);

server.get('/ptt_movies', Read.ptt_movies);

server.get('/ptt_home', Read.ptt_home);

server.post('/register/:name/:fbId', Post.register);

server.get('/google', Read.google);

server.get('/upComing', Read.upComing);

server.get('/upcomingList', Read.upcomingList);

server.get('/explorePeople/:fbId', Read.explorePeople);

server.post('/follow/:followerId/:fbId', Post.follow);

server.del('/follow/:followerId/:fbId', Delelte.follow);

server.get('/social/:type/:fbId', Read.social);

server.get('/myapi', Read.myapi);

server.get('/imdb_records', Read.getRecords);

server.get('/imdbReview', Read.imdbReview);

server.get('/today', Read.getToday);

server.get('/genre', Read.getGenre);

server.get('/genre_topic', Read.getGenreTopic);

server.get('/world/:country/', Read.world);

server.get('/worldReview/:country', Read.worldReview);

server.get('/upcoming', Read.upcoming);

server.get('/imdb', Read.read);

server.get('/imdb_home', Read.imdb_home);

server.get('/imdb_title', Read.getTitle);

server.get('/imdb_position', Read.getPosition);

server.get('/jpTrends', Read.jpTrends);

server.get('/jpTrendsReview', Read.jpTrendsReview);

server.get('/krTrends', Read.krTrends);

server.get('/krTrendsReview', Read.krTrendsReview);

server.get('/twTrends', Read.twTrends);

server.get('/twTrendsReview', Read.twTrendsReview);

server.get('/cnTrends', Read.cnTrends);

server.get('/cnTrendsReview', Read.cnTrendsReview);

server.get('/frTrends', Read.frTrends);

server.get('/frTrendsReview', Read.frTrendsReview);

server.get('/usTrends', Read.usTrends);

server.get('/usTrendsReview', Read.usTrendsReview);

server.get('/usTrendsDirector', Read.usTrendsDirector);

server.get('/gmTrends', Read.gmTrends);

server.get('/gmTrendsReview', Read.gmTrendsReview);

server.get('/nyTimes', Read.nyTimes);

server.get('/nyTimes_home', Read.nyTimes_home);

server.get('/search/:channel/:input/:scrollId', Read.elasticSearch);

server.get('/gcm', Post.gcmTopic_t);

server.get('/access_refresh_token', Read.access_refresh_token);

server.get('/refresh_token', Read.refresh_token);

server.get('/youtube_search', function(req, res, next) {
    var movieTitle = req.query.title;

    dbIMDB.imdb.find({title: movieTitle}, function(err, item) {
        new Trailer(movieTitle, youTube, dbIMDB);
    });
    console.log('got trailerUrl reques');
    res.end();

    /*youTube.search(movieTitle, 2, function(error, result) {
      if (error) {
        console.log(error);
      }
      else {
        console.log(JSON.stringify(result, null, 2));
        res.end(JSON.stringify(result, null, 2));
      }
    });*/
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
        // var str = iconv.decode(new Buffer(body), "big5");
        console.log(body);
        var $ = cheerio.load(body);
        var result = [];
        var titles = $("li.item h2");
        var i;
        for (i=0;i<titles.length;i+=1) {
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
    bar.contant = foo;
    console.log(JSON.stringify(foo));
    res.writeHead(200, {"Content-Type": "text/html"});
    res.write("<html>");
    res.write("<head>");
    res.write("<meta charset=\"UTF-8\">");
    res.write("<title>Page</title>");
    res.write("</head>");
    res.end(JSON.stringify(bar));
});

function is_numeric(str) {
    return /^\d+$/.test(str);
}

var findposition = function(token) {
    if (token.indexOf('*') == -1) {
        if (token.indexOf('↓') == -1) {
            if (token.indexOf('↑') == -1) {
                return token.lastIndexOf('-');
            }
            else { return token.indexOf('↑');
            }
        } else { return token.indexOf('↓');
        }
    } else { return token.indexOf('*');
    }
};

server.get('/update_imdb_poster', function(req, res, next) {
    res.send('update poster @ ' + new Date());
    dbIMDB.imdb.find({'top':{$lte:parseInt(req.query.to), $gte:parseInt(req.query.from)}}).forEach(function(err, doc) {
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

/*server.get('/create_ubike_nTaipei', function(req, res, next) {

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
});*/

/*server.get('/special', function(req, res, next) {
    Special.special(req, res);
});*/

var job_recordUpdate = new cronJob(config.recordUpdate, function () {
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

var job_genreUpdate = new cronJob(config.genreUpdate, function() {
    //Genre.updateGenres('Animation');
    //Genre.updateGenres('Adventure');
    //Genre.updateGenres('Documentary');
    //Genre.updateGenres('Action');
    //Genre.updateGenres('Biography');
    //Genre.updateGenres('Crime');
    //Genre.updateGenres('Drama');
    //Genre.updateGenres('Family');
    //Genre.updateGenres('Fantasy');
    // Genre.updateGenres('Film-Noir');
    // Genre.updateGenres('History');
    // Genre.updateGenres('Horror');
    // Genre.updateGenres('Music');
    // Genre.updateGenres('Musical');
    // Genre.updateGenres('Mystery');
    // Genre.updateGenres('Romance');
    // Genre.updateGenres('Sci-Fi');
    // Genre.updateGenres('Sport');
    // Genre.updateGenres('Thriller');
    // Genre.updateGenres('War');
    Genre.updateGenres('Western');
});

var job_positionUpdate = new cronJob(config.positionUpdate, function() {
    Position.updatePosition();
});

var job_fullrecordUpdate = new cronJob(config.fullrecordUpdate, function() {
    Record.updateRecord();
});

var job_upcomingUpdate = new cronJob(config.upcomingUpdate, function() {
    upComing.updateupComing();
});

var job_reviewUpdate = new cronJob(config.reviewUpdate, function() {
    Review.updateReview();
});

var job_jpTrendsUpdate = new cronJob(config.jpTrendsUpdate, function() {
    jpTrends.updateTrends();
});

var job_krTrendsUpdate = new cronJob(config.krTrendsUpdate, function() {
    krTrends.updateTrends();
});

var job_frTrendsUpdate = new cronJob(config.frTrendsUpdate, function() {
    frTrends.updateTrends();
});

var job_twTrendsUpdate = new cronJob(config.twTrendsUpdate, function() {
    twTrends.updateTrends();
});

var job_usTrendsUpdate = new cronJob(config.usTrendsUpdate, function() {
    usTrends.updateTrends();
});

var job_cnTrendsUpdate = new cronJob(config.cnTrendsUpdate, function() {
    cnTrends.updateTrends();
});

var job_gmTrendsUpdate = new cronJob(config.gmTrendsUpdate, function() {
    gmTrends.updateTrends();
});

var job_pttPostUpdate = new cronJob(config.pttPostUpdate, function() {
    Ptt.updatePttPost(); //for ptt post indexing
});

var job_pttHomeUpdate = new cronJob(config.pttHomeUpdate, function() {
    cacheAccess.updatePttHome(redisClient, function(posts) {
      console.log('ptt_home update =========> ');
      if (!posts) {
          console.log("no posts");
      } else {
        console.log('update success!');
      } 
    });
});

var job_nyTimesHomeUpdate = new cronJob(config.nyTimesHomeUpdate, function() {
    cacheAccess.updateNyTimesHome(redisClient, function(movies) {
      console.log('nyTimes_home update =========> ');
      if (!movies) {
          console.log("no movies");
      } else {
        console.log('update success!');
      } 
    });
});

var job_worldMoviesScrape = new cronJob(config.worldMoviesScrape, function() {
    // twMovies.taiwanMovies();
    // hkMovies.honkongMovies();
    cnMovies.chinaMovies();
    // jpMovies.japanMovies();
    // krMovies.koreaMovies();
    // frMovies.franceMovies();
    // ukMovies.ukMovies();
    // gmMovies.germanyMovies();
    // auMovies.australiaMovies();
    //tlMovies.thailandMovies();
    // idMovies.indiaMovies();
    // itMovies.italiaMovies();
    // spMovies.spainMovies();
    // plMovies.polandMovies();
    // usMovies.usaMovies();
});

/*var job_twTrendsUpdate = new cronJob(config.recordUpdate, function () {
  console.log('开始执行定时更新任务');
  var update = spawn(process.execPath, [localPath.resolve(__dirname, 'trends/twTrends.js')]);
  update.stdout.pipe(process.stdout);
  update.stderr.pipe(process.stderr);
  update.on('close', function (code) {
    console.log('finish jobs，code=%d', code);
  });
});*/

job_recordUpdate.start();
job_positionUpdate.start();
job_fullrecordUpdate.start();
job_upcomingUpdate.start();
job_jpTrendsUpdate.start();
job_krTrendsUpdate.start();
job_frTrendsUpdate.start();
job_twTrendsUpdate.start();
job_usTrendsUpdate.start();
job_reviewUpdate.start();
job_genreUpdate.start();
job_cnTrendsUpdate.start();
job_gmTrendsUpdate.start();
job_worldMoviesScrape.start();
job_pttPostUpdate.start();
job_nyTimesHomeUpdate.start();
job_pttHomeUpdate.start();

require('events').EventEmitter.prototype._maxListeners = 100; 

exports.listen = function(port) {
    server.listen(port, function () {
      console.log('%s listening at %s', server.name, server.url);
    });
}

server.listen(config.port, function () {
  console.log('%s listening at %s', server.name, server.url);
});

/*https_server.listen(443, function() {
    console.log('%s listening at %s', https_server.name, https_server.url);
});*/

process.on('uncaughtException', function (err) {
  console.error('uncaughtException: %s', err.stack);
});

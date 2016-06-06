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
var fs = require("fs");
var localPath = require('path');
var dbContact = mongojs('http://52.192.246.11/test', ['contact']);
var dbVideos = mongojs('http://52.192.246.11/test', ['videos']);
var dbIMDB = config.dbIMDB;
var dbUpComing = config.dbUpComing;
var dbRecord = config.dbRecord;
var dbToday = config.dbToday;
var moment = require("moment");
// var Special = require("./update/special");
var dbUbike = mongojs('http://52.192.246.11/test', ['ubike']);
var myapiToken = config.myapiToken;
var Trailer = require('./Trailer');
var MovieInfomer = require('./MovieInfomer');
var Position = require('./update/position');
var Record = require('./update/record');
var upComing = require('./update/upcoming');
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

server.get('/google', Read.google);

server.get('/upComing', Read.upComing);

server.get('/monthList', Read.monthList);

server.get('/myapi', Read.myapi);

server.get('/imdb_records', Read.getRecords);

server.get('/today', Read.getToday);

server.get('/imdb', Read.read);

server.get('/imdb_title', Read.getTitle);

server.get('/imdb_position', Read.getPosition);

server.get('/update_imdbPosition', Read.updatePosition);

server.get('/gcm', Post.gcmTopic_t);

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

        /*for (var i = 0; i<250;i++) { 
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
        }*/
        console.log('title: ' + $(title[246]).text());
        dbIMDB.imdb.insert({
                'top': 247, 
                'title': $(title[246]).text(),
                'year': $(year[246]).text().slice(1,5),
                'posterUrl': poster[246]['attribs']['src'],
                'rating': $(rating[246]).text(),
                'description': title[246]['attribs']['title'],
                'detailUrl': imdb_baseUrl + detailUrl[246]['attribs']['href']
            });
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



server.get("/insert_record_title", function(req, res, next) {
    if (!req.query.to || !req.query.from)
        res.end('missing to or from params');
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

server.get('/update_imdb_readmore', function(req, res, next) {
    /*dbIMDB.imdb.find({'top': {$lte:250, $gte:1}}).forEach(function(err, doc) {
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
    });*/
    dbIMDB.imdb.find({'top': {$lte:247, $gte:247}}).forEach(function(err, doc) {
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
    dbIMDB.imdb.find({'title': req.query.title}, function(err, doc) {
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
    console.log("0512" + doc['detailUrl']);
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
                        /*doc['detailContent'] = {
                            "poster": poster,
                            "slate": slate,
                            "summery": summery,
                            "country": country
                        };*/
                        /*dbIMDB.imdb.update({'title':doc['title']}, doc);
                        var bar = $('.slate_wrapper .poster a')[0];
                        var path = 'http://www.imdb.com' + bar['attribs']['href'];
                        console.log(path);*/
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
                        /*foo['attribs']['src'];
                        dbIMDB.imdb.update({'title':doc['title']}, doc);*/

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
        console.log('missing title field');
    }
    
    res.end();
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

var job_positionUpdate = new cronJob(config.positionUpdate, function() {
    Position.updatePosition();
});

var job_fullrecordUpdate = new cronJob(config.fullrecordUpdate, function() {
    Record.updateRecord();
});

var job_upcomingUpdate = new cronJob(config.upcomingUpdate, function() {
    upComing.updateupComing();
});

job_recordUpdate.start();
job_positionUpdate.start();
job_fullrecordUpdate.start();
job_upcomingUpdate.start();
 
server.listen(config.port, function () {
  console.log('%s listening at %s', server.name, server.url);
});

/*https_server.listen(443, function() {
    console.log('%s listening at %s', https_server.name, https_server.url);
});*/

process.on('uncaughtException', function (err) {
  console.error('uncaughtException: %s', err.stack);
})

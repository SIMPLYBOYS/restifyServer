var restify = require('restify');
var mongojs = require('mongojs');
var cheerio = require("cheerio");
var request = require("request");
var iconv = require('iconv-lite');
var BufferHelper = require('bufferhelper');
var fs = require("fs");

var dbContact = mongojs('test', ['contact']);
var dbVideos = mongojs('test', ['videos']);
var dbIMDB = mongojs('test', ['imdb']);
var dbUbike = mongojs('test', ['ubike']);
 
var server = restify.createServer({
  name: 'myapp',
  version: '1.0.0'
});

server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());

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

var google = require('google');

google.resultsPerPage = 10;
var nextCounter = 0;

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
    }, function(err, response, body){
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

server.get('/create_imdb_detail', function(req, res, next) {
    res.send('Launch crawler @ ' + new Date());
    dbIMDB.imdb.find({'top':{$lte:parseInt(req.query.to), $gte:parseInt(req.query.from)}}).forEach(function(err, doc) {
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
                        country = $($country.find('a')[0]).text()
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
                }
                else {
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
    });
    res.end();
});

server.get('/imdb', function(req, res, next) {
    console.log('from: '+ req.query.from +'\n to: ' + req.query.to);
    dbIMDB.imdb.find({'top': {$lte:parseInt(req.query.to), $gte: parseInt(req.query.from)}}).sort({'top':parseInt(req.query.ascending)}, function(err, docs){
        var foo = {};
        foo['contents'] = docs;
        var missing = 0;
        for (var i=0; i<docs.length; i++) {
            console.log(docs[i]['readMore']['page']);
            // console.log(docs[i]['trailerUrl']);
            // console.log(docs[i]['detailContent']['slate']);
            if (typeof(docs[i]['gallery_full']) == 'undefined'){
                missing++;
                console.log(docs[i]['title'] + '\n' + docs[i]['top']);
            }
            // console.log(docs[i]['detailContent']['slate']);
        }
        console.log('missing: ' + missing);
        res.end(JSON.stringify(foo));
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
 
server.listen(3000, function () {
  console.log('%s listening at %s', server.name, server.url);
});

/*https_server.listen(443, function() {
    console.log('%s listening at %s', https_server.name, https_server.url);
});*/

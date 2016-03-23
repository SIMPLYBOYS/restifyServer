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
 
var server = restify.createServer({
  name: 'myapp',
  version: '1.0.0'
});

server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());
 
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

server.get("/crawler", function(req, res, next){
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

server.get("/create_imdb", function(req, res, next){
    request({
        url: "http://www.imdb.com/chart/top",
        encoding: "utf8",
        method: "GET"
    }, function(err, req, body){
        if (err || !body) { return; }

        var $ = cheerio.load(body);
        var poster = {},
            title = {},
            rating = {},
            year = {};

        poster = $('.lister-list tr .posterColumn img');
        title = $('.lister-list tr .titleColumn a');
        rating = $('.lister-list tr .imdbRating strong');
        year = $('.lister-list tr .titleColumn .secondaryInfo');


        for (var i = 0; i<250;i++){ 
            console.log(year);
            dbIMDB.imdb.insert({
                'top': i+1, 
                'title': $(title[i]).text(),
                'year': $(year[i]).text().slice(1,5),
                'posterUrl': poster[i]['attribs']['src'],
                'rating': $(rating[i]).text(),
                'description': title[i]['attribs']['title']
            });
        }

        /*dbIMDB.imdb.find(function(err, doc){
            console.log(doc);
        });*/
        
        res.end();
    });
});

server.get('/imdb', function(req, res, next){
    dbIMDB.imdb.find(function(err, docs){
        var foo = {};
        foo['imdb'] = docs;
        res.end(JSON.stringify(foo));
    });
});

server.get('/content/:id', function(req, res, next){
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
 
server.listen(3000, function () {
  console.log('%s listening at %s', server.name, server.url);
});

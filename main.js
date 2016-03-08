var restify = require('restify');
var mongojs = require('mongojs');

var db = mongojs('test', ['contact']);
 
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
    db.contact.find(function (err, contacts) {
        res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8'
        });
        console.log(contacts);
        res.end(JSON.stringify(contacts));
    });
    return next();
});
 
server.listen(3000, function () {
  console.log('%s listening at %s', server.name, server.url);
});
var http = require('http');
var cheerio = require('cheerio');
var util = require('util');
var request = require("request");
var EventEmitter = require('events').EventEmitter;
var STATUS_CODES = http.STATUS_CODES;
/*
 * Scraper Constructor
**/
function MovieInformer (title, apiToken, dbIMDB) {
    this.title = title;
    this.apiToken = apiToken;
    this.dbIMDB = dbIMDB;
    this.init();
}
/*
 * Make it an EventEmitter
**/
util.inherits(MovieInformer, EventEmitter);

/*
 * Initialize scraping
**/
MovieInformer.prototype.init = function () {
    var self = this;
    console.log('init MovieInformer!');
    self.on('finish', function (movieInfo) {
        // console.log(movieInfo);
        var info = JSON.parse(movieInfo);
            info = info[0];
        console.log(self.title);

        self.dbIMDB.imdb.update({'title': self.title}, {'$set': {'detailContent': {
              summery: info['simplePlot'],
              country: info['countries'],
              rated: info['rated']
          }}
        });
        self.dbIMDB.imdb.update({'title': self.title}, {'$set': {'plot': info['plot']
          }
        });
        self.dbIMDB.imdb.update({'title': self.title}, {'$set': {'genres': info['genres']
          }
        });
        self.dbIMDB.imdb.update({'title': self.title}, {'$set': {'metascore': info['metascore']
          }
        });
        self.dbIMDB.imdb.update({'title': self.title}, {'$set': {'rating': info['rating']
          }
        });
        self.dbIMDB.imdb.update({'title': self.title}, {'$set': {'votes': info['votes']
          }
        });
        self.dbIMDB.imdb.update({'title': self.title}, {'$set': {'runtime': info['runtime']
          }
        });
        self.dbIMDB.imdb.update({'title': self.title}, {'$set': {'directors': info['directors']
          }
        });
        self.dbIMDB.imdb.update({'title': self.title}, {'$set': {'writers': info['writers']
          }
        });
        self.dbIMDB.imdb.update({'title': self.title}, {'$set': {'idIMDB': info['idIMDB']
          }
        });
        self.dbIMDB.imdb.update({'title': self.title}, {'$set': {'releaseDate': parseInt(info['releaseDate'])
          }
        });
        self.dbIMDB.imdb.update({'title': self.title}, {'$set': {'year': 2016
          }
        });
    });
    self.findMovieInfo();
};

/*
 * Parse html and return an object
**/
MovieInformer.prototype.findMovieInfo = function () {
    var self = this;
    request({
        url: "http://api.myapifilms.com/imdb/idIMDB?title="+ self.title + "&token=" + self.apiToken,
        encoding: 'utf8',
        method: "GET"
    }, function(err, req, json) {
        if(err || !json) { return; }
        var movieInfo = JSON.parse(json),
            bar = movieInfo['data']['movies'];
            // console.log(json);

        self.emit('finish', JSON.stringify(bar));
    });
};

module.exports = MovieInformer;

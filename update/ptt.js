var config = require('../config');
var async = require('async');
var moment = require("moment");
var elastic = require('../search/elasticsearch');
var elasticClient = elastic.elasticClient;
var dbPtt = config.dbPtt;

exports.updatePttPost = function() {
    async.series([
        createIndex
    ],
    function (err) {
        if (err) console.error(err.stack);
          console.log('all jobs for ptt posts update finished!!');
    });
};

function createIndex(done) {
    var postObj = [];
    dbPtt.ptt.find({}, function(err, docs) {  
        docs.forEach(function(item, index) {
            postObj.push({
                title: item['title'],
                id: item['_id'],
                link: item['link'],
                author: item['autor'],
                date: item['date']
            });
        });
        console.log(postObj.length);
        var count = 0;
        async.whilst(
            function() { return count < postObj.length},
            function(callback) {
                console.log('count: ' + count);
                elasticClient.index({
                    index: 'test',
                    type: 'ptt',
                    id: postObj[count]['id'].toString(),
                    body: {
                      title: postObj[count]['title'],
                      link: postObj[count]['posterUrl'],
                      date: postObj[count]['description'],
                      author: postObj[count]['author']
                    }
                  }, function (error, response) {
                    console.log(error+'\n'+response);
                    if (!error) {
                        count++;
                        callback(null, count);
                    }
                  });
            },
            function(err, n) {
                console.log('ptt indexing finish ' + n);
                done(null);
            }
        );
    });
}


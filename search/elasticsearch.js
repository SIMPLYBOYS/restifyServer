var elasticsearch = require('elasticsearch');

var elasticClient = new elasticsearch.Client({
    host: 'localhost:9200',
    log: 'info'
});
exports.elasticClient = elasticClient;

function searchDocument(channel, input) {
    var type = 0,
        index = 'test',
        sort = [];

    switch (parseInt(channel)) {
       case 1:
          type = 'australia';
          break;
       case 2:
          type = 'china';
          break;
       case 3:
          type = 'france';
          break;
       case 4:
          type = 'germany';
          break;
       case 5:
          type = 'honkong';
          break;
       case 6:
          type = 'india';
          break;
       case 7:
          type = 'italia';
          break;
       case 8:
          type = 'japan';
          break;
       case 9:
          type = 'korea';
          break;
       case 10:
          type = 'poland';
          break;
       case 11:
          type = 'spain';
          break;
       case 12: 
          type = 'taiwan';
          break;
       case 13:
          type = 'thailand';
          break;
       case 15:
          type = 'uk';
          break;
       case 16: 
          type = 'ptt';
          index = 'ptt-test';
          sort.push({"date":{"order":"desc"}});
          sort.push("_score");
          break;
       default:
          type = 'imdb'
          break;
    }

    return elasticClient.search({
      index: index,
      type: type,
      scroll: '1m',
      size: 1000,
      body: {
        sort: sort,
        query: {
          multi_match: {
            query: {
                query: input,
                fuzziness: "AUTO",
                fields: ["title", "trailerTitle", "description", "originTitle"]
            }
          }
        }
      }
    });
}
exports.searchDocument = searchDocument;
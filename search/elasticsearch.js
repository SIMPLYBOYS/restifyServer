var elasticsearch = require('elasticsearch');

var elasticClient = new elasticsearch.Client({
    host: 'localhost:9200',
    log: 'info'
});
exports.elasticClient = elasticClient;

function searchDocument(channel, input) {
    var type = 0;

    switch (parseInt(channel)) {
       case 0:
          type = 'japan';
          break;
       case 1:
          type = 'usa';
          break;
       case 2: 
          type = 'taiwan';
          break;
       case 3:
          type = 'korea';
          break;
       case 4:
          type = 'france';
          break;
       case 5:
          type = 'china';
          break;
       case 6:
          type = 'australia';
          break;
       case 7:
          type = 'france';
          break;
       case 8:
          type = 'germany';
          break;
       case 9:
          type = 'hongkong';
          break;
       case 10:
          type = 'india';
          break;
       case 11:
          type = 'poland';
          break;
       case 12:
          type = 'spain';
          break;
       case 13:
          type = 'tailand';
          break;
      default:
          type = 'imdb'
          break;
    }

    return elasticClient.search({
      index: 'test',
      type: type,
      scroll: '10s',
      body: {
        query: {
          multi_match: {
            query: {
                query: input,
                fuzziness: "AUTO",
                fields: ["title", "trailerTitle", "description"]
            }
          }
        }
      }
    });
}
exports.searchDocument = searchDocument;
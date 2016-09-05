var elasticsearch = require('elasticsearch');

var elasticClient = new elasticsearch.Client({
    host: 'localhost:9200',
    log: 'info'
});
exports.elasticClient = elasticClient;

function searchDocument(channel, input) {
    var type = 0;

    switch (channel) {
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
var elasticsearch = require('elasticsearch');

var elasticClient = new elasticsearch.Client({
    host: 'localhost:9200',
    log: 'info'
});
exports.elasticClient = elasticClient;

function searchDocument(input) {
    return elasticClient.search({
      index: 'test',
      type: 'imdb',
      scroll: '10s',
      body: {
        query: {
          multi_match: {
            query: {
                query: input,
                fields: ["title", "description"],
                fuzziness: 2
            }
          }
        }
      }
    });
}
exports.searchDocument = searchDocument;
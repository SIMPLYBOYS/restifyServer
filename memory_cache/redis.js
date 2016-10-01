
exports.findImdbReviewsByTitleCached = function (dbReview, redis, title, start, end, callback) {
    console.log('findImdbReviewsByTitle Cached ' + title);
    redis.get(title.split(' ').join('_'), function (err, reply) {
        if (err)
        	callback(null);
        else if (reply) { //Reviews exists in cache
            var obj = JSON.parse(reply);
            obj['review'] = obj['review'].slice(start, end);
            console.log(obj['review'].length);
            callback(JSON.stringify(obj));
        } else {
            //Review doesn't exist in cache - we need to query the main database 
            dbReview.reviews.find({title: title}, {review:1, title:1}).limit(1,
              function(err, doc) {
                var review = JSON.stringify(doc);
                var cacheTitle = title.split(' ').join('_'); 
                var obj = {
                  title: doc[0]['title'],
                  byTitle: false,
                  review: doc[0]['review'],
                  size: doc[0]['review'].length
                };
                
                redis.set(cacheTitle, JSON.stringify(obj), function (err, replies) {
                	console.log('cache done ' + err);
                    if (!err) {
                        obj['review'] = obj['review'].slice(start, end);
                        callback(JSON.stringify(obj));
                    }
                });
            });
        }
    });
};


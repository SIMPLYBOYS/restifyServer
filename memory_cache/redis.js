
exports.findImdbReviewsByTitleCached = function (dbReview, redis, title, callback) {
    redis.get(title, function (err, reply) {
        if (err) 
        	callback(null);
        else if (reply) //Reviews exists in cache
        	callback(reply);
        else {
            //Review doesn't exist in cache - we need to query the main database
            dbReview.reviews.find({title: title}, {review:1, title:1}).limit(1,
			  function(err, doc) {
			    console.log(doc[0]['review'].length);
			    foo['title'] = doc[0]['title'];
			    foo['review'] = doc[0]['review'].slice(start,end);
			    foo['byTitle'] = false;
			    foo['size'] = doc[0]['review'].length;
			    var review = JSON.stringify(doc);
			    redis.set(title, review, function () {
                    callback(review);
                });
			});
        }
    });
};


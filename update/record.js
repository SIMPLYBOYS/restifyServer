var config = require('../config');
var dbIMDB = config.dbIMDB;
var Updater = require('../update/Updater');
var request = require("request");
var async = require('async');
var moment = require("moment");
var updateRecords = [];

exports.updateRecord = function() {
    async.series([
        function (done) {
            dbIMDB.imdb.find({'top': {$lte:250, $gte:1}}, function(err, docs) {
                docs.forEach(function(doc, top){
                    updateRecords.push({'title': doc['title'], 'position': doc['top']});
                });
                done(null);
            });
        },
        function (done) {
            // console.log(updateRecords);
            updateRecordWizard(done);
        }
    ],
    function (err) {
        if (err) console.error(err.stack);
          console.log('all finished!!');
    });
};

function updateRecordWizard(done) {

    if (!updateRecords.length) {
        done(null);
        return console.log('Done!!!!');
    }
    
    var item = updateRecords.pop();
    var record = true;
    var updater = new Updater(item.title.trim(), item.position, record);

    console.log('updatePositionWizard');
    console.log(item);
    console.log('Requests Left: ' + updateRecords.length);

    updater.on('error', function (error) {
      console.log(error);
      updateRecordWizard(done);
    });

    updater.on('complete', function (listing) {
        // console.log(listing);
        console.log(listing + ' got complete!');
        updateRecordWizard(done);
    });
}


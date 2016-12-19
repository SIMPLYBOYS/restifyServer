
var mongojs = require('mongojs');
var dbIMDB = mongojs('test', ['imdb']);
var dbJapan = mongojs('test', ['japan']);
var dbKorea = mongojs('test', ['korea']);
var dbTaiwan = mongojs('test', ['taiwan']);
var dbPtt = mongojs('test', ['ptt']);
var dbHonKong = mongojs('test', ['honkong']);
var dbUSA = mongojs('test', ['usa']);
var dbChina = mongojs('test', ['china']);
var dbFrance = mongojs('test', ['france']);
var dbUK = mongojs('test', ['uk']);
var dbGermany = mongojs('test', ['germany']);
var dbAustralia = mongojs('test', ['australia']);
var dbItalia = mongojs('test', ['italia']);
var dbSpain = mongojs('test', ['spain']);
var dbThailand = mongojs('test', ['thailand']);
var dbIndia = mongojs('test', ['india']);
var dbPoland = mongojs('test', ['poland']);
var dbUpComing = mongojs('test', ['upComing']);
var dbRecord = mongojs('test', ['records']);
var dbReview = mongojs('test', ['reviews']);
var dbPosition = mongojs('test', ['position']);
var dbToday = mongojs('test', ['today']);
var dbUser =  mongojs('test', ['user']);
var myapiToken = '632ce305-f516-4ccb-8f32-4e0fb1ad412a';
var YouTube = require('youtube-node');
var YouTubeKey = 'AIzaSyDgZtqmd4rI4SFjNUDWQz6sKFllAZf6sCg';
var GCMKey = 'AIzaSyDLw3K76tezq1sG91aKLefZvD8O-SzTbLo';
var TomatoKey = '9htuhtcb4ymusd73d4z6jxcj';
var nyTimesKey = '0167b3336c58445f8945af8a658ba811';
// var dbContact = mongojs('http://52.192.246.11/test', ['contact']);

exports.dbUser = dbUser;
exports.myapiToken = myapiToken;
exports.dbRecord = dbRecord;
exports.dbReview = dbReview;
exports.dbUpComing = dbUpComing;
exports.dbIMDB = dbIMDB;
exports.dbToday = dbToday;
exports.dbPosition = dbPosition;
exports.YouTube = YouTube;
exports.YouTubeKey = YouTubeKey;
exports.TomatoKey = TomatoKey;
exports.GCMKey = GCMKey;
exports.dbUSA = dbUSA;
exports.dbJapan = dbJapan;
exports.dbKorea = dbKorea;
exports.dbFrance = dbFrance;
exports.dbAustralia = dbAustralia;
exports.dbItalia = dbItalia;
exports.dbPoland = dbPoland;
exports.dbThailand = dbThailand;
exports.dbIndia = dbIndia;
exports.dbSpain = dbSpain;
exports.dbUK = dbUK;
exports.dbGermany = dbGermany;
exports.dbTaiwan = dbTaiwan;
exports.dbPtt = dbPtt;
exports.dbHonKong = dbHonKong;
exports.dbChina = dbChina;
exports.nyTimesKey = nyTimesKey;

/*var mysql = require('mysql');
exports.db = mysql.createConnection({
  host:            '127.0.0.1',   // 数据库地址
  port:            3306,          // 数据库端口
  database:        'sina_blog',   // 数据库名称
  user:            'root',        // 数据库用户
  password:        ''             // 数据库用户对应的密码
});*/

// Web服务器端口
exports.port = 80;

// update record
exports.genreUpdate = '45 21 22 * * *';

exports.recordUpdate = '35 10 7 * * *';

exports.positionUpdate = '5 15 7 * * *';

exports.reviewUpdate = '35 40 7 * * *';

exports.upcomingUpdate = '25 40 9 * * 1';

exports.fullrecordUpdate = '15 30 8 * * *';

exports.jpTrendsUpdate = '15 50 13 * * *';

exports.krTrendsUpdate = '25 30 10 * * *';

exports.frTrendsUpdate = '55 50 11 * * *';

exports.twTrendsUpdate = '25 1 22 * * *';

exports.usTrendsUpdate = '55 9 12 * * *';

exports.cnTrendsUpdate = '5 19 2 * * *';

exports.gmTrendsUpdate = '15 3 1 * * *';

exports.worldMoviesScrape = '55 59 2 * * *';

exports.pttPostUpdate = '15 3 5 * * *';


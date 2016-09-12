
var mongojs = require('mongojs');
var dbIMDB = mongojs('test', ['imdb']);
var dbJapan = mongojs('test', ['japan']);
var dbKorea = mongojs('test', ['korea']);
var dbTaiwan = mongojs('test', ['taiwan']);
var dbUSA = mongojs('test', ['usa']);
var dbChina = mongojs('test', ['china']);
var dbFrance = mongojs('test', ['france']);
var dbGermany = mongojs('test', ['germany']);
var dbUpComing = mongojs('test', ['upComing']);
var dbRecord = mongojs('test', ['records']);
var dbReview = mongojs('test', ['reviews']);
var dbPosition = mongojs('test', ['position']);
var dbToday = mongojs('test', ['today']);
var dbUser =  mongojs('test', ['user']);
var myapiToken = '632ce305-f516-4ccb-8f32-4e0fb1ad412a';
var YouTube = require('youtube-node');
var YouTubeKey = 'AIzaSyCpHbHblbj_6zfA1AeKsuaxB4ZuoTffVKw';
var GCMKey = 'AIzaSyCpHbHblbj_6zfA1AeKsuaxB4ZuoTffVKw';
var TomatoKey = '9htuhtcb4ymusd73d4z6jxcj';
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
exports.dbGermany = dbGermany;
exports.dbTaiwan = dbTaiwan;
exports.dbChina = dbChina;

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
exports.genreUpdate = '5 54 23 * * *';

exports.recordUpdate = '35 10 7 * * *';

exports.positionUpdate = '5 15 7 * * *';

exports.reviewUpdate = '35 40 7 * * *';

exports.upcomingUpdate = '25 40 9 * * 1';

exports.fullrecordUpdate = '15 30 8 * * *';

exports.jpTrendsUpdate = '15 50 13 * * *';

exports.krTrendsUpdate = '25 30 10 * * *';

exports.frTrendsUpdate = '55 50 11 * * *';

exports.twTrendsUpdate = '15 40 12 * * *';

exports.usTrendsUpdate = '5 58 18 * * *';

exports.cnTrendsUpdate = '5 19 2 * * *';

exports.gmTrendsUpdate = '15 3 1 * * *';


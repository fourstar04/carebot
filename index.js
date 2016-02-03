var Twit = require('twit');
var config = require('./config.json');
var _ = require('lodash');
var schedule = require('node-schedule');

var T = new Twit(config);

var screen_name = '_carebot';
var followerIds = [];
var friendIds = [];
var nonfollowerIds = [];
var recentlyRequestedIds = [];
var favoriteIds = [];

var getFollowerIds = function(callback) {
	T.get('followers/ids', { screen_name: screen_name },  function (err, data, response) {
	  if (err) console.log(err);
	  console.log('followers: '+data.ids.length);
	  callback(data.ids);
	});
};

var getFriendIds = function(callback) {
	T.get('friends/ids', { screen_name: screen_name },  function (err, data, response) {
	    if (err) console.log(err);
		console.log('friends: '+data.ids.length);
		callback(data.ids);
	});
};

var getNonfollowerIds = function() {
	return _.without(friendIds, followerIds);
};

var destroyFriendship = function(user_id){
	T.post('friendships/destroy', { user_id: user_id },  function (err, data, response) {
	  console.log('destroyed friendship with '+user_id);
	});
};

var destroyFriendshipsWithNonfollowers = function(callback) {
  	_.takeRight(nonfollowerIds, 10).map(function(user_id){
		destroyFriendship(user_id);
	});
	console.log('nonfollowers: '+nonfollowerIds.length);

	callback();
};

var getFriendsAndFollowers = function(callback){
	getFollowerIds(function(data){
		followerIds = data;

		getFriendIds(function(data){
			friendIds = data;

			nonfollowerIds = getNonfollowerIds();
			callback();
		});
	});
};
//
//  search twitter for all tweets containing the word 'banana' since Nov. 11, 2011
//
var followIds = function(user_ids) {
	user_ids.map(function(user_id) {
		if (friendIds.indexOf(user_id) < 0) {
			T.post('friendships/create', { user_id: user_id }, function(err, data, response) {
			  if (err) console.log(err);
			  if (!err) console.log("created friendship with "+user_id);
			});
		}
	});
};

var favoriteTweetsWithIds = function(ids) {
	ids.map(function(id) {
		if (favoriteIds.indexOf(id) < 0) T.post('favorites/create', { id: id }, function(err, data, response) {
		  if (err) console.log(err);
		  if (!err) { 
		  	console.log("favorited tweet "+id);
		  	favoriteIds.push(id);
		  }
		});
	});
};

var getStatuses = function(query, callback) {
	T.get('search/tweets', { q: query, count: 10, result_type: 'recent' }, function(err, data, response) {
	  callback(data.statuses.map(function(status){
	  	// console.log(JSON.stringify(data.statuses, null, 2));
	  	return { user_id: status.user.id, status_id: status.id_str, text: status.text };
	  }));
	});
};

var rule = new schedule.RecurrenceRule();
	rule.minute = new schedule.Range(0, 59, 15);

console.log("scheduling job");
var j = schedule.scheduleJob(rule, function(){

	main();
});

main(); 

function main() {
	getFriendsAndFollowers(function(){
		destroyFriendshipsWithNonfollowers(function() {
			console.log('yeah i did it');
		});

		getStatuses('i have flu', function(statuses){
			followIds(statuses.map(function(status){
				return status.user_id;
			}));
			favoriteTweetsWithIds(statuses.map(function(status){
				return status.status_id;
			}));
		});

		getStatuses('i hope you feel better :)', function(statuses){
			console.log(statuses.map(function(status){
				return status.text;
			}));
			favoriteTweetsWithIds(statuses.map(function(status){
				return status.status_id;
			}));
		});
	});
}
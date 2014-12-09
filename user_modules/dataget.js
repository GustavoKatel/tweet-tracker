var util = require('util'),
    twitter = require('twitter');
var twit = new twitter({
    consumer_key: 'CONSUMER_KEY',
    consumer_secret: 'CONSUER_SECRET',
    access_token_key: 'ACCESS_TOKEN_KEY',
    access_token_secret: 'ACCESS_TOKEN_SECRET'
});

var dataget = function(socket){
	this.socket = socket;
	this.socket.dg = this;

	var theObj = this;
	socket.on("disconnect", function(){
		theObj.stop();
		delete theObj;
	});

	this.running = true;
	this.tweetsCache = [];

	this.total = 0;
}

dataget.prototype._onData = function(data){
	this.total++;
	if(this.total>=500){
		this.running=false;
	}
	this.socket.emit("data", data);
}

dataget.prototype.stop = function() {
	this.running = false;
	console.log("stop!!!");
}

dataget.prototype.strip_tweet = function(tweet, extraValues) {

	// console.log("to strip: "+util.inspect(tweet));

	return tweet;

	var obj = {};
	obj["id_str"] = tweet["id_str"];
	obj["text"] = tweet["text"];
	obj["in_reply_to_status_id_str"] = tweet["in_reply_to_status_id_str"];

	obj["user"] = {};
	obj["user"]["id_str"] = tweet["user"]["id_str"];
	obj["user"]["name"] = tweet["user"]["name"];
	obj["user"]["screen_name"] = tweet["user"]["screen_name"];
	obj["user"]["profile_image_url"] = tweet["user"]["profile_image_url"];
	obj["user"]["followers_count"] = tweet["user"]["followers_count"];
	obj["user"]["friends_count"] = tweet["user"]["friends_count"];

	obj["retweet_count"] = tweet["retweet_count"];
	obj["favorite_count"] = tweet["favorite_count"];

	obj["user_mentions"] = tweet["user_mentions"];

	for(var k in extraValues) {
		obj[k] = extraValues[k];
	}

	return obj;
}

dataget.prototype._cacheAddTweet = function(tweet){
	// function cpyObj(obj){
	// 	var res = {};
	// 	for(var k in obj){
	// 		if(typeof(obj[k])=="object"){
	// 			res[k] = cpyObj(obj[k]);
	// 		} else {
	// 			res[k] = obj[k];
	// 		}
	// 	}
	// }
	// var obj = cpyObj(tweet);
	this.tweetsCache.push(tweet);
}

dataget.prototype._cacheGetTweet = function(id){
	
	for(var i=0;i<this.tweetsCache.length;i++){
		var tweet = this.tweetsCache[i];
		if(tweet["id_str"]==id)
		{
			return tweet;
		}
	}

	return false;
}

dataget.prototype._cacheExists = function(id){

	for(var i=0;i<this.tweetsCache.length;i++){
		var tweet = this.tweetsCache[i];
		if(tweet["id_str"]==id)
		{
			return true;
		}
	}

	return false;

}

dataget.prototype.getTweet = function(id, extraValues, callback){

	var theObj = this;

	var shouldGet = !this._cacheExists(id);
	var cacheTweet = null;
	if(!shouldGet) {
		cacheTweet = this._cacheGetTweet(id);
		callback(callback);
		return;
	}

	twit.get('/statuses/show/'+id+'.json', {include_entities:true}, function(data, twit_res) {

		var tweet = theObj.strip_tweet(data, extraValues);

		theObj._cacheAddTweet(tweet);

		callback(tweet);

	});
}

dataget.prototype._back = function(tweet, depth) {

	// check if is replying someone
	var reply_id = tweet["in_reply_to_status_id_str"];

	if(reply_id!="" && reply_id!=undefined && reply_id!=null) {
		this._track(reply_id, depth);
	}
}

dataget.prototype._track = function(id, depth) {

	// console.log("tracking: "+id);

	if(!this.running){
		console.log("stoping!");
		return;
	}

	theObj = this;
	this.getTweet(id, { "depth": depth }, function(tweet){
		// get the initial tweet
		theObj._onData(tweet);
		
		theObj._back(tweet, depth+1);
		// theObj._forward(tweet, depth+1, callback);

	});

}

dataget.prototype.track = function(id, depth) {
	this._track(id, depth);
}

dataget.prototype._trackQuery = function(query, depth) {

	if(!this.running) return;

	var theObj = this;
	twit.search(query, function(data, twit_res) {

		try {

			// console.log(data);
			var tweets = data["statuses"];
			console.log("trackQuery: First get: total: "+tweets.length);
			for(var i in tweets) {
				var tweet = tweets[i];
				// tweet["depth"] = depth;
				if(!theObj._cacheExists(tweet["id_str"])){
					theObj._cacheAddTweet(tweet);
				}
				theObj._onData(theObj.strip_tweet(tweet, { "depth": depth } ));
				// theObj._track(tweet["id_str"], depth+1);
				theObj._back(tweet, depth+1);
			}
			console.log(data["search_metadata"]);
			if(data["search_metadata"]) {
				var next_results_url = data["search_metadata"]["next_results"];
				if(next_results_url)
					theObj._trackQueryUrl(next_results_url, depth);
			}

		} catch(e) {
			console.log("_trackQuery: "+e.message);
		}

	});
}

dataget.prototype.trackQuery = function(query, depth) {

	if(!this.running) return;

	this._trackQuery(query, depth);

	// var theObj = this;
	// twit.stream("filter", { "track":query }, function(stream){
	// 	console.log(stream);
	// 	stream.on("data", function(tweet) {
	// 		console.log("data");
	// 		if(!theObj._cacheExists(tweet["id_str"])){
	// 			theObj._cacheAddTweet(tweet);
	// 		}
	// 		theObj._onData(theObj.strip_tweet(tweet, { "depth": depth } ));
	// 		// theObj._track(tweet["id_str"], depth+1);
	// 		theObj._back(tweet, depth+1);
	// 	});
	// });

}

dataget.prototype._trackQueryUrl = function(url, depth) {

	if(!this.running) return;

	var theObj = this;
	url = "https://api.twitter.com/1.1/search/tweets.json"+url;
	console.log("#1 url: "+url);
	twit.get(url, function(data, twit_res) {

		// console.log(data);
		var tweets = data["statuses"];
		for(var i in tweets) {
			var tweet = tweets[i];
			// tweet["depth"] = depth;
			if(!theObj._cacheExists(tweet["id_str"])){
				theObj._cacheAddTweet(tweet);
			}
			theObj._onData(theObj.strip_tweet(tweet, { "depth": depth } ));
			// theObj._track(tweet["id_str"], depth+1);
			theObj._back(tweet, depth+1);
		}
		// console.log(data["search_metadata"]);
		if(data["search_metadata"]) {
			var next_results_url = data["search_metadata"]["next_results"];
			if(next_results_url)
				theObj._trackQueryUrl(next_results_url);
		} else {
			console.log("no search_metadata");
		}
	});

}

module.exports = dataget;


var tgraph = undefined;
var socket = undefined;

function createGraph() {
	var width = $(window).width() - $("#sidebar").width()-150;
	var height = $(window).height();

	console.log("w: "+width+" h: "+height);

	if(tgraph) {
		$("#tgraph").html("");
		tgraph = null;
	}

	tgraph = new TGraph(width||960, height||500, "#tgraph", "#tooltip");
}

function ready() {

	createGraph();

	socket = io();

	socket.on("data", function(data){
		// console.log(data);
		tgraph.update([
			data
			]);
	});

	tgraph.update([]);
	// socket.emit("track/id", { "id":"539898142100303872", "depth":10 });
	// socket.emit("track/query", { "query":"@jovemnerd", "depth":0 });

	$("#but_search_query").on("click", function(){
		
		createGraph();

		var val = $("#query").val();
		if(!val || val=="") {
			alert("Required field!");
			$("#query").focus();
		} else {
			socket.emit("track/query", { "query":val+"+exclude:retweets", "depth":0 });
		}
	});

	$("#but_follow_tweet").on("click", function(){

		createGraph();

		var val = $("#tweet_url").val();
		
		var re = /https:\/\/twitter.com\/.*\/status\/(\d+)\/?/.exec(val);
		if(!re || re.length<=1 || re[1]==undefined || re[1]=="") {
			alert("Required field!");
			$("#tweet_url").focus();
		} else {
			var id = re[1];
			socket.emit("track/id", { "id":id, "depth":0 });
		}

	});

	$("#stop").on("click", function(){
		socket.emit("stop");
	});

}

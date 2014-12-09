
var TGraph = function(width, height, container_el, tooltip_container_el){

	this.width = width;
	this.height = height;
	this.root = d3.select(container_el);
	this.tooltip_root = d3.select(tooltip_container_el);

	this.normalize_ratio = 1;
	this.maxValue = 1;

	this.color = d3.scale.category20();

	this.force = d3.layout.force()
		.charge(-300)
		.linkDistance(30)
		.size([this.width, this.height]);

	this.svg = this.root.append("svg")
		.attr("width", this.width)
		.attr("height", this.height)
		.call(d3.behavior.zoom().on("zoom", this.zoom));

	this.gparent = this.svg.append("g");

	this.glinks = this.gparent.append("g");
	this.gnodes = this.gparent.append("g");

	this.dataset = {
		"nodes": [],
		"links": []
	}

	// match each tweet id to the index on dataset.nodes
	this.idmap = {};

}

TGraph.prototype.normalizePercent = function(value) {
	// return 5;
	return ( value / this.maxValue );
}

TGraph.prototype.calculateMaxValue = function() {
	var total = this.dataset.nodes.length;
	for(var i=0;i<total;i++) {
		var v = this.dataset.nodes[i].retweet_count;
		if(v>this.maxValue) this.maxValue = v;
	}
}

TGraph.prototype.recalculateNormalizeRatio = function() {
	var maxValue = 1;
	var total = this.dataset.nodes.length;
	for(var i=0;i<total;i++) {
		var v = this.dataset.nodes[i].retweet_count;
		if(v>maxValue) maxValue = v;
	}
	this.maxValue = maxValue;
	this.normalize_ratio = maxValue / 100;
}

TGraph.prototype.rebuildLinks = function(){
	this.dataset.links.splice(0, this.dataset.links.length);

	theObj = this;
	this.dataset.nodes.forEach(function(node){

		var reply_id = node["in_reply_to_status_id_str"];
		if(reply_id){
			theObj.dataset.links.push({
				"source": theObj.idmap[node["id_str"]],
				"target": theObj.idmap[reply_id],
				"value": 1
			});
		}
	});
}

TGraph.prototype.addNode = function(node) {

	var add = 0;
	this.dataset.nodes.every(function(nodei, index, array){
		if(node.id_str==nodei.id_str) {
			add = index;
			return false;
		}
		return true;
	});
	if(add==0) {
		var pos = this.dataset.nodes.length;
		this.dataset.nodes.push(node);
		this.idmap[node["id_str"]] = pos;
	} else {
		this.dataset.nodes[add] = node;
	}

	// this.recalculateNormalizeRatio();
	this.calculateMaxValue();

	var reply_id = node["in_reply_to_status_id_str"];
	if(reply_id) {
		if(!(reply_id in this.idmap)) {
			var pos = this.dataset.nodes.length;
			this.dataset.nodes.push({
				"id_str":reply_id,
				"text":"loading...",
				"user":{
					"name":"loading..."
				}
			});
			this.idmap[reply_id] = pos;
		}
		this.dataset.links.push({
			"source": this.idmap[node["id_str"]],
			"target": this.idmap[reply_id],
			"value": 1
		});
	}

}

TGraph.prototype.update = function(data){

	for(var i in data) {
		var newnode = data[i];
		this.addNode(newnode);
	}

	this.rebuildLinks();

	// this.force.nodes(this.dataset.nodes)
	// 	.links(this.dataset.links);

	var link = this.glinks.selectAll(".link")
		.data(this.dataset.links);

	link.enter().append("line")
		.attr("class", "link")
		// .attr("marker-end", function(d) { return "url(#arrow)"; })
		.style("stroke-width", function(d) { return Math.sqrt(d.value); });
	link.exit().remove();

	theObj = this;
	var node = this.gnodes.selectAll(".node")
		.data(this.dataset.nodes);
	node.enter().append("circle")
		.style("fill", function(d) {
			return theObj.color(1); // d.depth);
		})
		.attr("r", function(d){
			console.log("log: "+Math.log(d.retweet_count+1)+" rts: "+d.retweet_count);
			// var r = 5 + Math.max(10,
			// 		Math.min(0,
			// 		Math.log(
			// 		parseInt( (d.retweet_count||0) )
			// 		+1 )));
			// console.log("r: "+r);
			var r = 5 + 20*theObj.normalizePercent(d.retweet_count||0);
			d["r"] = r;
			return r;
		})
		.call(this.force.drag)
		.on("mouseover", function(d) {
			theObj.tooltip_root.transition()
				.duration(200)
				.style("opacity", .9)
				// .style("left", (d3.event.pageX) + "px")
				// .style("top", (d3.event.pageY - 28) + "px");

				theObj.tooltip_root.select(".tweet_name")
				.html(d.user.name);
	
				theObj.tooltip_root.select(".tweet_screen_name")
				.html("@"+d.user.screen_name);

				theObj.tooltip_root.select(".tweet_followers")
				.html("Followers: "+d.user.followers_count);

				theObj.tooltip_root.select(".tweet_following")
				.html("Following: "+d.user.friends_count);

				theObj.tooltip_root.select(".tweet_retweets")
				.html("Retweets: "+d.retweet_count);

				theObj.tooltip_root.select(".tweet_favorites")
				.html("Favorites: "+d.favorite_count);

				theObj.tooltip_root.select(".tweet_text")
				.html(d.text);

				theObj.tooltip_root.select("img")
				.attr("src", d["user"]["profile_image_url"]);
		})
		.on("mouseout", function(d) {
			theObj.tooltip_root.transition()
				.duration(500)
				.style("opacity", 0);
		})
		.on("click", function(d){
			window.open("http://www.twitter.com/"+d.screen_name+"/status/"+d.id_str);
		});

		node.append("title")
			.text(function(d) { return d.id_str; });
		node.exit().remove();
	
		node
		.attr("class", "node");

	this.force.on("tick", function() {
		link.attr("x1", function(d) { return d.source.x; })
			.attr("y1", function(d) { return d.source.y; })
			.attr("x2", function(d) { return d.target.x; })
			.attr("y2", function(d) { return d.target.y; });

		node.attr("cx", function(d) { return d.x; })
			.attr("cy", function(d) { return d.y; });
	});

	this.force.nodes(this.dataset.nodes)
		.links(this.dataset.links)
		.charge(-300)
		.linkDistance(30)
		.size([this.width, this.height])
		.start();


}

TGraph.prototype.zoom = function() {
	d3.select(this)
		.select("g")
		.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
}


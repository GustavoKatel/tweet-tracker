var express = require('express');
var app = express();
var path = require("path");
var server = require('http').Server(app);

var dataget = require("./user_modules/dataget.js");

// io
var io = require('socket.io')(server);

var socketMap = {};

app.use(express.static(path.join(__dirname, 'static')));

// app.use("/track", require("./routes/track.js"));

app.get('/', function (req, res) {
	res.sendfile('static/twitter_tracker_live.html');
})

var port = Number(process.env.PORT || 5000);

server.listen(port, function () {

	var host = server.address().address;
	var port = server.address().port;

	console.log('Twitter tracker app listening at http://%s:%s', host, port);

});

// io
io.on('connection', function(socket){
	console.log('a user connected');


	socket.on('track/id', function(params){
		var dg = new dataget(socket);
		dg.track(params.id, params.depth || 10);
	});

	socket.on('track/query', function(params){
		var dg = new dataget(socket);
		dg.trackQuery(params.query, params.depth || 10);
	});

	socket.on('stop', function(params){
		console.log("stop!!!");
		socket.dg.stop();
		delete socket.dg;
	});

	socket.on('disconnect', function(){
		//
	});

});

// server_data.listen(3000, function(){
//
// 	var host = server_data.address().address;
// 	var port = server_data.address().port;
//
// 	console.log('Data app listening at http://%s:%s', host, port);
// });

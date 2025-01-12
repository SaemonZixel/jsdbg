/* node.js */
var http = require('http');
var url = require('url');
// var query = require('query');
var fs = require('fs');

var PASSWORD = '123';

http.createServer(function (req, resp)
{
	console.log(req.method, req.url);

	if(req.method == 'OPTIONS') {
		resp.writeHead(200, {
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
			'Access-Control-Allow-Origin': req.headers['origin'],
			'Access-Control-Allow-Headers': 'Origin, Content-Type'
		});
		resp.end();
	}

	if(req.method == 'POST' && req.url.indexOf('password='+PASSWORD+'&') > -1)
	{
		var body = '';
		req.on('data', function(chunk) {
			body += chunk.toString();
		});
		req.on('end', function() {
			// console.log(body); // Тело POST запроса

			var STOR = req.url.match(/STOR=\/(.+)/);
			fs.writeFile(decodeURIComponent(STOR[1]), body, function(err){
				resp.writeHead(200, {
					'Content-Type': 'text/plain',
					'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
					'Access-Control-Allow-Origin': req.headers['origin'],
					'Access-Control-Allow-Headers': 'Origin, Content-Type'
				});
				if(err)
					resp.write('Error! '+err);
				else
					resp.write('OK! '+body.length);
				resp.end();
			});
		});
	}
}).listen(8080);

console.log('Listening *:8080');

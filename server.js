var http = require('http');
var fs = require('fs');
var path = require('path');
var mime = require('mime');
var chat_server = require('./lib/chat_server');

var cache = {};

const PORT = 5000;

/*
* Handles 404 Error Logic.
*/
function send404(response, msg) {
    response.writeHead(
        404,
        {'Content-Type': 'text/plain'}
    );
    response.write('ERROR 404: RESOURCE NOT FOUND.');
    response.write(msg);
    response.end();
}

/*
* Sends file content through response stream.
*/
function sendFile(response, filePath, fileContents) {
    response.writeHead(
        200,
        {'Content-Type': mime.getType(path.basename(filePath))}
    )
    response.end(fileContents);
}

/*
* serve static files.
*/
function serveStatic(response, cache, absPath) {
    if (!cache[absPath]) {
        if (fs.existsSync(absPath)) {
            fs.readFile(absPath, (err, data) => {
                if (err) {
                    send404(response, "Error Opening File"); 
                } else {
                    cache[absPath] = data;
                    sendFile(response, absPath, cache[absPath]);
                }
            });
        } else {
            send404(response, "File Not Found.");
        }
    } else {
        sendFile(response, absPath, cache[absPath]);
    }
}

var server = http.createServer((request, response) => {
    let filePath = request.url == '/' ? path.join('public', 'index.html'): path.join('public', request.url);
    let absPath = path.join(process.cwd(), filePath);
    serveStatic(response, cache, absPath);
});

server.listen((PORT) => {
    console.log(`Server started on port: ${PORT}`);
});

chat_server.listen(server);

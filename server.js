var http = require('http');
var fs = require('fs');
var axios = require('axios');
var path = require('path');
var mime = require('mime');
var chat_server = require('./lib/chat_server');

var cache = {};

const PORT = 5000;
const BASE_URL = "https://chatter-g.vercel.app/";

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

/*
* static files online
*/
async function serveStaticOnline(response, cache, absPath) {
    if (!cache[absPath]) {
        try {
            axios
                .get(absPath)
                .then(({data}) => {
                    cache[absPath] = data;
                    sendFile(response, absPath, cache[absPath]);
                });
        } catch {
            send404(response, 'Something Went Wrong!');
        }
    } else {
        sendFile(response, absPath, cache[absPath]);
    } 
}

var server = http.createServer((request, response) => {
    let filePath = request.url == '/' ? 'index.html' : request.url;
    let absPath = BASE_URL + filePath;
    serveStaticOnline(response, cache, absPath);
});

server.listen(PORT, () => {
    console.log(`Server started on port: ${PORT}`);
});

chat_server.listen(server);

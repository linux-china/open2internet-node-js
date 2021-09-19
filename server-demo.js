const http = require('http');
const open2internet = require("./src/index");

const server = http.createServer((req, res) => {
    res.writeHead(200, {
        "Content-Type": "text/plain"
    });
    res.end('Hello, World!');
});

server.listen(3000);
console.log("HTTP Server started on 3000");

// exposed to internet by open2internet
(function () {
    open2internet("http://localhost:3000").then(rsocket => {
        console.log("Connected with open2internet")
    });
})();


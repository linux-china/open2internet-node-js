open2internet Node.js client
=============================

Node.js npm to expose local Node.js app to internet by https://microservices.club/

# How to use?

* Install npm `npm install open2internet`
* Expose local http service to internet

```javascript
const open2internet = require("open2internet");

// exposed to internet by open2internet
(function () {
    open2internet("http://localhost:3000").then(rsocket => {
        console.log("Connected with open2internet")
    });
})();
```

# CLI

Use `open2internet 3000` on terminal.

# References

* https://microservices.club/
* Reactive Streams in JavaScript with RSocket Flowable: https://viglucci.io/reactive-streams-in-javascript-with-rsocket-flowable

#!/usr/bin/env node

const open2internet = require("../src/index");
const {program} = require('commander');

program.version('0.1.0');
program.description("Expose local http service to internet");
program
    .option('-d, --domain <string>', 'custom domain')
    .option('-t, --token <string>', 'access token')
    .argument('[http]', 'Local http port or url')
    .action((http, opts) => {
        if (http) {
            let localUrl = http;
            if (!isNaN(localUrl)) {
                localUrl = `http://127.0.0.1:${localUrl}`;
            } else if (!localUrl.startsWith("http://") && !localUrl.startsWith("https://")) {
                localUrl = `http://${localUrl}`;
            }
            open2internet(localUrl, opts).then(rsocket => {
                console.log("Connected with open2internet");
            });
        } else {
            program.help();
        }
    })
    .parse();

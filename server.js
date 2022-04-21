//Initial stuff  
const express = require('express')
const app = express()
const fs = require('fs')
const morgan = require('morgan')
const db = require("./database.js")
const minimist = require('minimist')
const args = min(process.argv.slice(2));

args['port'];
args['debug'];
args['log'];
args['help'];

const port = args.port || process.env.PORT || 5555;
const debug = (args.debug === 'true') && (args.debug != null)
const logger = (args.log === 'true') && (args.log != null)
const help = (`
server.js [options]

--port	Set the port number for the server to listen on. Must be an integer
            between 1 and 65535.

--debug	If set to true, creates endlpoints /app/log/access/ which returns
            a JSON access log from the database and /app/error which throws 
            an error with the message "Error test successful." Defaults to 
            false.

--log		If set to false, no log files are written. Defaults to true.
            Logs are always written to database.

--help	Return this message and exit.
`)
// If --help or -h, echo help text to STDOUT and exit
if (args.help || args.h) {
    console.log(help)
    process.exit(0)
}

//Start HTTP server on the indicated port
const server = app.listen(port, () => {
    console.log('App is running on %PORT%'.replace('%PORT%', port))
})

app.use((req, res, next) => {
    let logdata = {
        remoteaddr: req.ip,
        remoteuser: req.user,
        time: Date.now(),
        method: req.method,
        url: req.url,
        protocol: req.protocol,
        httpversion: req.httpVersion,
        secure: req.secure,
        status: res.statusCode,
        referer: req.headers['referer'],
        useragent: req.headers['user-agent']
    }
    const stmt = db.prepare('INSERT INTO accesslog (remoteaddr, remoteuser, time, method, url, protocol, httpversion, status, referer, useragent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const info = stmt.run(logData.remoteaddr, logData.remoteuser, logData.time, logData.method, logData.url, logData.protocol, logData.httpversion, logData.status, logData.referer, logData.useragent);
    next();
})

const WRITESTREAM = fs.createWriteStream('access.log', { flags: 'a' })
if (logger == true) {
    app.use(morgan('combined', { stream: WRITESTREAM }))
}

//Coin flip functions
function coinFlip() {
    if (Math.random() < 0.5) {
      return "heads";
    }
    else {
      return "tails";
    }
}

function coinFlips(flips) {
    var arr = [];
    for (let i = 0; i < flips; i++) {
        arr.push(coinFlip());
    }
    return arr;
}

function countFlips(array) {
    let h = 0;
    let t = 0;
    for (let i = 0; i < array.length; i++) {
      if (array[i] == "heads") {
        h++;
      }
      if (array[i] == "tails") {
        t++;
      }
    }
    return {
      tails: t,
      heads: h
    }
}

function flipACoin(call) {
    let result = "lose";
    let flipResult = coinFlip();
    if (call == flipResult) {
      result = "win";
    }
    return {
      call: call,
      flip: flipResult,
      result: result
    }
}

//Express endpoints
const successStatusCode = 200;
const successStatusMessage = "Good"

app.get('/app/', (req, res) => {
    res.status(successStatusCode).end(successStatusCode + ' ' + successStatusMessage );
    res.type("text/plain");
})

app.get('/app/flip/', (req, res) => {
    res.status(successStatusCode).json({ "flip" : coinFlip()});
})

app.get('/app/flips/:number([0-9]{1,3})', (req, res) =>{
    const arrayOfFlips = coinFlips(req.params.number);
    const counted = countFlips(arrayOfFlips)
    res.status(successStatusCode).json({"raw": arrayOfFlips, "summary": counted});
})

app.get('/app/flip/call/:guess(heads|tails)/', (req, res) =>{
    res.status(successStatusCode).json(flipACoin(req.params.guess));
})

app.use(function(req, res){
    res.status(404).end(404 + ' ' + "Error not found");
    res.type("text/plain");
})

//New Endpoints
app.get('/app/log/access', (res, req) => {
    if (debug == true) {
        res.status(200).json(db.prepare('SELECT * FROM accesslog').all())
    }
    else {
        res.status(404).type("text/plain").send('Error not found')
    }
})

app.get('/app/error', (res, req) => {
    if (debug == true) {
        throw new Error("Error")
    }
    else {
        res.status(404).type("text/plain").send('404 NOT FOUND')
    }
})
// Place your server entry point code here
const express = require('express')
const morgan = require('morgan')
const minimist = require('minimist')
const app = express()
const fs = require('fs')
const db = require("./src/services/database.js")
const res = require('express/lib/response')

const args = minimist(process.argv.slice(2))
args["help", "port", "debug", "log"]

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

if (args.help || args.h) {
    console.log(help)
    process.exit(0)
}

// port default to 5555
const port = args.port || process.env.PORT || 5555;
const debug = (args.debug == "true");
const log = (args.log != "false");

app.use(express.json())
app.use(express.static('./public'));
app.use(express.urlencoded({ extended: true }))

const server = app.listen(port, () => {
    console.log('App is running on port %PORT%'.replace('%PORT%', port))
})

//Log user interaction to database
if (log == true) {
    const WRITESTREAM = fs.createWriteStream('access.log', { flags: 'a' });
    app.use(morgan('combined', { stream: WRITESTREAM }));
}

app.use((req, res, next) => {
    let logData = {
        remoteaddr: req.ip,
        remoteuser: req.user,
        time: Date.now(),
        method: req.method,
        url: req.url,
        protocol: req.protocol,
        httpversion: req.httpVersion,
        status: res.statusCode,
        referer: req.headers['referer'],
        useragent: req.headers['user-agent']
    }
    const stmt = db.prepare('INSERT INTO accesslog (remoteaddr, remoteuser, time, method, url, protocol, httpversion, status, referer, useragent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const info = stmt.run(logData.remoteaddr, logData.remoteuser, logData.time, logData.method, logData.url, logData.protocol, logData.httpversion, logData.status, logData.referer, logData.useragent);
    next();
})

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

// Endpoints

if (!debug) {
    app.get("/app/log/access", (req, res) => {
        try {
            const stmt = db.prepare('SELECT * FROM accesslog').all()
            res.status(200).json(stmt)
        } catch(e) {
            console.error(e)
        }
    })
    app.get("/app/error", (req, res) => {
        throw new Error('Error')
    })
}

app.get('/app/', (req, res) => {
    res.status(200).end(200 + ' ' + "Good" );
    res.type("text/plain");
})

app.get('/app/flip/', (req, res) => {
    res.status(200).json({ "flip" : coinFlip()});
})

app.get('/app/flips/:number([0-9]{1,3})', (req, res) =>{
    const arrayOfFlips = coinFlips(req.params.number);
    const counted = countFlips(arrayOfFlips)
    res.status(200).json({"raw": arrayOfFlips, "summary": counted});
})

app.post('/app/flip/coins/', (req, res, next) => {
    const flips = coinFlips(req.body.number)
    const count = countFlips(flips)
    res.status(200).json({"raw":flips,"summary":count})
})

app.get('/app/flip/call/:guess(heads|tails)/', (req, res) =>{
    res.status(200).json(flipACoin(req.params.guess));
})

app.post('/app/flip/call/', (req, res, next) => {
    res.status(200).json(flipACoin(req.body.guess));
})

app.use(function(req, res){
    res.status(404).end(404 + ' ' + "Error not found");
    res.type("text/plain");
})
//Initial stuff
const express = require("express");
const min = require('minimist');
const app = express();
const args = min(process.argv.slice(2));
args["port"];
args["debug"];
args["log"];
args["help"];
const port = args.port || process.env.PORT || 5555;
const debug = ((args.debug === 'true') && (args.debug != null))|| process.env.PORT || false;
const logger = ((args.log === 'true') && (args.log != null))|| process.env.PORT || true;
const help = args.help;
//console.log(debug)
//console.log(logger)
if (help == true) {
    console.log("server.js [options]")
    console.log("  --port	Set the port number for the server to listen on. Must be an integerbetween 1 and 65535.");
    console.log('  --debug	If set to `true`, creates endlpoints /app/log/access/ which returns a JSON access log from the database and /app/error which throws an error with the message "Error test successful." Defaults to `false`.')
    console.log('  --log		If set to false, no log files are written. Defaults to true. Logs are always written to database.')
    console.log('  --help	Return this message and exit.')
    process.exit(1)
}

//Start HTTP server on the indicated port
const server = app.listen(port, () => {
    console.log('App is running on %PORT%'.replace('%PORT%', port))
})

app.use((req, res, next) => {
    let logdata = {
        remoteaddr: req.ip,
        remoteuser: req.user,
        time: Date.now().toString(),
        method: req.method,
        url: req.url,
        protocol: req.protocol,
        httpversion: req.httpVersion,
        secure: req.secure,
        status: res.statusCode,
        referer: req.headers['referer'],
        useragent: req.headers['user-agent']
    }
    const stmt = db.prepare('INSERT INTO accesslog (remoteaddr, remoteuser, time, method, url,  protocol, httpversion, secure, status, referer, useragent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    const info = stmt.run(logdata.remoteaddr.toString(), logdata.remoteuser, logdata.time, logdata.method.toString(), logdata.url.toString(), logdata.protocol.toString(), logdata.httpversion.toString(), logdata.secure.toString(), logdata.status.toString(), logdata.referer, logdata.useragent.toString())
    next()
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
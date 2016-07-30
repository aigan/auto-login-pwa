var
expressM = require('express'),
bodyParser = require('body-parser'),
multer  = require('multer'),
httpM = require('http'),
ioM = require('socket.io')
;

var app = expressM();
var upload = multer();
var server = httpM.createServer(app);
var io = ioM(server);

app.use(bodyParser.urlencoded({ extended: true}));


app.get('/app1', function (req, res) {
    res.send('App1: Hello World!');
});

app.post('/app1/welcome', upload.array(), function (req, res, next) {
//    console.log(req.rawBody);
    console.log("In POST to welcome");
    console.log(JSON.stringify( req.body ));
    res.send('App1: Welcome!');
});

server.listen(3000, function () {
    console.log('ALP listening on port 3000');
});

console.log("Starting up");

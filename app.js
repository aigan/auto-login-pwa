var express = require('express'),
    bodyParser = require('body-parser'),
    multer  = require('multer');

var app = express();
var upload = multer();

//app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true}));



app.get('/', function (req, res) {
    res.send('Hello World!');
});

app.get('/app1', function (req, res) {
    res.send('App1: Hello World!');
});

app.post('/app1/welcome', upload.array(), function (req, res, next) {
//    console.log(req.rawBody);
    console.log("In POST to welcome");
    console.log(JSON.stringify( req.body ));
    res.send('App1: Welcome!');
});

app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});

const
expressM = require('express'),
bodyParser = require('body-parser'),
multer  = require('multer'),
httpM = require('http'),
ioM = require('socket.io'),
conf = require('./serverconf')
;

const app = expressM();
const upload = multer();
const server = httpM.createServer(app);
const io = ioM(server);

app.use(bodyParser.urlencoded({ extended: true}));


const base = conf.server.root;
app.get(base, function (req, res) {
    res.send('ALP: Hello World!');
});

app.post(base+'/welcome', upload.array(), function (req, res, next) {
//    console.log(req.rawBody);
    console.log("In POST to welcome");
    console.log(JSON.stringify( req.body ));
    res.send('ALP: Welcome!');
});

server.listen(3000, function () {
    console.log('ALP listening on port 3000');
});


io.on('connection', function (socket) {

	var connected =	 io.of('/').connected;
	var connLen = Object.keys(connected).length;
	console.log('Connected %s: %s sockets', socket.id, connLen);

	socket.on('disconnect', function(){
		var connected =	 io.of('/').connected;
		var connLen = Object.keys(connected).length;
		console.log('Closed    %s: %s sockets', socket.id, connLen);
	});
	
  socket.on('hello', function (data, fn) {
    console.log("GOT HELLO");
		fn("Nice to see you");
  });
});

console.log("Starting up");

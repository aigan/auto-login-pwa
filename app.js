const
expressM = require('express'),
bodyParser = require('body-parser'),
multer  = require('multer'),
httpM = require('http'),
ioM = require('socket.io'),
googleIdTokenVerifier = require('google-id-token-verifier'),
confServer = require('./serverconf')
;
require('./public/config.js'); // sets GLOBAL.config

const app = expressM();
const upload = multer();
const server = httpM.createServer(app);
const io = ioM(server);
const log = console.log.bind(console);

app.use(bodyParser.urlencoded({ extended: true}));


const sessions = {}; // browserSession (across tabs)

const base = confServer.server.root;
app.get(base, function (req, res) {
    res.send('ALP: Hello World!');
});

app.post(base+'/welcome', upload.array(), function (req, res, next) {
//    log(req.rawBody);
    log("In POST to welcome");
  log(JSON.stringify( req.body ));
//	log(req.headers);
    res.send('ALP: Welcome!');
});

server.listen(3000, function () {
    log('ALP listening on port 3000');
});


io.on('connection', function (socket) {

	var connected =	 io.of('/').connected;
	var connLen = Object.keys(connected).length;
	log('Connected %s: %s sockets', socket.id, connLen);

	socket.on('disconnect', function(){
		var connected =	 io.of('/').connected;
		var connLen = Object.keys(connected).length;
		log('Closed    %s: %s sockets', socket.id, connLen);
	});
	
  socket.on('hello', function(proof, fn) {
    log("GOT HELLO");
		const session = setSession( socket.handshake, proof );

		if(!session) return fn({error:'failed'});
		
		const response = { sidBrowser: session.sidBrowser };
		if(!proof.accessToken)
			response.accessToken = session.accessToken;
//		log(session);
		fn(response);
  });

	socket.on('authenticate', function(proof, fn) {
		log('GOT AUTHENTICATE');
		log(proof);

		if( proof.credUsed == 'google'){
			googleIdTokenVerifier.verify(proof.idtoken, config.google.client_id, function(err, tokenInfo){
				if( err ){
					log("Got google token verification error");
					log( err.message );
					if( err.message == 'Expired idToken' ) return fn({error:'expired'});
					return fn({error:'invalid'});
				}

				log("Google token info");
				//log(tokenInfo);

				const session = getSession( socket.handshake );
				session.credUsed = 'google';
				session.credId = tokenInfo.sub;
				log( session );
			});
		}
	});

});

function setSession( hs, proof ){
	const sid = proof.sidBrowser;
	if(!sid) return null;
		
	log(proof);

	if( sessions[sid] ) {
		if( proof.accessToken !== sessions[sid].accessToken ){
			log("Access token mismatch");
			return null;
		}
	} else {
		// Ignore provided accessToken if we do not remember the session
		delete proof.accessToken;

		sessions[sid] = {
			date: Date.now(),
			sidBrowser: sid,
			accessToken: uuid(),
		};
	}

	const session = sessions[sid];

	//// Update session with stuff...
	//session.ip = hs.headers['x-forwarded-for'] || hs.address;
	//session.host = hs.headers.host;
	//session.credId = proof.credId;
	//session.credUsed = proof.credUsed;

	hs.sidTab = proof.sidTab;
	hs.sidBrowser = sid;
	//log(hs);

	
	return session;
}

function getSession( hs ){
	return sessions[hs.sidBrowser];
}

function uuid(){
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
		return v.toString(16);
	});
}

log("Starting up");

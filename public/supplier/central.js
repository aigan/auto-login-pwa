"use strict";
log('central.js');
{

	const c = alp.supplier.central;
	const state = alp.state;

	c.exec = function(resolve,reject) {
		scriptP(config.vendor+"/socket.io/socket.io.js").then(_=>{
			c.ready = true;
			log("socket.io loaded");
			
			var socket = io(); // Connect to same server
			socket.emit('hello', { my: 'data' }, function(res){
				log("************ CONNECTED");
				resolve(); // promise resolved
			});

			//window.onbeforeunload = function(e) {
			//	socket.close();
			//};
		});
	};
}
log("central.js init");


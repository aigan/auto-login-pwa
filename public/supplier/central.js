"use strict";
log('central.js');
(function(){

	const c = alp.supplier.central;
	const state = alp.state;

	c.exec = function(resolve,reject) {
		scriptP(config.vendor+"/socket.io/socket.io.js").then(_=>{
			c.ready = true;
			log("socket.io loaded");

			const sidTab = getTabSessionId();
			const sidBrowser = getBrowserSessionId();
			const accessToken = getAccessToken();
			const u = alp.state.u;
			
			var socket = io(); // Connect to same server
			socket.emit('hello', {
				sidTab: sidTab,
				sidBrowser: sidBrowser,
				accessToken: accessToken,
				credId: u.cred_id,
				credUsed: u.cred_used,
			}, function(res){
				log("************ CONNECTED");
				log(res);

				if( res.accessToken )
					setAccessToken( res.accessToken );
				
				resolve(); // promise resolved
			});

			//window.onbeforeunload = function(e) {
			//	socket.close();
			//};
		});
	};

	function getTabSessionId() {
		const ss = window.sessionStorage;
		var sid = ss.getItem('alp-sid-tab');
		if(!sid || sid.length < 36 ){
			sid = uuid();
			ss.setItem('alp-sid-tab', sid);
		}
		return sid;
	}

	function getBrowserSessionId() {
		const ss = window.localStorage;
		var sid = ss.getItem('alp-sid-browser');
		if(!sid || sid.length < 36 ){
			sid = uuid();
			ss.setItem('alp-sid-browser', sid);
		}
		return sid;
	}

	function getAccessToken() {
		const ss = window.localStorage;
		return ss.getItem('alp-access-token');
	}

	function setAccessToken( token ) {
		const ss = window.localStorage;
		return ss.setItem('alp-access-token', token);
	}

	function uuid(){
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
			return v.toString(16);
		});
	}
	
})();

log("central.js init");


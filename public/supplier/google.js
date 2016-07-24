"use strict";
log('google.js');

var g = s.google;
var gu = u.s.google;

g.exec = function(resolve,reject) {
	loadScriptAsync("//apis.google.com/js/platform.js", function(){
		gapi.load('auth2', function() {
			config_promise.then(c=>{
				c.google.fetch_basic_profile = false;

				// Ask for as little as possible. But we really could
				// need the gmail address for credentials api
				//auto-login. We'll ask for email later.

				c.google.scope = 'openid';
				gapi.auth2.init(c.google).then(function() {
					log("Google login init done");
					g.ready = true;
					drawLoginWidget();
					resolve(); // promise resolved
				});
			});
		});
	});
};

g.login = function( store_cred ) {
	log("Trying to login with Google");
	var auth2 = gapi.auth2.getAuthInstance();
	//		 log( auth2 );
	if( auth2.isSignedIn.get() ) {
		//				 g_user_info();
		//				 notifyStatus("Revoking all from Google");
		//				 auth2.disconnect();
		//				 log('Already signed in with Google');
		g.onLoginSuccess();
	} else {
		notifyStatus("Signing in with Google");
		// Se https://developers.google.com/identity/protocols/googlescopes
		auth2.signIn({
			prompt:'select_account'
			// prompt only activated if explicitly signed out
		}).then(s => g.onLoginSuccess(store_cred), f=>{
			log("Failed");
			notifyStatus("You denied access to Google login");
		});
	}
}

g.onLoginSuccess = function(store_cred) {
	log("Signed in");
	notifyStatus("Signed in with Google");

	var auth2 = gapi.auth2.getAuthInstance();
	var g_user = auth2.currentUser.get();

	u.loggedin = true;
	u.id = g_user.getId();
	u.cred_used = 'google';
	userUpdate();

	if(!!navigator.credentials && store_cred) {
		// Create `Credential` object for federation
		var cred = new FederatedCredential({
			id:				u.id,
			name:			'Testsson',
			//						 iconURL:	 profile.imageUrl || DEFAULT_IMG,
			provider: 'google'
		});
		navigator.credentials.store(cred);
	}

	onLogin();
}

g.getUserinfo = function() {
	log("gapi load client");
	gapi.load('client', function(){
		log("Client loaded");
		gapi.client.load('oauth2', 'v2', function(){
			log("Client oauth2 loaded");
			gapi.client.oauth2.userinfo.get().execute(function(resp) {
				log("Oauth2 response");
				log(resp);
			});
		});

	});
}







log("End of google init");


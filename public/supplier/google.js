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

g.navcredLogin = function( cred, by_click ) {
	log("Trying Google login");
	// Se https://developers.google.com/identity/protocols/googlescopes
	s.google.then(function(){
		// Federated login using Google Sign-In	 
		var auth2 = gapi.auth2.getAuthInstance();

		// In Google Sign-In library, you can specify an account.	 
		// Attempt to sign in with by using `login_hint`.
		log("Doing Google login");
		if( auth2.isSignedIn.get() ) {
			log("Already logged in");
			s.google.onLoginSuccess();
		} else if( cred.email || by_click ) {
			// browser will block popup
			// must specify gmail as login_hint
			auth2.signIn({	
				//	login_hint: cred.id || ''
			}).then(function(profile) {
				log("Google Login success");
				s.google.onLoginSuccess();
			}, function(f){
				log("Failed");
				notifyStatus("You denied access to Google login");
			});
		} else {
			// Can't avoid popup block. Pretend all is ok
			// and present a login button
			
			notifyStatus("Hello again");
			u.cred_used = 'google';
			drawLoginWidget();
		}
	});
}

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

g.onUserUpdated = function() {
	var pre = query('.user-info .google');
	var c = "Google:";
	var auth2 = gapi.auth2.getAuthInstance();
	var g_user = auth2.currentUser.get();

	var online = g_user.isSignedIn();
	if( online )
		c += "\nonline";
	else
		c += "\noffline";
	c += "\nGoogleUser id: "+g_user.getId();

	var scopes = g_user.getGrantedScopes();
	if( scopes ) {
		c += "\nScopes";
		for(let scope of scopes.split(' ') ){
			c+= "\n + "+scope.match(/[^\/]+$/);
		}
		//								 c += "\n"+scopes;
	}

	var has_email = ( g_user.hasGrantedScopes('https://www.googleapis.com/auth/userinfo.email') || g_user.hasGrantedScopes('userinfo.email') );

	if( has_email ) {
		//								 get_email.then(e=>{ c += "\nEmail: "+e });
	}
	
	
	var g_profile= g_user.getBasicProfile();
	if( g_profile ) {
		c += "\nProfile";
		c += "\n	name: "+ g_profile.getName();
		c += "\n	given name: "+ g_profile.getGivenName();
		c += "\n	family name: "+ g_profile.getFamilyName();
		//								 c += "\n	 image url: "+ g_profile.getImageUrl();
		c += "\n	email: "+ g_profile.getEmail();
	} else {
		// google_get_userinfo.then(i=>{ c += "\nInfo: "+i });
		s.google.getUserinfo();
	}

	var auth = g_user.getAuthResponse();
	if( auth && online ) {
		c += "\nIssued at "+new Date(auth.first_issued_at);
		c += "\nExpires at "+new Date(auth.expires_at);
		c += "\nExpires in "+Math.round(auth.expires_in/60)+" minutes";
		
		c += "\n"+JSON.stringify(auth);
		//								 c += "\nProfile name: "+ g_profile.getName();
	}

	
	pre.innerHTML = c +"\n\n";

	if( online ) {
		var t_revoke = document.createElement('button');
		t_revoke.innerHTML = "Revoke";
		t_revoke.onclick = function(){
			g_user.disconnect().then( onUserUpdated );
		};
		pre.appendChild(t_revoke);

		
		var t_email = document.createElement('button');
		t_email.innerHTML = "Google email";
		t_email.onclick = function(){
			g_user.grant({scope:'email'}).then(s=>{
				onUserUpdated();
			}, f=>{
				log("Failed");
				notifyStatus("I thought you liked me...");
			});
		}
		pre.appendChild(t_email);
	}

	// Se https://developers.google.com/identity/protocols/googlescopes
	if( !online ) {
		var t_login = document.createElement('button');
		t_login.innerHTML = "Login";
		t_login.onclick = function(){
			auth2.signIn({
				scope: 'openid',
				login_hint: 'jonas.liljegren@gmail.com',
			}).then(s => {
				notifyStatus("Added email access");
				s.google.onLoginSuccess(1);
			}, f=>{
				log("Failed");
				notifyStatus("You denied access to Google login");
			});
		};
		pre.appendChild(t_login);
	}
}



log("google.js init");


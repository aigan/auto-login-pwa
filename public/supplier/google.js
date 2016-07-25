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
		} else if( by_click ) {
			// browser will block popup
			// must specify gmail as login_hint
			log("SIGNIN without hint");
			auth2.signIn({
				//	login_hint: cred.id || ''
			}).then(function(profile) {
				s.google.onLoginSuccess();
			}, function(f){
				log("Failed");
				notifyStatus("You denied access to Google login");
			});
		}
		else {
			// Can't avoid popup block. Pretend all is ok
			// and present a login button

			// But the login button must directly call auth2.signIn()
			// without using callback, in order to avoid popup block.

			// Best would be to just use the stored info and only ask for
			// re-login then actually needed, directly on user interaction.
			
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
		log("SIGNIN with account prompt");
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

	g.getUserinfo().then( p => {
		var uid = p.email || g_user.getId();
		var name = p.name;
		var image = p.picture;
		
		u.loggedin = true;
		u.id = uid;
		u.cred_used = 'google';
		userUpdate();

		if(!!navigator.credentials && store_cred ) {
			// Create `Credential` object for federation
			var cred = new FederatedCredential({
				id:				uid,
				name:			name,
				iconURL:	 image,
				provider: g.origin,
			});
			navigator.credentials.store(cred);
		}
		
		onLogin();
	});
}

g.getUserinfo = function() {
	return new Promise(function(resolve,reject){
		log("gapi load client");
		gapi.load('client', function(){
			log("Client loaded");
			gapi.client.load('oauth2', 'v2', function(){
				log("Client oauth2 loaded");
				gapi.client.oauth2.userinfo.get().execute(function(resp) {
					log("Oauth2 response");
					if( resp.error ) reject(resp);
					else             resolve(resp);
				});
			});
		});
	});
}

g.getEmail = function() { // primary email address
	return new Promise(function(resolve,reject){
		g.getUserinfo().then(resp=>resolve(resp.email));
	});
}

g.onUserUpdated = function() {
	log("onUserUpdated");
	if( !g.ready ) return;

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
	}

	var auth = g_user.getAuthResponse();
	if( auth && online ) {
		c += "\nIssued at "+new Date(auth.first_issued_at);
		c += "\nExpires at "+new Date(auth.expires_at);
		c += "\nExpires in "+Math.round(auth.expires_in/60)+" minutes";
		
		//c += "\n"+JSON.stringify(auth);
		//c += "\nProfile name: "+ g_profile.getName();
	}

	
	pre.innerHTML = c +"\n\n";

	if( online ) {
		s.google.getUserinfo().then(info=>{
			var t_info = document.createElement('pre');
			let out = " name: "+ info.name;
			out += "\n given name: "+ info.given_name;
			out += "\n family name: "+ info.family_name;
			out += "\n Gender: "+ info.gender;
			out += "\n image url: "+ info.picture;
			out += "\n profile url: "+ info.link;
			out += "\n primary email: "+ info.email;
			out += "\n email verified: "+ (info.verified_email?'Yes':'No');
			t_info.innerHTML = out;
			pre.appendChild(t_info);
		}).catch(err=>{
			var t_info = document.createElement('pre');
			t_info.innerHTML = "Could not get userinfo: "+err.message;
			pre.appendChild(t_info);
		});


		var t_revoke = document.createElement('button');
		t_revoke.innerHTML = "Revoke";
		t_revoke.onclick = function(){
			g_user.disconnect().then( onUserUpdated );
		};
		pre.appendChild(t_revoke);

		
		var t_email = document.createElement('button');
		t_email.innerHTML = "Google email";
		t_email.onclick = function(){
			g_user.grant({scope:'email'}).then(_=>{
				notifyStatus("Added email access");
				onUserUpdated();
			}, _=>{
				log("Failed");
				notifyStatus("I thought you liked me...");
			});
		}
		pre.appendChild(t_email);
	}

	// Se https://developers.google.com/identity/protocols/googlescopes
	if( !online ) {
		var t_login = document.createElement('button');
		t_login.innerHTML = "Login with Google";
		t_login.onclick = function(){
			log("SIGNIN on direct click test");
			auth2.signIn({
				scope: 'openid',
			}).then(_=>{
				s.google.onLoginSuccess(1);
			}, _=>{
				log("Failed");
				notifyStatus("You denied access to Google login");
			});
		};
		pre.appendChild(t_login);
	}
}

g.forget = function() {
	if( g.ready ) {
		var auth2 = gapi.auth2.getAuthInstance();
		if( auth2 ) {
			auth2.signOut().then(function () {
				console.log('User signed out from Google');
				// Only effective with auth2.signIn({prompt:'select_account'})
				auth2.disconnect();
			});
		}
	}
}


log("google.js init");


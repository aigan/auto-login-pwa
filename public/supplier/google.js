"use strict";
log('google.js');

var g = alp.s.google;
var u = alp.c.u;
var gu = alp.c.u.s.google = u.s.google || {};


g.exec = function(resolve,reject) {
	loadScriptAsync("//apis.google.com/js/platform.js", function(){
		gapi.load('auth2', function() {
			alp.config_promise.then(c=>{
				c.google.fetch_basic_profile = false;

				// Ask for as little as possible. But we really could
				// need the gmail address for credentials api
				//auto-login. We'll ask for email later.

				c.google.scope = 'openid';
				gapi.auth2.init(c.google).then(function() {
					log("Google login init done");
					g.ready = true;
					alp.drawLoginWidget();
					resolve(); // promise resolved
				});
			});
		});
	});
};


// MUST BE CALLED WITHOUT INDIRECTION
g.navcredLogin = function( cred, by_click ) {

	// Se https://developers.google.com/identity/protocols/googlescopes
	var auth2 = gapi.auth2.getAuthInstance();

	if( auth2.isSignedIn.get() ) {
		log("Already logged in");
		alp.notifyStatus("Welcome back");
		g.onLoginSuccess();
		return;
	}

	if( !g.ready || !by_click ){
		// Can't avoid popup block. Pretend all is ok.
		
		// But the login button must directly call auth2.signIn()
		// without using callback, in order to avoid popup block.
		
		// Best would be to just use the stored info and only ask for
		// re-login then actually needed, directly on user interaction.
		
		gu.loggedin = false;
		gu.cred_id = cred.id;
		u.loggedin = true;
		u.cred_id = cred.id;
		u.cred_used = 'google';
		alp.userUpdate();

		alp.onLogin();
		alp.notifyStatus("Welcome back");
		return;
	}
		
	// In Google Sign-In library, you can specify an account.	 
	// Attempt to sign in with by using `login_hint`.
	log("Doing Google login");
	auth2.signIn({
		login_hint: cred.id || ''
	}).then(function(profile) {
		g.onLoginSuccess();
	}, function(f){
		log("Failed");
		alp.notifyStatus("You denied access to Google login");
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
		alp.notifyStatus("Signing in with Google");
		// Se https://developers.google.com/identity/protocols/googlescopes
		log("SIGNIN with account prompt");
		auth2.signIn({
			prompt:'select_account'
			// prompt only activated if explicitly signed out
		}).then(_=> g.onLoginSuccess(store_cred), _=>{
			log("Failed");
			alp.notifyStatus("You denied access to Google login");
		});
	}
}

g.onLoginSuccess = function(store_cred) {
	log("Signed in");
	alp.notifyStatus("Signed in with Google");

	var auth2 = gapi.auth2.getAuthInstance();
	var g_user = auth2.currentUser.get();
	
	g.getUserinfo().then( p => {
		var uid = p.email || g_user.getId();
		var name = p.name;
		var image = p.picture;
		
		if(!!navigator.credentials && store_cred ) {
			// Create `Credential` object for federation
			var cred = new FederatedCredential({
				id:				uid,
				name:			name,
				iconURL:	 image,
				provider: g.origin,
			});
			navigator.credentials.store(cred);

			gu.cred_id = uid;
		}
		
		u.loggedin = true;
		u.cred_id = uid;
		u.cred_used = 'google';
		gu.loggedin = true;
		gu.id = g_user.getId();
		alp.userUpdate();

		alp.onLogin();
	});
}

g.getUserinfo = function() {
	return new Promise(function(resolve,reject){
		//log("gapi load client");
		gapi.load('client', function(){
			//log("Client loaded");
			gapi.client.load('oauth2', 'v2', function(){
				//log("Client oauth2 loaded");
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
	if( online ){
		log("Google online");
		c += " online";
	} else {
		log("Google offline");
		c += " offline";
	}
	c += "\nGoogleUser id: "+gu.id;

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
		g.getUserinfo().then(info=>{
			var t_info = document.createElement('pre');
			let out = "name: "+ info.name;
			out += "\ngiven name: "+ info.given_name;
			out += "\nfamily name: "+ info.family_name;
			out += "\nGender: "+ info.gender;
			out += "\nimage url: "+ info.picture;
			out += "\nprofile url: "+ info.link;
			out += "\nprimary email: "+ info.email;
			if( info.email )
				out += "\nemail verified: "+ (info.verified_email?'Yes':'No');
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
			g_user.disconnect().then( alp.onUserUpdated );
		};
		pre.appendChild(t_revoke);

		
		var t_email = document.createElement('button');
		t_email.innerHTML = "Google email";
		t_email.onclick = function(){
			g_user.grant({scope:'email'}).then(_=>{
				alp.notifyStatus("Added email access");
				alp.onUserUpdated();
			}, _=>{
				log("Failed");
				alp.notifyStatus("I thought you liked me...");
			});
		}
		pre.appendChild(t_email);
	}

	// Se https://developers.google.com/identity/protocols/googlescopes
	if( g_user && !online && u.loggedin ) {
		var t_login = document.createElement('button');
		t_login.innerHTML = "Login with Google";
		t_login.onclick = function(){
			log("SIGNIN on direct click test");
			auth2.signIn({
				scope: 'openid',
			}).then(_=>{
				g.onLoginSuccess(1);
			}, _=>{
				log("Failed");
				alp.notifyStatus("You denied access to Google login");
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
				alp.onUserUpdated();
			});
		}
	}
}

g.logout = g.forget;


log("google.js init");


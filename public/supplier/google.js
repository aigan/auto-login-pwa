"use strict";
log('google.js');


{
	const g = alp.supplier.google;
	const state = alp.state;


	g.exec = function(resolve,reject) {
		scriptP("//apis.google.com/js/platform.js").then(_=>{

			//	loadScriptAsync("//apis.google.com/js/platform.js", function(){
			gapi.load('auth2', function() {
				var conf = config.google;
				conf.fetch_basic_profile = false;

				// Ask for as little as possible. But we really could
				// need the gmail address for credentials api
				//auto-login. We'll ask for email later.

				conf.scope = 'openid';
				//conf.cookie_policy	= 'none';
				
				var timeout = setTimeout(function(){
					timeout = null; // Indicate it's too late
					reject("Timeout doing auth2 init");
				}, 3000);

				gapi.auth2.init(conf).then(function() {
					if(!timeout){ // timeout already happend
						log("Google auth init responded too late");
						return;
					}
					clearTimeout(timeout);
					g.ready = true;

					mobx.autorun(g.onUserUpdated);
					resolve(); // promise resolved
				});
			});
		});
	};


	//== ACTION
	// MUST BE CALLED WITHOUT INDIRECTION
	g.navcredLogin = mobx.action( function( cred, by_click ) {

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
			
			const gu = g.google_user();
			gu.loggedin = false;
			gu.cred_id = cred.id;
			state.u.loggedin = true;
			state.u.cred_id = cred.id;
			state.u.cred_used = 'google';

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
	});

	//== ACTION
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

	//== ACTION
	g.onLoginSuccess = mobx.action( function(store_cred) {
		log("Signed in");
		alp.notifyStatus("Signed in with Google");

		const u = state.u;
		const gu = g.google_user();
		g.pullUserInfo().then(_=>{

			const uid = gu.email || gu.id;
			const name = gu.name;
			const image = gu.picture;

			if(!!navigator.credentials && store_cred ) {
				// Create `Credential` object for federation
				const cred = new FederatedCredential({
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
		});
	});

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
	};


	// ACTION
	g.pullUserInfo = mobx.action(function(update){
		log("google pullUserInfo");

		const auth2 = gapi.auth2.getAuthInstance();
		const g_user = auth2.currentUser.get();
		const gu = g.google_user();

		gu.updated  = new Date();
		gu.loggedin = g_user.isSignedIn();
		gu.id       = g_user.getId();
		gu.scopes   = g_user.getGrantedScopes();
		gu.auth     = g_user.getAuthResponse();
		
		const g_profile = g_user.getBasicProfile();
		if( g_profile ) { // Usually disabled. No scope
			gu.name        = g_profile.getName();
			gu.name_given  = g_profile.getGivenName();
			gu.name_family = g_profile.getFamilyName();
			gu.picture     = g_profile.getImageUrl();
			gu.email       = g_profile.getEmail();
		}

		if( gu.loggedin ) {
			return g.getUserinfo()
				.then(info => {
					gu.name           = info.name;
					gu.name_given     = info.given_name;
					gu.name_family    = info.family_name;
					gu.gender         = info.gender;
					gu.picture        = info.picture;
					gu.link           = info.link;
					gu.email          = info.email;
					gu.email_verified = info.verified_email;
					delete gu.error;
				})
				.catch(err=>{
					gu.error          = err;
				});
		}

		return Promise.resolve();
	});
	
	//== REACTION
	g.onUserUpdated = function() {
		log("google onUserUpdated");
		
		if( !g.ready ) return;
		const gu = g.google_user();

		// For action callbacks on THIS user
		const auth2 = gapi.auth2.getAuthInstance();
		const g_user = auth2.currentUser.get();
		
		var pre = query('.user-info .google');
		var out = "Google:";

		var online = gu.loggedin;
		if( online ){
			out += " online";
		} else {
			log("Google offline");
			out += " offline";
		}
		out += "\nGoogleUser id: "+gu.id;

		var scopes = gu.scopes;
		if( scopes ) {
			out += "\nScopes";
			for(let scope of scopes.split(' ') ){
				out+= "\n + "+scope.match(/[^\/]+$/);
			}
			//								 out += "\n"+scopes;
		}
		
		var auth = gu.auth;
		if( auth && online ) {
			out += "\nIssued at "+new Date(auth.first_issued_at);
			out += "\nExpires at "+new Date(auth.expires_at);
			out += "\nExpires in "+Math.round(auth.expires_in/60)+" minutes";
		}
		pre.innerHTML = out +"\n\n";

		if( online ) {
			var t_info = document.createElement('pre');
			let out = "name: "+ gu.name;
			out += "\ngiven name: "+ gu.name_given;
			out += "\nfamily name: "+ gu.name_family;
			out += "\nGender: "+ gu.gender;
			out += "\nimage url: "+ gu.picture;
			out += "\nprofile url: "+ gu.link;
			out += "\nprimary email: "+ gu.email;
			if( gu.email )
				out += "\nemail verified: "+ (gu.email_verified?'Yes':'No');
			t_info.innerHTML = out;
			pre.appendChild(t_info);

			if( gu.error ) {
				var t_info = document.createElement('pre');
				t_info.innerHTML = "Could not get userinfo: "+error.message;
				pre.appendChild(t_info);
			};

			var t_revoke = document.createElement('button');
			t_revoke.innerHTML = "Revoke";
			t_revoke.onclick = function(){
				gu.loggedin = false;
				g_user.disconnect();
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
		if( g_user && !online && state.u.loggedin ) {
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
	};

	//== ACTION
	g.forget = function() {
		if( g.ready ) {
			var auth2 = gapi.auth2.getAuthInstance();
			if( auth2 ) {
				auth2.signOut().then(function () {
					console.log('User signed out from Google');
					// Only effective with auth2.signIn({prompt:'select_account'})
					auth2.disconnect();
					state.u.supplier.google.loggedin = false;
				});
			}
		}
	};

	g.logout = g.forget;

	g.google_user = function() {
		
		if( ! state.u.supplier.google.initiated ){
			log("Extending google_user");
			mobx.extendObservable( state.u.supplier.google, {
				cred_id: null,
				email: null,
				id: null,
				name: null,
				picture: null,
				updated: null,
				scopes: null,
				auth: null,
				name_given: null,
				name_family: null,
				gender: null,
				link: null,
				email_verified: null,
				error: null,
				initiated: true,
			});
		}

		return state.u.supplier.google;
	}

}
log("google.js init");

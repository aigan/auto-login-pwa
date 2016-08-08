"use strict";
log('password.js');
{
	const p = alp.supplier.password;
	const state = alp.state;
	const base = config.server.root;
	

	p.exec = function(resolve,reject) {
		//	var imports = queryAll('link[rel="import"]');

		alp.polymer([
			config.vendor+"/paper-input/paper-input.html",
			config.vendor+"/paper-button/paper-button.html"], _=>{
				p.ready = true;
				query('form.login-password .submit').onclick = p.loginSubmit;

				//mobx.autorun(p.onUserUpdated);
				resolve(); // promise resolved
			});
	};

	p.render = function() {
		const section = query('.login-password')
		if( state.view.page != '/login/password' ){
			section.style.display = 'none';
			return;
		}

		log("p.login");
		section.style.display = 'block';
		section.onsubmit = p.loginSubmit;

		if( state.u.name ) {
			query('paper-input[name=username]').value = state.u.name;
			query('paper-input[name=password]').focus();
		} else {
			query('paper-input[name=username]').focus();
		}
	}

	p.login = function(){
		state.view.page = '/login/password';
		mobx.autorun( p.render );
	}

	p.navcredLogin = function(cred, by_click) {
		var form = new FormData();
		form.append('csrf_token', 'maby');
		cred.additionalData = form;

		fetch(base+"/welcome", {
			method: 'POST',
			credentials: cred,
		}).then(r => {
			if( r.status == 200 ) {
				log("Auto-Login SUCCESS");
				alp.notifyStatus("Login success");
				state.u.loggedin = true;
				state.u.cred_used = 'password';
				state.u.cred_id = cred.id;
			} else {
				log("Login failed");
				alp.notifyStatus("Login failed");
			}
		});
	}

	p.loginSubmit = function( e ) {
		log("submit password");
		if( e ) e.preventDefault();
		var form = query('form.login-password');
		log("Submit login form ");

		if ( !!navigator.credentials ) {
			var cred = new PasswordCredential(form);
			navigator.credentials.store(cred)	 
				.then(function() {
					alp.notifyStatus("Save the password for faster login next time");
					log("Stored creds");
					fetch(base+"/welcome", {
						method: 'POST',
						credentials: cred,
					}).then(r=>p.onLoginSubmitResponse(r,cred));
				});
		} else {
			fetch(base+"/welcome", {
				method: 'POST',
				body: new FormData(form),
			}).then(r=>p.onLoginSubmitResponse(r,{
				id: form.elements.username.value,
			}));
		}

		return false;
	}

	p.onLoginSubmitResponse = function(r, cred) {
		if( r.status == 200 ) {
			log("Login SUCCESS");
			alp.notifyStatus("Login success");
			state.u.loggedin = true;
			state.u.cred_used = 'password';
			state.u.cred_id = cred.id;
			log("About to update user");
		}
		else {
			log("Login failed");
			alp.notifyStatus("Login failed");
		}
	}
}

log("password.js init");


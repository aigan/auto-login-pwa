"use strict";
log('password.js');

var p = alp.s.password;
var c = alp.c;


p.exec = function(resolve,reject) {
//	var imports = queryAll('link[rel="import"]');

	alp.polymer([
		config.vendor+"/paper-input/paper-input.html",
		config.vendor+"/paper-button/paper-button.html"], _=>{
			p.ready = true;
			query('form.login-password .submit').onclick = p.loginSubmit;
			alp.drawLoginWidget();
			resolve(); // promise resolved
		});
};

p.login = function() {
	log("p.login");
	query('.login-alternatives').style.display = 'none';
	query('.login-password').style.display = 'block';
	query('form.login-password').onsubmit = p.loginSubmit;

	if( c.u.name ) {
		query('paper-input[name=username]').value = c.u.name;
		query('paper-input[name=password]').focus();
	} else {
		query('paper-input[name=username]').focus();
	}
}


p.navcredLogin = function(cred, by_click) {
	var form = new FormData();
	form.append('csrf_token', 'maby');
	cred.additionalData = form;

	fetch("/app1/welcome", {
		method: 'POST',
		credentials: cred,
	}).then(r => {
		if( r.status == 200 ) {
			log("Auto-Login SUCCESS");
			alp.notifyStatus("Login success");
			c.u.loggedin = true;
			c.u.cred_used = 'password';
			c.u.cred_id = cred.id;
			alp.userUpdate();
			alp.onLogin();
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
				fetch("/app1/welcome", {
					method: 'POST',
					credentials: cred,
				}).then(r=>p.onLoginSubmitResponse(r,cred));
			});
	} else {
		fetch("/app1/welcome", {
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
		c.u.loggedin = true;
		c.u.cred_used = 'password';
		c.u.cred_id = cred.id;
		log("About to update user");
		log(c.u);
		alp.userUpdate();
		alp.onLogin();
	}
	else {
		log("Login failed");
		alp.notifyStatus("Login failed");
	}
}



log("password.js init");


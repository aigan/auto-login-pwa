"use strict";
log('password.js');

var p = s.password;
var pu = u.s.password;


p.exec = function(resolve,reject) {
//	var imports = queryAll('link[rel="import"]');

	var imports = importAsync([
		"/vendor/paper-input/paper-input.html",
		"/vendor/paper-button/paper-button.html",
	]);

	afterLoading('password', imports, _ => {
		log('Elements are upgraded!');
		s.password.ready = true;

		query('form.login-password .submit').onclick = s.password.loginSubmit;

		drawLoginWidget();
		resolve(); // promise resolved
	});
};

p.login = function() {
	log("p.login");
	query('.login-alternatives').style.display = 'none';
	query('.login-password').style.display = 'block';
	query('form.login-password').onsubmit = s.password.loginSubmit;

	if( u.name ) {
		query('paper-input[name=username]').value = u.name;
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
			notifyStatus("Login success");
			u.loggedin = true;
			u.cred_used = 'password';
			u.id = cred.id;
			userUpdate();
			onLogin();
		} else {
			log("Login failed");
			notifyStatus("Login failed");
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
				notifyStatus("Save the password for faster login next time");
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
		notifyStatus("Login success");
		u.loggedin = true;
		u.cred_used = 'password';
		u.id = cred.id;
		userUpdate();
		onLogin();
	}
	else {
		log("Login failed");
		notifyStatus("Login failed");
	}
}



log("password.js init");


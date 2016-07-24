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
				}).then(r=>onPasswordSubmitResponse(r,cred));
			});
	} else {
		fetch("/app1/welcome", {
			method: 'POST',
			body: new FormData(form),
		}).then(r=>onPasswordSubmitResponse(r,{
			id: form.elements.username.value,
		}));
	}

	return false;
}

function onPasswordSubmitResponse(r, cred) {
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


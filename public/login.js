"use strict";
//log('login');

const alp = function(){
	const alpExport = {};
	
	class Supplier {
		constructor(lib, origin) {
			this.lib = lib;
			this.origin = origin; // Federated identity providor
			this.label = null; // Will be set after cunstruction..
			this.exec = null;
			this.promise = null;
			log("Constructing "+lib);

			mobx.extendObservable(this,{
				ready: false,
			});
			
		}

		// reject handler somhow called twice here
		then(resolve_in, reject_in) {
			if(!this.promise) {
				this.promise = new Promise( (resolve,reject) => {
					scriptP(this.lib).then(() => {
						log("%s loaded", this.lib);
						this.exec(resolve,reject);
					});
				});
			}
			this.promise.then(resolve_in, reject_in);
			return this;
		}
	}

	var state; // Container for things to pass around
	const supplier = {}; // Supply login method

	const originIndex = {};
	for( let sup in supplier ) {
		if(!supplier[sup].origin) continue;
		originIndex[supplier[sup].origin] = supplier[sup];
		supplier[sup].label = sup;
		//	log("%s: %s", sup, supplier[sup].origin);
	}

	// prefix for vendor components, taken form config,
	// excluding ending slash.
	const vendor = config.vendor || "bower_components";
	
	class User {
		constructor(p) {
			if(!p) p = {};
			const obj = {
				loggedin: p.loggedin || false,
				loggedout: p.loggedout || null, // explicitly logged out?
				//cred_id: p.cred_id, 
				//cred_used: p.cred_used,
				accessToken: null,
				//account: p.account || {},
				account: {},
				identity: p.identity || {},
			};

			// TODO: Each account should be an object
			if( !p.account ) p.account = {};
			for( let sup in p.account ){
				log("Should set up " + sup);
				obj.account[sup] = mobx.observable(p.account[sup]);
			}

			mobx.extendObservable(this, obj);
		}

		
		static load() {
			const ss = window.localStorage;
			log("User data");
			state.u = new User(JSON.parse(ss.getItem('user')));
			log(mobx.toJS(state.u));

			// Just loading the supplier used for login
			for( let sup of state.u.accounts_used() ) {
				supplier[sup].then();
			}

			mobx.autorun(state.u.update);
		}

		update() {
			log("main user update");

			//log( JSON.stringify(mobx.toJS(state.u.supplier)) );

			const ss = window.localStorage;
			const obj = {
				//cred_id: state.u.cred_id,
				loggedin: state.u.loggedin,
				loggedout: state.u.loggedout,
				//cred_used: state.u.cred_used,
				//supplier: mobx.toJS(state.u.supplier),
				account: mobx.toJS(state.u.account),
				identity: mobx.toJS(state.u.identity),
			};

			log(obj);
			ss.setItem('user', JSON.stringify(obj));
			
		}

		accounts_used() {
			return Object.keys( supplier );
		}

		static forget() {
			state.u = new User();
			const ss = window.localStorage;
			ss.removeItem('user');
		}
		
	}

	////////////////////////////////////////////////////////////

	function notifyStatus(msg) {
		fromId('status').innerHTML = msg;
	}

	function considerAutoLogin() {
		log("consider autoLogin");
		
		if( state.u.loggedin ) {
			notifyStatus("Welcome back");
		} else if( state.u.loggedout ) {
			// Identified but logged out. Respect that
			notifyStatus("");

			if(!!navigator.credentials) {
				log("GETTING navcred for future use");
				navigator.credentials.get({
					password: true,
					federated: {
						providers: Object.keys(originIndex),
					},
					unmediated: true,
				}).then( cred => {
					state.u.cred = cred;
					log("Got cred "+cred );
					if( cred )
						notifyStatus("Hello again");
				});
			} else {
				// Load in suppliers
				for( let sup of state.u.accounts_used() ) {
					supplier[sup].then();
				}
			}

		} else {
			a_login();
		}
	}

	function doLogout() {
		log("main doLogout");
		mobx.transaction(_=>{
			for( let sup of Object.keys(supplier) ) {
				if( supplier[sup].logout ) supplier[sup].logout();
			}

			if( !!navigator.credentials )
				navigator.credentials.requireUserMediation();
		
			notifyStatus("Logged out");
			state.u.loggedin = false;
			state.u.loggedout = true;
		});
	}

	function doForget() {
		for( let sup of Object.keys(supplier) ) {
			if( supplier[sup].forget ) supplier[sup].forget();
		}

		if( !!navigator.credentials )
			navigator.credentials.requireUserMediation();
		
		notifyStatus("Logged out. Remeber to clear your device");
		User.forget();
	}

	function a_login(by_click) {
		notifyStatus("Trying to log in "+(by_click?"by click":''));
		fromId('a_login').disabled = true;
		
		if(!navigator.credentials) {
			if( state.u.cred_used ) {
				// supplier loaded by considerAutoLogin()
				let sup = state.u.accounts_used()[0];
				if( sup ) {
					return supplier[sup].login();
				}

				return notifyStatus("All previous login methods failed");
			}
			
			return notifyStatus("Your browser do not support credentials manager");
		}

		if( state.u.cred )
			return navcredLogin(state.u.cred, by_click);

		log("Getting navcred");
		navigator.credentials.get({
			password: true,
			federated: {
				providers: Object.keys(originIndex),
			},
			//		unmediated: by_click?false:true,
		}).then( cred => {
			state.u.cred = cred;
			navcredLogin(cred, false);
		} );
	}

	function navcredLogin( cred, by_click ) {
		if( !cred ) {
			log("No cred");
			return notifyStatus("No login credentials found");
		}

		if( cred.type == 'password' ) {
			supplier.password.then(_=>supplier.password.navcredLogin(cred, by_click));
		} else if( cred.type == 'federated' ) {
			log("Trying federated login");
			var sup = originIndex[cred.provider];
			if( sup && sup.navcredLogin ) {
				log("Direct call to navcredlogin");

				
				return sup.navcredLogin(cred, by_click);
			}
			else if( sup )
				return sup.then(_=>sup.navcredLogin(cred, by_click));

			log("Unhandled federated provider");
			log(cred.provider);
		}
	}

	function onGoogleAuthInitFailed(err){
		var spin = query('#g_login spinner');
		if( spin ) {
			var button = spin.parentNode;
			spin.remove();
			log(err);
			
			importP("components/alp-warn.html").then(_=>{
				// The warning should be placed on the button, but will not
				// follow the button on line wrap. Should rather make this a
				// real property of the button,
				
				var alts = query(".login-alternatives");
				var details = document.createElement('details');
				details.innerHTML = `
<summary class="warn">&#x26a0;</summary>
<div class="info">
<p>Could not load Google login.</p>
<p>Try to <a target="external-help" href="http://www.howtogeek.com/241006/how-to-block-third-party-cookies-in-every-web-browser/">enable third-party cookies</a>.</p>
</div>`
				alts.insertBefore(details, button);
			});
		}
	}
	
	function renderLogin() {
		log("renderLogin");

		const t_login_alts = query('.login-alternatives');
		const u = state.u;
		if( u.loggedin ) {
			for(var item of queryAll('header .logged-in')) item.style.display = "flex";
			for(var item of queryAll('main .logged-in')) item.style.display = "block";
			for(var item of queryAll('.logged-out')) item.style.display = "none";
			return;
		}

		for(let item of queryAll('.logged-in')) item.style.display = "none";
		for(let item of queryAll('header .logged-out')) item.style.display = "flex";
		for(let item of queryAll('main .logged-out')) item.style.display = "block";

		if( state.view.page != '/login' ) {
			t_login_alts.style.display = 'none';
			return;
		} 

		t_login_alts.style.display = 'block';

		const accUsedLen = state.u.accounts_used.length;
		if( accUsedLen )
			query('.login-alternatives').setAttribute('acc_used', accUsedLen);

		fromId('a_login').disabled = !accUsedLen;
		if( !accUsedLen) {
			fromId('p_login').disabled = !supplier.password.then().ready;
			fromId('g_login').disabled = !supplier.google.then(null,
				onGoogleAuthInitFailed).ready;
			//fromId('f_login').disabled = !supplier.facebook.ready;
		} else {
			fromId('p_login').disabled = true;
			fromId('g_login').disabled = true;
			fromId('f_login').disabled = true;
		}
	}


/*
	function onUserUpdated() {
		log("main onUserUpdated");
		query('.user-info .local').innerHTML =
		`cred_id: ${state.u.cred_id}\ncred: ${state.u.cred_used}`;
	}
*/

	function routeLogin(){
		if( state.u.loggedin ){
			state.view.page = '/';
		} else {
			state.view.page = '/login';
		}
	}

	// Workaround for bugs from race conditions in async component loading
	var polymerLoaded = false;
	function polymer(list,fn) { // Simpler to use callback here
		if(!polymerLoaded){
			log("Polymer");
			importP(vendor+"/polymer/polymer-micro.html").then(_=>{
				polymerLoaded = true;
				polymer(list,fn);
			});
			return;
		}
		var label = list[0].match(/([^\/]+)\.html/i)[1] || list[0];
		log("Importing "+label);
		return Promise.all(list.map((url)=>importP(url))).then(fn);
	}

	//function preload(){}
	
	function onLoad() {
		alpExport.state = state = mobx.observable({
			u: null, // Current user
			view: {  // Current selection of what to view
				page: '/login',
				// other data goes here
			}
		});
				
		supplier.google =  new Supplier('supplier/google.js',
			"https://accounts.google.com");
		supplier.password = new Supplier('supplier/password.js');
		supplier.central = new Supplier('supplier/central.js');

		User.load();
		
		mobx.autorun(routeLogin);
		mobx.autorun(renderLogin);
		//mobx.spy(log);


		fromId('logout').onclick = doLogout;

		fromId('p_login').onclick = function(){ supplier.password.login(true) };

		fromId('g_login').onclick = function(){ supplier.google.login(true) };
		
		fromId('a_login').onclick = function(){ a_login(true) };
		
		fromId('a_forget').onclick = doForget;

		considerAutoLogin();

		// Load Central once user logged in
		mobx.when(_=> state.u.loggedin, _=> supplier.central.then());

		//preload();

		log("login init");
	}


	// Finish loading and setup
	Promise.all([
		//scriptP(vendor+"/lockr/lockr.min.js"),
		scriptP(vendor+"/mobx/lib/mobx.umd.min.js"),
	]).then(onLoad);

	alpExport.supplier = supplier;
	alpExport.notifyStatus = notifyStatus;
	alpExport.polymer = polymer;

	return alpExport;

}();


var log = console.log.bind(console);
var query = document.querySelector.bind(document);
var queryAll = document.querySelectorAll.bind(document);
var fromId = document.getElementById.bind(document);
//var fromClass = document.getElementsByClassName.bind(document);
//var fromTag = document.getElementsByTagName.bind(document);

log("main.js");

function importAsync(urls, f) {
	var links = [];
	for(let url of urls) {
		let link = document.createElement('link');
		link.setAttribute('rel', 'import');
		link.setAttribute('href', url);
		link.setAttribute('async', true);
//		if(f) link.onload = f;
		document.body.appendChild(link);
		links.push(link);
	}
	return links;
}

function loadScriptAsync(url, f) {
	var s = document.createElement('script');
	s.src = '' + url;
	if(f) s.onload = f;
	document.head.appendChild(s);
}

var afterLoadingCallbacks = {}
function afterLoading(label, imports, f) {
	if(!afterLoadingCallbacks[label]){
		afterLoadingCallbacks[label] = function(){
			afterLoading(label,imports,f);
		};
	}

	var loaded = 0;
	for(let link of imports) {
		if(link.import && link.import.readyState === 'complete') {
			loaded ++;
		} else {
			// Will not add if aleready added
			link.addEventListener('load', afterLoadingCallbacks[label] );
		}
	}

	log("%s: Imported %s of %s", label, loaded, imports.length);

	if( loaded == imports.length ) {
		f(label);
	}
}


// Lazyload web components
//
var webComponentsSupported =
		('registerElement' in document
		 && 'import' in document.createElement('link')
		 && 'content' in document.createElement('template'));
if( !webComponentsSupported ) {
	loadScriptAsync( "/vendor/webcomponentsjs/webcomponents-lite.min.js" );
}

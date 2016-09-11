"use strict";

const log = console.log.bind(console);
const query = document.querySelector.bind(document);
const queryAll = document.querySelectorAll.bind(document);
const fromId = document.getElementById.bind(document);
//var fromClass = document.getElementsByClassName.bind(document);
//var fromTag = document.getElementsByTagName.bind(document);


function importP(url){
	return new Promise(function(resolve,reject){
		let link = document.createElement('link');
		link.setAttribute('rel', 'import');
		link.setAttribute('href', url);
		link.setAttribute('async', true);
		link.onload = ()=> resolve(link);
		document.head.appendChild(link);
	});
}

function scriptP(url){
	return new Promise(function(resolve,reject){
		let s = document.createElement('script');
		s.src = url;
		s.onload = ()=> resolve(s);
		document.head.appendChild(s);
	});
}

// Lazyload web components
//
var webComponentsSupported =
		('registerElement' in document
		 && 'import' in document.createElement('link')
		 && 'content' in document.createElement('template'));
if( !webComponentsSupported ) {
	scriptP(config.vendor+"/webcomponentsjs/webcomponents-lite.min.js" );
}

log("main init");

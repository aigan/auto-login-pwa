var log = console.log.bind(console);
var query = document.querySelector.bind(document);
var queryAll = document.querySelectorAll.bind(document);
var fromId = document.getElementById.bind(document);
//var fromClass = document.getElementsByClassName.bind(document);
//var fromTag = document.getElementsByTagName.bind(document);

log("main.js");

function loadScriptAsync(u, c) {
    var s = document.createElement('script');
    s.src = '' + u;
    s.onload = c;
    document.head.appendChild(s);
}


// Lazyload web components
//
var webComponentsSupported =
    ('registerElement' in document
     && 'import' in document.createElement('link')
     && 'content' in document.createElement('template'));

function finishLazyLoading() {
    for(var pattern in onComponentLoaded) {
        var imports = queryAll(pattern);
        var loaded = 0;

        for(var link of imports) {
            if(link.import && link.import.readyState === 'complete') {
                loaded ++;
            } else {
                // Will not add if aleready added
                link.addEventListener('load', finishLazyLoading);
            }
        }

        log("%s: Imported %s of %s", pattern, loaded, imports.length);

        if( loaded == imports.length ) {
            onComponentLoaded[pattern](pattern);
        }
    }
}

if( !webComponentsSupported ) {
    loadScriptAsync( "/vendor/webcomponentsjs/webcomponents-lite.min.js", finishLazyLoading);
} else {
    // wait for onComponentLoaded setting
    setTimeout(finishLazyLoading,0);
}

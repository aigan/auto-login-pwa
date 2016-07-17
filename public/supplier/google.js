 "use strict";
log('google.js');

var g = s.google;
var gu = u.s.google;

g.exec = function(resolve,reject) {
    loadScriptAsync("//apis.google.com/js/platform.js", function(){
        gapi.load('auth2', function() {
            config_promise.then(c=>{
                c.google.fetch_basic_profile = false;

                // Ask for as little as possible. But we really could
                // need the gmail address for credentials api
                //auto-login. We'll ask for email later.

                c.google.scope = 'openid';
                gapi.auth2.init(c.google).then(function() {
                    log("Google login init done");
                    g.ready = true;
                    drawLoginWidget();
                    resolve(); // promise resolved
                });
            });
        });
    });
};

log("End of google init");
log(s.google.exec);

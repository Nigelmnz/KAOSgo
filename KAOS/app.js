//
// KAOSgo- Nigel Munoz (2013-2014)
//

var express = require('express');
var http = require('http');
var path = require('path');
var minify = require('express-minify');
var mongoStore = require('connect-mongo')(express); //TODO: Sometimes doesn't let user login until a reload. 
var dbURI;
// var newrelic;

//Apps
var app = express();
app.settings.env, global.env = 'production';
app.use(express.compress());

// Change settings depending on env
if ('test' === global.env) {
	dbURI = 'TEST_MONGODB_HERE'; //DB
	app.use(express.errorHandler());
	// newrelic = require('newrelic');
	app.use(minify());
} else if ('development' === global.env) {
	dbURI = 'DEV_MONGODB_HERE' ;
	app.use(express.errorHandler());
} else if ('production' === global.env) {
	dbURI = 'PRODUCTION_MONGODB_HERE' ;
	// newrelic = require('newrelic'); //Use Newrelic analytics
	app.use(minify());
} 


// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon(__dirname + '/public/images/favicon.ico')); 
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser('your secret here'));
app.use(express.session({ secret: 'super-duper-secret-secret', cookie: {maxAge: 48 * 60 * 60 * 1000}, store: new mongoStore({url:dbURI, clear_interval: 60*60}) 
}));
app.use(require('less-middleware')( __dirname + '/public', {compress: true}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(app.router);


//Send to router
require('./server/router.js')(app);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

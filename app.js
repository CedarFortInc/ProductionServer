//Stop doing the thing!

var express = require('express');
var fs = require('fs');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var sessions = require('client-sessions');
var bodyParser = require('body-parser');
var router = require('./routes/index');
var api = require('./routes/api-route');
var lib = require('./routes/lib');
//var books = require('./routes/books');
var tpl = require('./routes/tpl');
var img = require('./routes/img');
var compression = require('compression');

var app = express();

// Views engine setup.
app.set('views', path.join(__dirname, 'views'));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

// Get the application key.
var secretKey = fs.readFileSync('./secretKey', {encoding: 'utf8'});

// REST session engine setup.
var sessionOptions = {
    cookieName: 'loginSession',
    secret: secretKey,
    duration: 4*60*60*1000,
    activeDuration: 1*60*60*1000,
    secure: true
};

app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(sessions(sessionOptions));
app.use(bodyParser.json({limit: '10mb'}));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(require('stylus').middleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(compression());

app.use('/lib', lib);
app.use('/api', api);
//app.use('/books', books);
app.use('/tpl', tpl);
app.use('/img', img);
app.use('/', router);
app.use(function(req, res, next){
	res.render('index');
});

// catch 404 and forward to error handler
/*
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});
*/

module.exports = app;

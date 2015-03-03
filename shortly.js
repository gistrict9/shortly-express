var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var bcrypt = require('bcrypt-nodejs');


var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());

// Parse cookies
app.use(cookieParser());

// Session settings -- currently using defaults
app.use(session({
  secret: 'keyboard',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

app.get('/',
function(req, res) {
  util.checkUser(req,res);
  res.render('index');

});

app.get('/create',
function(req, res) {
  util.checkUser(req,res);
  res.render('index');
});

app.get('/links',
function(req, res) {
  util.checkUser(req,res);
  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
  });
});

app.post('/links',
function(req, res) {
  util.checkUser(req,res);
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        var link = new Link({
          url: uri,
          title: title,
          base_url: req.headers.origin
        });

        link.save().then(function(newLink) {
          Links.add(newLink);
          res.send(201, newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/
app.get('/login',
function(req, res){
  res.render('login');
});

app.get('/signup',
function(req, res){
  res.render('signup');
});

app.post('/login',
function(req, res){
  // check if username exists
    // if it does
      // check password against hash
      // if password is correct
        // create session for user
        // redirect to home page
      // if password is incorrect
        // redirect to login - throw error
    // if it doesn't
      // redirect to login - throw error

});

app.post('/signup',
function(req, res){
  var username = req.body.username;
  var pw = req.body.password;
  // check if username exists
  new User({username: username}).fetch().then(function(found) {
    if (found) {
      res.status(301);
      res.redirect('/signup');
    } else {
      var user = new User({username: username, password: pw});
      bcrypt.hash(pw, null, null, function(err, hash) {
        user.save({ password: hash }).then(function(userObj) {
          req.session.username = userObj.attributes.username;
          req.session.userId = userObj.attributes.id;
          res.status(201);
          res.redirect('/');
        });
      });
    }
  });

    // if it does
      // redirect user to sign up - throw error
    // if it does not
      // create user and save to database
      // create session for user
      // redirect to home page

});

// app.post('/logout')


/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1,
          }).then(function() {
            return res.redirect(link.get('url'));
          });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);

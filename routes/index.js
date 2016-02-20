var express = require('express');
var router = express.Router();

var mongoose = require('mongoose');
var passport = require('passport');
var jwt = require('express-jwt');

var Post = mongoose.model('Post');
var Comment = mongoose.model('Comment');
var User = mongoose.model('User');

var auth = jwt({secret: 'SECRET', userProperty: 'payload'});


/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: 'Express' });
});

//--GET routes
// Show all posts
router.get('/posts', function(req, res, next) {
  Post.find(function(err, posts) {
    if(err){
      return next(err);
    }
    res.json(posts);
  });
});

// Show all comments of a post
router.get('/posts/:post', function(req, res, next) {
  req.post.populate('comments', function(err, post) {
    if (err) {
      return next(err);
    }
    res.json(post);
  });
});


//--POST routes
// Create a post
router.post('/posts', auth, function(req, res, next) {
  var post = new Post(req.body);

  post.author = req.payload.username; //get the user name from the JWT token

  post.save(function(err, post) {
    if(err){
      return next(err);
    }
    res.json(post);
  });
});

// Post a comment
router.post('/posts/:post/comments', auth, function(req, res, next) {
  var comment = new Comment(req.body);
  comment.post = req.post;
  comment.author = req.payload.username;

  comment.save(function(err, comment){
    if(err){
      return next(err);
    }
    req.post.comments.push(comment);
    req.post.save(function(err, post) {
      if(err){
        return next(err);
      }
      res.json(comment);
    });
  });
});

// Creates a user given a username and password
router.post('/register', function(req, res, next) {
  if(!req.body.username || !req.body.password){
    return res.status(400).json({message: 'Please fill out all the fields'});
  }

  var user = new User();
  user.username = req.body.username;
  user.setPassword(req.body.password);
  user.save(function(err) {
    if(err){
      return next(err);
    }
    return res.json({token: user.generateJWT()});
  });
});

// Authenticates the user and returns a token to the client
router.post('/login', function(req, res, next){
  if(!req.body.username || !req.body.password){
    return res.status(400).json({message: 'Please fill out all fields'});
  }

  passport.authenticate('local', function(err, user, info){
    if(err){
      return next(err);
    }
    if(user){
      return res.json({token: user.generateJWT()});
    } else {
      return res.status(401).json(info);
    }
  })(req, res, next);
});


//--PUT routes
// Upvote a post
router.put('/posts/:post/upvote', auth, function(req, res, next) {
  req.post.upvote(function(err, post) {
    if(err){
      return next(err);
    }
    res.json(post);
  });
});

// Upvote a comment
router.put('/posts/:post/comments/:comment/upvote', auth, function(req, res, next) {
  req.comment.upvote(function(err, comment) {
    if(err){
      return next(err);
    }
    res.json(comment);
  });
});


//Preloading posts objects' route
router.param('post', function(req, res, next, id) {
  var query = Post.findById(id);

  query.exec(function(err, post) {
    if(err){
      return next(err);
    }
    if(!post){
      return next(new Error('Can\'t find post'));
    }

    req.post = post;
    return next();
  });
});

//Preloading comments objects' route
router.param('comment', function(req, res, next, id) {
  var query = Comment.findById(id);

  query.exec(function(err, comment) {
    if(err){
      return next(err);
    }
    if(!comment){
      return next(new Error('Can\'t find comment'));
    }

    req.comment = comment;
    return next();
  });
});

module.exports = router;

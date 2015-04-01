var express = require('express');
var router = express.Router();
var db = require(process.cwd() + '/data/api.js');
/* GET books. */


router.get('/books', function(req, res){
  db.getTitles(null, function(err, result){
    res.send(result);
  });
});

router.post('/books', function(req, res){
  db.postTitle(null, req.body, function(err, result){
    if (err != null) {
      res.status(400).send('FAILURE');
      console.log("There was an error: " + err);
    } else {
      res.status(201).send('OK');
    }
  });
  console.log(req.body);
});

router.put('/books/:id', function(req, res){
  db.putTitle(null, req.body, req.params.id, function(err, result){
    if (err != null) {
      res.status(400).send('FAILURE');
      console.log("There was an error: " + err);
    } else {
      res.status(201).send('OK');
    }
  });
});

router.get('/books/:id', function(req, res){
  db.getTitle(null, req.params.id, function(err, result){
    if (err != null) {
      res.status(404).send('Not Found');
    } else {
      res.send(result);
    }
  });
});

router.delete('/books/:id', function(req, res){
  db.deleteTitle(null, req.params.id, function(err, result){
    if (err != null) {
      console.log("Delete error: " + err);
      res.status(400).send('Bad Request');
    } else {
      res.status(204).send('Deleted');
    }
  });
});

router.put('/contributors/surname/:sur?/given/:given?', function(req, res){
  db.putContributor(null, req.body, req.params.sur, req.params.given, function(err){
    if (err != null) {
      console.log(err);
      res.status(400).send('Bad Request');
    } else {
      res.status(201).send('Contributor Created');
    }
  })
});

router.get('/contributors', function(req, res){
  db.getContributors(null, function(err, result){
    if (err != null) {
      console.log("Put error: " + err);
      res.status(400).send('Bad Request');
    } else {
      res.status(200).send(result);
    }
  })
});

router.get('/users', function(req, res){
  console.log("GET request to users");
  db.getUsers(null, function(err, body){
    res.status(200).send(body);
  })
});

router.put('/users', function(req, res){
  console.log("PUT request to /users: " + JSON.stringify(req.body))
  db.putUser(null, req.body, function(err){
    console.log(req.body)
    if (err) {
      res.status(400).send('Bad Request');
    } else {
      res.status(201).send('User Created');
    }
  });
});

router.post('/sessions', function(req, res){
  console.log(req.body);
  db.postSession(null, req.body, function(err, roles){
    req.loginSession.username = req.body.username;
    req.loginSession.roles = roles;
    if (err) {
      console.log(err);
      res.status(400).send('Authentication failed.');
    } else {
      res.status(201).send('Authentication successful.')
    }
  })
})

router.delete('/sessions', function(req, res){
    req.loginSession.reset();
    res.status(202).send('Deleting Session.');
});

module.exports = router;

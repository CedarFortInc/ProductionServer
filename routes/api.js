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
      res.status(201).send('OK');
    } else {
      res.status(400).send('FAILURE')
    }
  });
  console.log(req.body);
})

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
      res.status(400).send('Bad Request');
    } else {
      res.status(204).send('Deleted');
    }
  });
});

module.exports = router;

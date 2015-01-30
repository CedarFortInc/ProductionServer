var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'CFI Catalog' });
});

router.get('/:something', function(req, res, next) {
  res.render('index', { title: 'CFI Catalog' });
});

module.exports = router;

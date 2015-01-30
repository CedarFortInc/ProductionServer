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
	console.log(req);
	res.status(200).send(OK)
})

router.get('/books/:id', function(req, res){
	db.getTitle(null, req.params.id, function(err, result){
		res.send(result);
	});
});

module.exports = router;

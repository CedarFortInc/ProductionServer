var express = require('express');
var router = express.Router();
var db = require(process.cwd() + '/data/api.js');
/* GET books. */


router.get('/books', function(req, res){
	db.getTitles(null, function(err, result){
		res.send(result);
	});
});

module.exports = router;

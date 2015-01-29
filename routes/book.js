var express = require('express');
var router = express.Router();

/* GET add book page */
router.get('/edit/:id?', function(req, res){
	res.sendFile(process.cwd() + '/views/edit.html')
});

/* GET book detail page */
router.get('/:file', function(req, res){
	res.sendFile(process.cwd() + '/views/book.html');
});

module.exports = router;

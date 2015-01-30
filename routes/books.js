var express = require('express');
var router = express.Router();

/* GET add book page */
router.get('/add', function(req, res){
	res.sendFile(process.cwd() + '/views/index.html')
});

/* GET edit book page */
router.get('/:id/edit', function(req, res){
	res.sendFile(process.cwd() + '/views/edit.html');
});

/* GET book detail page */
router.get('/:file', function(req, res){
	res.sendFile(process.cwd() + '/views/book.html');
});

router.post('/', function(req, res){
	res.sendFile(process.cwd() + '/views/index.html');
});

module.exports = router;

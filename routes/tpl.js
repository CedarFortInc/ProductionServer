var express = require('express');
var router = express.Router();

/* GET home page. */

router.get('/:file', function(req, res){
	res.sendFile(process.cwd() + '/views/templates/' + req.params.file);
});

module.exports = router;

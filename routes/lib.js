var express = require('express');
var router = express.Router();

/* GET front end js & css files. */

// GET nested files from /public/lib/
router.get('/:folder/:file', function(req, res){
	console.log(process.cwd() + '/public/lib/' + req.params.folder + '/' + req.params.file);
	res.sendFile(process.cwd() + '/public/lib/' + req.params.folder + '/' + req.params.file);
});

//GET any files in the root of /public/lib/:file
router.get('/:file', function(req, res){
	console.log(process.cwd() + '/public/lib/' + req.params.file);
	res.sendFile(process.cwd() + '/public/lib/' + req.params.file);
});


module.exports = router;

var express = require('express');
var router = express.Router();

/* GET front end js files. */

// GET any npm managed js, which is symlinked from /node_modules to /public/javascripts/:folder
router.get('/:folder/:file', function(req, res){
	console.log(process.cwd() + '/public/javascripts/' + req.params.folder + '/' + req.params.file);
	res.sendFile(process.cwd() + '/public/javascripts/' + req.params.folder + '/' + req.params.file);
});

//GET any local js files, stored at /public/javascripts/:file.
router.get('/:file', function(req, res){
	console.log(process.cwd() + '/public/javascripts/' + req.params.file);
	res.sendFile(process.cwd() + '/public/javascripts/' + req.params.file);
});


module.exports = router;

var express = require('express');
var router = express.Router();

/* GET image files. */

// GET images for books

// PUT images for books
router.put('/books/')

// GET any images in an arbitrary folder.
router.get('/:folder/:file', function(req, res){
	console.log(process.cwd() + '/public/images/' + req.params.folder + '/' + req.params.file);
	res.sendFile(process.cwd() + '/public/images/' + req.params.folder + '/' + req.params.file);
});

//GET any local js files, stored at /public/javascripts/:file.
router.get('/:file', function(req, res){
	console.log(process.cwd() + '/public/images/' + req.params.file);
	res.sendFile(process.cwd() + '/public/images/' + req.params.file);
});

module.exports = router;

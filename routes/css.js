var express = require('express');
var router = express.Router();

/* Get Bootstrap */
router.get('/bootstrap.min.css', function(req, res){
	res.sendFile(process.cwd() + '/node_modules/bootstrap/dist/css/bootstrap.min.css');
});

/* GET angular-bootstrap*/
router.get('/ui-bootstrap.min.js', function(req, res){
	res.sendFile(process.cwd() + '/node_modules/angular-bootstrap/dist/ui-bootstrap.min.js');
});

/* GET angular-bootstrap*/
router.get('/ui-bootstrap.min.js', function(req, res){
	res.sendFile(process.cwd() + '/node_modules/angular-bootstrap/dist/ui-bootstrap-tpls.min.js');
});

/* GET stylesheets */
router.get('/:file', function(req, res){
	console.log(process.cwd() + '/public/stylesheets/' + req.params.file);
	res.sendFile(process.cwd() + '/public/stylesheets/' + req.params.file);
});

module.exports = router;

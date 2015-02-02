var db = require('seraph')('http://localhost:7474');

/*
 * Takes nothing, returns a list of all titles in json.
 */
var getTitles = function(err, callback){
	db.query("MATCH (title:TITLE)-[:has_GTIN]->(isbn)" + 
		" RETURN title,isbn,labels(isbn)", {}, function(err, result){
		var data = [];
		var holder = {};
		for(var i = 0; i < result.length; i++){
			if (i === 0 || result[i].title.id != result[i-1].title.id){
				holder = {title: result[i].title.title, isbns: {}}; 
			} else { 
				holder = data.pop();
			}
			result[i]['labels(isbn)'].forEach(function(value, index, array){
				if (value != 'ISBN') holder.isbns[value.toLowerCase()] = result[i].isbn.isbn;
			});
			data.push(holder);
		};
		if (callback != null) callback(err, data);
	});
};


/*
 * Updates a title object at the requested isbn.
 */
var putTitle = function(err, isbn, title, callback){
	
}
	

/*
 * Takes an isbn and returns all data on the title.
 */
var getTitle = function(err, isbn, callback){
	db.query("MATCH (isbn:ISBN {isbn:'" + isbn + "'})<-[:has_GTIN]-(title), (title)-[]->(data)" +
		"RETURN isbn,labels(isbn),title,data,labels(data)", {}, function(err, result){
		var data = {isbns: {}, author: [] };
		var label = '';

		// Pull the isbn and title used to call the db, since they get repeated.
		data.isbns[_stripLabels(result[0]['labels(isbn)'])] = result[0].isbn.isbn;
		data = _extendNoID(data, result[0].title);

		// Get all data, stripping labels that are just used for indexing.
		for (var i = 0; i < result.length; i++){
			label = _stripLabels(result[i]['labels(data)']).toLowerCase();
			switch (label) {
				case "print":
				case "ebook":
					data.isbns[label] = result[i].data.isbn;
					break;
				case "author":
					data.author.push(_extendNoID({}, result[i].data))
					break;
				default:
					data[label] = _extendNoID({}, result[i].data);
			}
		}
		if (callback != null) callback(err, data);
	});
};

/* 
 * Utility function. Takes all the properties except .id from one object and adds them to the master.
 */
var _extendNoID = function(master, propObj) {
	for (prop in propObj) {
		if (prop != 'id') master[prop] = propObj[prop];
	}
	return master
}
/*
 * Utility function, strips labels that are used as a generic index. Returns last valid label. 
 */
var _stripLabels = function(arr){
	return arr.reduce(function(prev, curr){ 
		if (curr != 'ISBN') return curr.toLowerCase();
		return prev.toLowerCase();  
	});
}

/*
 * Takes a title object and updates the server. Passes true to the callback for success.
 * titleObject = {
 * 	title: 'string', 
 *	article: 'string', 
 *	subtitle: 'string', 
 *	sku: 'string', 
 *	isbns: {
 *		print: 'string-valid-13-digit',
 *		ebook: 'string-ditto',
 *		other: 'string, not validated'
 *    }
 * }
 *
 * Everything is optional except for the title property and at least one isbn/gtin. You may use as many isbns
 * as are applicable. Labels are built based on property names. ISBNs and gtins are constrained unique.
 * ebook and print are additionally validated as ISBNs, but other types are not.
 */
var putTitle = function(err, title, callback){
	if (title.title == null || title.title == '') {
		return callback(new Error('Title is missing. That\'s bad. Very bad.'))
	} else if (Object.keys(title.isbns).length === 0) {
		return callback(new Error('No isbns or gtins. That\'s unacceptable.'))
	}
	var query = "MERGE (title:TITLE {title: '" + title.title + "'})";
	if (title.article != null) query += " SET a.article = '" + title.article + "'";
	if (title.subtitle != null) query += " SET a.subtitle = '" + title.subtitle + "'";
	for (var isbn in title.isbns) {
		query += " MERGE (title)-[:has_GTIN]->(:ISBN:" + 
			isbn.toUpperCase() + 
			" {isbn: '" + title.isbns[isbn] + "'})";
	}
	query += " RETURN true";
	console.log(query);
	db.query(query, {}, function(err, result){
		if (callback != null) callback(err, true);
	});
};


getTitles(null, function(err, data){console.log(data)});
putTitle(
	null, 
	{
		title: 'Cassidy', 
		isbns: {
			print: '9781555176224', 
			ebook: '9781462103966'
		}
	}, 
	function(err, result){
		console.log(result)
});

exports.getTitles = getTitles
exports.getTitle = getTitle
exports.putTitle = putTitle

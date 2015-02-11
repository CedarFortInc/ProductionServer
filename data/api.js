var db = require('seraph')('http://localhost:7474');

/*
 * Takes nothing, returns a list of all titles in json.
 */
var getTitles = function(err, callback){
  // The query is static.
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
 * Takes an isbn and returns all data on the title.
 */
var getTitle = function(err, isbn, callback){
  db.query("MATCH (isbn:ISBN {isbn:'" + isbn + "'})<-[:has_GTIN]-(title), (title)-[]->(data)" +
    "RETURN isbn,labels(isbn),title,data,labels(data)", {}, function(err, result){
    //Catch an empty result and return an error.
    if (result.length === 0) return callback(new Error('404'), '<h1>404<h1> <p>The book you wanted, it\'s not there.');
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
 * Takes a title object and creates a node in the database. Passes true to the callback for success.
 * titleObject = {
 *  title: 'string', 
 *  article: 'string', 
 *  subtitle: 'string', 
 *  sku: 'string', 
 *  isbns: {
 *    print: 'string-valid-13-digit',
 *    ebook: 'string-ditto',
 *    other: 'string, not validated'
 *    }
 * }
 *
 * Everything is optional except for the title property and at least one isbn/gtin. You may use as many isbns
 * as are applicable. Labels are built based on property names. ISBNs and gtins are constrained unique.
 * ebook and print are additionally validated as ISBNs, but other types are not.
 */
var postTitle = function(err, title, callback){

  // Error generation.
  if (title.title == null || title.title == '') {
    return callback(new Error('Title is missing. That\'s bad. Very bad.'))
  } else if (Object.keys(title.isbns).length === 0) {
    return callback(new Error('No isbns or gtins. That\'s unacceptable.'))
  }
  
  // Form the query. Always create a new node on a POST. Set attributes only if present.
  var query = "CREATE (title:TITLE {title: '" + _esc(title.title) + "'})";
  if (title.article != null) query += " SET title.article = '" + _esc(title.article) + "'";
  if (title.subtitle != null) query += " SET title.subtitle = '" + _esc(title.subtitle) + "'";
  
  // Splice ISBNs onto the title node.
  for (var isbn in title.isbns) {
    query += " MERGE (title)-[:has_GTIN]->(:ISBN:" + 
      isbn.toUpperCase() + 
      " {isbn: '" + title.isbns[isbn] + "'})";
  }
  
  //Logging queries for debug.
  console.log(query);
  db.query(query, {}, function(err, result){
    if (callback != null) callback(err, true);
  });
};

/*
 * Updates a title in the database. Missing data gets deleted.
 */
var putTitle = function(err, title, callback){
  var referenceISBN = title.isbns[Object.keys(title.isbns)[0]];
  getTitle(null, referenceISBN)
  
}

/*
 * Deletes an entire title and all related data.
 */
var deleteTitle = function(err, isbn, callback){
  db.query("MATCH (isbn:ISBN { isbn: '" + isbn + "' })," +
    "(isbn)<-[r:has_GTIN]-(title:TITLE)," +
    "(title)-[a]->(b)" +
    " DELETE r,a,isbn,title,b ",
    {},
    function(){
      if (callback != null) callback(err, true)
  })
};

var _esc = function(str){
  //This needs to result in a double escaped character, i.e. "\\'"
  //Presumably seraph is interpreting the string.
  return str.replace(/(["'])/g, '\\\\$&')
};

/********************************************************************
 *
 * USERS SECTION
 *
 ********************************************************************/

var putUser = function(err, user, callback){
  var roles = user.roles.map(function(val){
    return "MERGE (user)-[:has_role]->(:ROLE { role: '" + val.toLowerCase() + "' })" 
  })
  var query = "MERGE (user:USER { username: '" + user.username + "' } )" + 
    " SET user.password_hash = '" + user.password_hash + "'" +
    " SET user.email = '" + user.email + "'";
  query += " " + roles.join(' ');
  db.query(query + "RETURN user", {}, function(err, data){
    console.log(data);
    if (callback != null) callback(err, data);
  });
};

var getUser = function(err, username, callback){
  db.query("MATCH (user:USER { username: '" + username + "' }), (user)-[]->(role:ROLE) RETURN user, role", {}, 
    function(err, data){
      console.log(data);
      if (callback != null) callback(err, data);
    });
};

var postUser = putUser;

var deleteUser = function(err, username, callback){
  db.query("MATCH (user:USER { username: '" + username + "'}), (user)-[r]-() DELETE r,user", {}, function(err, data){
    console.log(data);
    if (callback != null) callback(err, data);
  });
};

var authUser = function(err, username, hash, callback){
  getUser(err, username, function(err, data){
    var AuthRoles = ['none'];
    if (data[1].user.password_hash === hash){
      AuthRoles = data.map(function(val){return val.role.role});
      console.log(AuthRoles);
    }
    if (callback != null) callback(err, AuthRoles);
  });
};





//Export Title functions
exports.getTitles = getTitles;
exports.getTitle = getTitle;
exports.deleteTitle = deleteTitle;
exports.postTitle = postTitle;
//Export User functions
exports.putUser = putUser;
exports.getUser = getUser;
exports.postUser = postUser;
exports.deleteUser = deleteUser;
exports.authUser = authUser;

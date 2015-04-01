var db = require('seraph')('http://localhost:7474');
var bcrypt = require('bcrypt');


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
  db.query("MATCH (isbn:ISBN {isbn:'" + isbn + "'})<-[:has_GTIN]-(title) OPTIONAL MATCH (title)-[]->(data)" +
    "RETURN isbn,labels(isbn),title,data,labels(data)", {}, function(err, result){
    //Catch an empty result and return an error.
    if (result.length === 0) return callback(new Error('404'), '<h1>404<h1> <p>The book you wanted, it\'s not there.');
    var data = {isbns: {}, contributors: [], prices: []};
    var label = '';

    console.log(result);
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
        case "contributor":
          data.contributors.push(_extendNoID({}, result[i].data))
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
  if (!Array.isArray(arr)) return [arr.toLowerCase()];
  if (arr.length === 0) return [];
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
  var query = "CREATE (title:TITLE {title: {title}})";
  if (title.article != null) query += " SET title.article = {article}";
  if (title.subtitle != null) query += " SET title.subtitle = {subtitle}";
  
  // Splice ISBNs onto the title node.
  for (var isbn in title.isbns) {
    query += " MERGE (title)-[:has_GTIN]->(:ISBN:" + 
      isbn.toUpperCase() + 
      " {isbn: '" + title.isbns[isbn] + "'})";
  }

  query += ";";
  
  console.log(query);

  var params = {
      title: title.title, 
      article: title.article, 
      subtitle: title.subtitle
    };

  //Logging queries for debug.
  db.query(query, params, function(err, result){
    console.log(JSON.stringify(err));
    if (callback != null) callback(err, true);
  });
};

/*
 * Updates a title in the database. Missing data gets deleted.
 */
var putTitle = function(err, newTitle, referenceISBN, callback){
  if (newTitle.title == null) return callback(new Error('No title specified.'));
  if (Object.keys(newTitle.isbns).length < 1) return callback(new Error('At least one ISBN is required.'));
  if (!Object.keys(newTitle.isbns).every(function(key){ return _ISBNValid(newTitle.isbns[key])})){
    return callback(new Error('Invalid ISBN found.'));
  }
  console.log('Valid Title');
  getTitle(null, referenceISBN, function(oldTitle){
    if (oldTitle == null) return null;
    var query = "MATCH (:ISBN { isbn: '" + referenceISBN + "'})<-[:has_GTIN]-(title:TITLE)"; 
    if (newTitle.title != oldTitle.title && newTitle.title) {
      query += " SET title.title = '" + newTitle.title + "'";
    }
  
  })
  if  (Array.isArray(newTitle.contributors)) {
    newTitle.contributors.forEach(function(contributor){
      contributor.ISBN = referenceISBN;
      putContributor(err, contributor, contributor.surname, contributor.given, function(err){
        if (err != null) console.log(err);
      });
    });
  }
}

var putContributor = function(err, contribUpdate, surname, given, callback){
  console.log("Putting contributor: " + given + " " + surname );
  console.log(JSON.stringify(contribUpdate));
  var query = "MERGE (contributor:CONTRIBUTOR {surname: {surname}, given: {given}})" + 
  " WITH contributor as cont" +
  " MATCH (title:TITLE)-[:has_GTIN]->(:ISBN {isbn: {referenceISBN}})" +
  " MERGE (title)-[:contribution_by {type: '" + contribUpdate.contType + "'}]->(contributor)" +
  " SET cont.surname = {newSurname}" +
  ", cont.given = {newGiven}"
  ", cont.bio = {bio}" +
  ", cont.honorifics = {honorifics}" +
  ", cont.origin = {origin}" +
  ", cont.address = {address}" +
  ", cont.city = {city}" +
  ", cont.state = {state}" +
  ", cont.zip = {zip}" +
  ";"; 

  params = {
    surname: surname,
    given: given,
    newSurname: contribUpdate.surname, 
    newGiven: contribUpdate.given, 
    referenceISBN: contribUpdate.ISBN, 
    bio: contribUpdate.bio, 
    honorifics: contribUpdate.honorifics, 
    origin: contribUpdate.origin,
    address: contribUpdate.address,
    city: contribUpdate.city,
    state: contribUpdate.state,
    zip: contribUpdate.zip
  }

  db.query(query, params, function(err){
    if (callback != null) callback(err);    
  });
}

var getContributors = function(err, callback){
  var query = "MATCH (contributor:CONTRIBUTOR)<-[r]-() RETURN contributor, r.type;";
  db.query(query, {}, function(err, result){
    callback(err, result);
  });
}

//Boolean true if valid ISBN.
var _ISBNValid = function(str){
  //Placeholder
  return (str.length == 13)
};

//Crude sanitizer, replace with parameterized queries.
var _cypherSafe = function(str){
  str.replace(/['"]/g, '\\$&')
};

/*
 * Deletes an entire title and all related data.
 */
var deleteTitle = function(err, isbn, callback){
  db.query("MATCH (isbn:ISBN { isbn: '" + isbn + "' })," +
    " (isbn)<-[r:has_GTIN]-(title:TITLE)" +
    " OPTIONAL MATCH (title)-[a]->(b)" +
    " DELETE r,a,isbn,title,b",
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

/*
 * Takes a user json object of the following shape:
 * 
 * {
 *   "username": "foodrick",
 *   "email": "john@example.com",
 *   "password": "swordfish"
 *   "roles": ["admin", "edit", "view_price"]
 * }
 *
 * Roles are optional. A user without any privileges has the
 * same level of access as an anonymous user. An admin may 
 * add and modify users. An editor may modify and create
 * book entries. View price allows users to see the list
 * price for a book.
 *
 */

var putUser = function(err, user, callback){
  bcrypt.hash(user.password, 10, function(err, password_hash){
    //Set up an array to merge roles onto the user.
    var roles = user.roles.map(function(val){
      return "MERGE (user)-[:has_role]->(:ROLE { role: '" + val.toLowerCase() + "' })" 
    })
    //Set up the main body of the query.
    var query = "MERGE (user:USER { email: '" + user.email + "' } )" + 
      " SET user.password_hash = '" + password_hash + "'" +
      " SET user.username = '" + user.username + "'";
    //Splice role merges onto the body of the query.
    query += " " + roles.join(' ');
    //Execute and return the results.
    db.query(query + "RETURN user", {}, function(err, data){
      console.log("PUT user: " + JSON.stringify(data));
      if (callback != null) callback(err, data);
    });
  });
};

var getUser = function(err, username, callback){
  db.query(
    "MATCH (user:USER { username: '" + username + "' }), (user)-[]->(role:ROLE) RETURN user.email, user.username, role.role;", 
    {},
    function(err, data){
      console.log("GET user: " + data);
      if (callback != null) callback(err, data);
    });
};

/**
 * Returns a full list of users.
 * @param  {error}   err       Error passthrough
 * @param  {Function} callback CPS hook
 * @return {JSON}              JSON array of user objects w/o passwords.
 */
var getUsers = function(err, callback){
  db.query(
    "MATCH (user:USER) RETURN user;", 
    {},
    function(err, data){
      data = data.map(function(val, i, arr){
        delete(val.password_hash);
        return val;
      });
      console.log("GET user: " + JSON.stringify(data));
      if (callback != null) callback(err, data);
    });
};

/**
 * Deletes a user and their role associations.
 * @param  {error}   err        Error passthrough
 * @param  {string}   email     Identifying username
 * @param  {Function} callback  CPS hook
 * @return {JSON}               Returns an empty JSON object
 */
var deleteUser = function(err, email, callback){
  db.query("MATCH (user:USER { email: '" + email + "'}), (user)-[r]-() DELETE r,user", {}, function(err, data){
    console.log(data); 
    if (callback != null) callback(err, data);
  });
};

var postUser = function(err, email, hash, callback){
  getUser(err, email, function(err, data){
    var AuthRoles = ['none'];
    if (data.length > 0 && data[1].user.password_hash === hash){
      AuthRoles = data.map(function(val){return val.role.role});
      console.log(AuthRoles);
    }
    if (callback != null) callback(err, AuthRoles);
  });
};

/********************************************************************
 *
 *  SESSIONS SECTION
 * 
 ********************************************************************/

var authenticateSession = function(err, username, password, callback){
  if (err != null) return callback(err);

  //Sorry for the repetition. Cypher. What can I say?
  db.query("MATCH (user:USER {username: {username}})-[]-(roles:ROLE) RETURN user.password_hash, roles.role;", {username: username}, function(err, result){
    console.log("Authenticating: " + JSON.stringify(result));
    bcrypt.compare(password, result['user.password_hash'], function(err, isCorrect){
      if (isCorrect && result['roles.role'] != null){
        return callback(err, result['roles.role']);
      } else {
        return callback(err, ["none"]);
      }
    });
  });  
}

var postSession = function(err, body, callback){
  authenticateSession(err, body.username, body.password, function(err, roles){
    return callback(err, roles);    
  });
};

var deleteSession = function(err, body, callback){

}



//Export Title functions
exports.getTitles = getTitles;
exports.getTitle = getTitle;
exports.putTitle = putTitle;
exports.deleteTitle = deleteTitle;
exports.postTitle = postTitle;
//Export Contriutor functions
exports.putContributor = putContributor;
//Export User functions
exports.putUser = putUser;
exports.getUser = getUser;
exports.getUsers = getUsers;
exports.postUser = postUser;
exports.deleteUser = deleteUser;
//Export Session functions
exports.postSession = postSession;

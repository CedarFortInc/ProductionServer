var db = require('seraph')('http://localhost:7474');
var bcrypt = require('bcrypt');
var matchReferenceGTIN = "MATCH (:GTIN { number: {referenceGTIN}})<-[:has_GTIN]-(title:TITLE)"

/*
 * Takes nothing, returns a list of all titles in json.
 */
var getTitles = function(err, callback){
  // The query is static.
  db.query("MATCH (title:TITLE)-[:has_GTIN]->(gtin)" + 
    " RETURN title,gtin ORDER BY title.id", {}, function(err, result){
    console.log(result);
    var data = [];
    var holder = {};
    for ( i = 0 , len = result.length; i < len; i++) {
      if (i === 0 || result[i].title.id !== result[i-1].title.id) {
        if (i !== 0) data.push(holder);
        holder = _extendNoID({}, result[i].title);
        holder.gtins = [];
      }
      holder.gtins.push(_extendNoID({}, result[i].gtin));
    }
    data.push(holder);
    if (callback != null) callback(err, data);
  });
};


/*
 * Takes an isbn and returns all data on the title.
 */
var getTitle = function(err, gtin, callback){
  db.query("MATCH (gtin:GTIN {number: {gtin}})<-[:has_GTIN]-(title) OPTIONAL MATCH (title)-[r]->(data)" +
    "RETURN title,data,r,labels(data);", {gtin: gtin}, function(err, result){
    //Catch an empty result and return an error.
    if (result == null || result.length === 0) return callback(new Error('404'), '<h1>404<h1> <p>The book you wanted, it\'s not there.');
    //Log result
    console.log("\n\nGet Result:\n", result, "\n\n");
    var data = {gtins: [], contributors: [], title: {}, prices: []};
    var label = '';

    data.title = _extendNoID(data.title, result[0].title);
    
    // Get all data, stripping labels that are just used for indexing.
    for (var i = 0; i < result.length; i++){
      label = result[i]['labels(data)'][0].toLowerCase();
      switch (label) {
        case "gtin":
          data.gtins.push({number: result[i].data.number, type: result[i].data.type});
          break;
        case "contributor":
          data.contributors.push(_extendNoID({}, result[i].data));
          break;
        case "price":
          data.prices.push(_extendNoID({}, result[i].data));
          break;
        case "imprint":
          data.imprint = result[i].data.name;
          break;
        default:
          data[label] = _extendNoID({}, result[i].data);
      }
    }

    console.log(data);

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
 *  gtins: [
 *    {type: "print", number: 'string-valid-13-digit'},
 *    {type: "ebook", number: 'string-ditto'},
 *    {type: other, number: 'string, not validated'}
 *    ]
 * }
 *
 * Everything is optional except for the title property and at least one isbn/gtin. You may use as many isbns
 * as are applicable. Labels are built based on property names. ISBNs and gtins are constrained unique.
 * ebook and print are additionally validated as ISBNs, but other types are not.
 */
var postTitle = function(err, title, callback){

  // Error generation.
  if (title.title.title == null || title.title.title == '') {
    return callback(new Error('Title is missing. That\'s bad. Very bad.'))
  } else if (title.gtins.length === 0) {
    return callback(new Error('No isbns or gtins. That\'s unacceptable.'))
  }
  
  // Form the query. Always create a new node on a POST. Set attributes only if present.
  var query =  " CREATE (title:TITLE {title})" +
    " WITH title AS title" +
    " UNWIND {gtins} AS gtin" +
    " CREATE (newGtin:GTIN {number: gtin.number, type: gtin.type})" +
    " MERGE (newGtin)<-[:has_GTIN]-(title)"
  
  gtins = title.gtins;
  delete title.gtins;

  var params = {
    title: title.title,
    gtins: gtins
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
var putTitle = function(err, newTitle, referenceGTIN, callback){

  //console.log("Put Title: \n", newTitle);

  //Check all the same ground as postTitle. Factor this out.
  if (newTitle.title.title == null) return callback(new Error('No title specified.'));
  if (newTitle.gtins.length < 1) return callback(new Error('At least one ISBN is required.'));
  if (!newTitle.gtins.every(function(gtin){ 
      var type = gtin.type.toLowerCase();
      if (type === "ebook" || type === "print") return _ISBNValid(gtin.number);
      return true;
    })){
    return callback(new Error('Invalid ISBN found.'));
  }
  console.log('Valid Title');
   
  var titleQuery = matchReferenceGTIN; 
  titleQuery += " SET title = {title}"; 

  db.query(titleQuery, {title: newTitle.title, referenceGTIN: referenceGTIN}, function(err){
    if (err != null) console.log("Title: ", err);
  }); 

  //Imprint.
  putImprint(null, newTitle.imprint, referenceGTIN, function (err){
    if (err != null) console.log("\nImprint: \n", err);
  });

  //Contributors. Detach all, re-apply according to the JSON, then delete orphans.
  var detachContributorQuery = matchReferenceGTIN + 
    ", (title)-[r:contribution_by]-()" +
    " DELETE r;";
  db.query(detachContributorQuery, {referenceGTIN: referenceGTIN}, function (err) {
    if (err != null) console.log("\nContributor: \n", err); 
    if  (Array.isArray(newTitle.contributors)) {
      newTitle.contributors.forEach(function(contributor){

        contributor.GTIN = referenceGTIN;
        putContributor(err, contributor, contributor.surname, contributor.given, function(err){
          if (err != null) console.log(err);
        });
      });
    }
  });
  var deleteOrphans = "MATCH (n:CONTRIBUTOR) WHERE NOT (n)-[]-() DELETE n;";
  db.query(deleteOrphans, {}, function(err){
    if (err != null) console.log(err);
  });

  //Prices. Delete all, then re-apply
  deletePrices(null, referenceGTIN, function(err){
    newTitle.prices.forEach(function(price){
      postPrice(err, price, referenceGTIN, function(err){
        if (err != null) console.log("\nPrices: \n", err);
      });
    });
  });

  //Marketing.
  putMarketing(null, newTitle.marketing, referenceGTIN, function(err){
    if (err != null) console.log(err);
  });

  //Format.
  putFormat(null, newTitle.format, referenceGTIN, function(err){
    if (err != null) console.log(err);
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
var deleteTitle = function(err, gtin, callback){
  db.query("MATCH (gtin:GTIN { number: {gtin}})," +
    " (gtin)<-[r:has_GTIN]-(title:TITLE)" +
    " OPTIONAL MATCH (title)-[a]->(b)" +
    " DELETE r,a,gtin,title,b;",
    {gtin: gtin},
    function(){
      if (callback != null) callback(err, true)
  })
};


/********************************************************************
 *
 * FORMAT SECTION
 *
 ********************************************************************/


var putFormat = function (err, format, referenceGTIN, callback) {
  var query = matchReferenceGTIN;
  
  query += " MERGE (title)-[:has_format]->(format:FORMAT)" +
    " SET format = {format};";

  var params = {format: format, referenceGTIN: referenceGTIN};

  db.query(query, params, function (err) {
    console.log(err);
    if (callback != null) return callback(err);
  });  
}

var deleteFormat = function (err, referenceGTIN, callback) {
  var query = matchReferenceGTIN;
 
  query += ", (title)-[:has_format]->(format:FORMAT)" +
    " DELETE format;";

  db.query(query, {referenceGTIN: referenceGTIN}, function(err){
    console.log(err);
  });

}


/********************************************************************
 *
 * IMPRINT SECTION
 *
 ********************************************************************/


var putImprint = function (err, imprint, referenceGTIN, callback) {

  query = matchReferenceGTIN +
    " OPTIONAL MATCH (title)-[r]-(:IMPRINT)" +
    " DELETE r" +
    " MERGE (imprint:IMPRINT {name: {imprint}})" +
    " CREATE (imprint)<-[:from_imprint]-(title);";

  db.query(query, {imprint: imprint, referenceGTIN: referenceGTIN}, function(err){
    if (err != null) console.log("\nImprint: \n", err);
  });

}


/********************************************************************
 *
 * MARKETING SECTION
 *
 ********************************************************************/


var putMarketing = function (err, marketing, referenceGTIN, callback) {
  var query = matchReferenceGTIN;
 
  console.log("\nMarketing:\n",marketing);
 
  query += " MERGE (title)-[:has_marketing]->(marketing:MARKETING)" +
    " SET marketing = {marketing};";

  var params = {marketing: marketing, referenceGTIN: referenceGTIN};

  db.query(query, params, function (err) {
    console.log(err);
    if (callback != null) return callback(err);
  });  
}

var deleteMarketing = function (err, referenceGTIN, callback) {
  var query = matchReferenceGTIN;
 
  query += ", (title)-[:has_marketing]->(marketing:MARKETING)" +
    " DELETE marketing;";

  db.query(query, {referenceGTIN: referenceGTIN}, function(err){
    console.log(err);
  });

}


/********************************************************************
 *
 * PRICE & REGION SECTION
 *
 ********************************************************************/


var postPrice = function (err, newPrice, referenceGTIN, callback) {
  var query = matchReferenceGTIN;

  query += " MERGE (title)-[:has_price]->(price:PRICE {country: {price}.country})" +
    " SET price = {price};";

  var params = {
    referenceGTIN: referenceGTIN, 
    price: {
      country: newPrice.country,
      amount: newPrice.amount,
      currency: newPrice.currency,
      rightsSold: newPrice.rightsSold,
      rightsHolder: newPrice.rightsHolder
    }
  }

  db.query(query, params, function (err) {
    if (err != null) callback(err);
  });
}


var getPrice = function (err, referenceGTIN, country, callback) {
  var query = matchReferenceGTIN
  
  if (country != null && referenceGTIN != null) {
    query += ", (price:PRICE {country: {country}})<-[]-(title)" +
    " RETURN price;";
  } else if (referenceGTIN != null) { 
    query += ", (price:PRICE)<-[]-(title) RETURN price;";
  } else {
    query = "MATCH (price:PRICE) REUTRN price;";
  }

  db.query(query, {referenceGTIN: referenceGTIN}, function (err, data) {
    callback(err, data);
  });
}


var deletePrices = function (err, referenceGTIN, callback) {
  var query = matchReferenceGTIN;
 
  query += ", (title)-[r]->(price:PRICE)" +
    " DELETE r,price;";

  db.query(query, {referenceGTIN: referenceGTIN}, function (err) {
    callback(err);
  });
}


/********************************************************************
 *
 * CONTRIBUTORS SECTION
 *
 ********************************************************************/

var putContributor = function(err, contribUpdate, surname, given, callback){
  console.log("Putting contributor: " + given + " " + surname );
  console.log("\n New Contributor: \n",contribUpdate);
  var query = "MERGE (contributor:CONTRIBUTOR {surname: {oldSurname}, given: {oldGiven}})" + 
  " WITH contributor as cont" +
  " MATCH (title:TITLE)-[:has_GTIN]->(:GTIN {number: {referenceGTIN}})" +
  " MERGE (title)-[:contribution_by]->(cont)" +
  " SET cont = {attributes};"; 

  var GTIN = contribUpdate.GTIN;
  delete contribUpdate.GTIN;

  params = {
    oldSurname: surname,
    oldGiven: given,
    referenceGTIN: GTIN, 
    attributes: contribUpdate
     /* {
      surname: contribUpdate.surname, 
      given: contribUpdate.given, 
      bio: contribUpdate.bio, 
      honorifics: contribUpdate.honorifics, 
      origin: contribUpdate.origin,
      address: contribUpdate.address,
      city: contribUpdate.city,
      state: contribUpdate.state,
      zip: contribUpdate.zip,
      phone: contribUpdate.phone
    }*/
  }

  db.query(query, params, function(err){
    console.log(err);
    if (callback != null) callback(err);    
  });
}

var getContributor = function(err, surname, given, callback){
  if (surname == null || given == null) {
    var query = "MATCH (contributor:CONTRIBUTOR)<-[r]-() RETURN contributor, r.type;";
    db.query(query, {}, function(err, result){
      callback(err, result);
    });
  } else {
    var query = "MATCH (contributor:CONTRIBUTOR {surname: {surname}, given: {given}})"
    db.query(query, {surname: surname,given: given}, function(){

    })
  }
}

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

BookCatalog.factory("TitleModel", function(isbn, $http, $q){
  var title = {}

  var _setTitle = $http.get('/api/books/' + isbn)
    .success(function(data){
      title = data
    });

  var validateTitle = function(){
    var errors = {};
    if (!title.title || title.title.length < 3) errors.title = "You need a title longer than 3";
    if (!Object.keys(title.isbns).length) errors.isbns.all = "You need at least one valid ISBN.";
    for (key in title.isbns) {
      if (title.isbns[key].length != 13) errors.isbns[key] = "This is not a valid ISBN13.";
    }
    if (title.contributors.length) {
      title.contributors.map(function(contributor){
        var errarr = ["Contributor needs"]
        if (!contributor.first || !contributor.last) errarr.push("at least one name");
        if (!contributor.role) errarr.push("a role");
        if (!contributor.bio) errarr.push("a bio");
      })
    }
    return errors
  };

})

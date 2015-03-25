catalogControllers.factory("TitleModel", function($http, $q){

  var model = {};
  model.title = {};
  model.primaryISBN = '';
  model.errors = {};

  model.getTitle = function(isbn) {
    $http.get('/api/books/' + isbn)
      .success(function(data){
        //var data = result;
        Object.keys(data).forEach(function(key){
          model.title[key] = data[key]
        });
        model.primaryISBN = isbn;
      })
      .error(function(){
        
      });
  }

  model.deleteTitle = function(isbn, callback) {
    $http.delete('/api/books/' + isbn)
      .success(function(data){
        model.title = {};
        return callback(true);
      });
  }

  model.postTitle = function(){
    var clean = model.validateTitle()['clean'];
    alert('clean');
  }

  model.validateTitle = function(strictValidate){
    console.log('Validating Title');
    for (prop in model.errors) delete model.errors[prop];
    model.errors.clean = true;
    model.errors.isbns = {};
    var dirty = function(){model.errors.clean = false};
    if (!model.title.title || model.title.title.length < 3) {
      model.errors.title = "You need a title longer than 3";
      dirty();
    } else {
      delete(model.errors.title);
    }
    if (!Object.keys(model.title.isbns).length) {
      alert("No ISBNs");
      model.errors.isbns.all = "You need at least one valid ISBN.";
      dirty();
    }
    for (key in model.title.isbns) {
      if (model.title.isbns[key].length != 13) {
        model.errors.isbns[key] = "This is not a valid ISBN13.";
        dirty();
      }
    }
    if (model.title.contributors.length) {
      model.errors.contributors = model.title.contributors.map(function(contributor){
        var errarr = [];
        if (!contributor.first && !contributor.last) errarr.push("at least one name");
        if (!contributor.type) errarr.push("a role");
        if (!contributor.bio) errarr.push("a bio");
        return "Contributor needs: " + errarr.join(", ") + ".";
      })
    }
    if (model.title.prices.length) {
      var pricesDupeArray = []
      model.errors.prices = model.title.prices.map(function(price){
        console.log(price);
        var errarr = [];
        pricesDupeArray.indexOf(price.country) == -1 ? pricesDupeArray.push(price.country) : errarr.push("a unique country code");
        if (price.currency.length != 3) errarr.push("a three-letter currency code");
        if (price.rightsSold && !price.rightsHolder) errarr.push("a rights holder listed");
        if (errarr.length) {
          dirty();
          return "Price needs: " + errarr.join(",\n") + ".";
        }
      })
    }
    return model.errors 
  };

  return model

})

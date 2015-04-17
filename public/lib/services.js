catalogControllers.factory("TitleModel", function($http, $q){

  var model = {};

  model.clear = function(){
    model.title = {};
    model.errors = {};
    model.primaryISBN = '';
    model.title.gtins = [];
    model.title.title = {};
    model.title.marketing = {};
    model.title.contributors = [];
    model.title.format = {language: "eng"};
  }

  model.clear();

  model.getTitle = function (isbn) {
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

  //Post a new title + isbns. 
  model.postTitle = function(){
    //model.validateTitle();
    if (true) {
      console.log('POST: Title');
      $http.post('/api/books', angular.toJson(model.title))
    }
  }

  //Put a new title + all data.
  model.putTitle = function(){
    model.validateTitle();
    if (model.errors.clean) {
      $http.put('/api/books/' + model.primaryISBN, angular.toJson(model.title));
    }
  }

  model.add = {
    gtin: function(value) {
      var isUnique = model.title.gtins.every(function (item) {
        return item.type != value;
      });
      if (isUnique) {
        model.title.gtins.push({type: value, number: ""});
      };
    },
    contributor: function() {
      model.title.contributors.push({contType:'Author'});
    },
    price: function(){
      model.title.prices.push({
        amount: 0, 
        currency: "",
        country: '', 
        rightsSold: false
      });
    }
  }


  model.validateTitle = function(strictValidate){
    console.log('Validating Title');
    for (prop in model.errors) delete model.errors[prop];
    model.errors.clean = true;
    model.errors.gtins = [];
    var dirty = function(){model.errors.clean = false};
    if (!model.title.title || model.title.title.length < 3) {
      model.errors.title = "You need a title longer than 3";
      dirty();
    } else {
      delete model.errors.title;
    }

    //GTINS
    if (!model.title.gtins.length) {
      model.errors.gtins = "You need at least one valid ISBN.";
      dirty();
    } else {
    var GTINAccumulator = {};
      model.title.gtins.forEach(function(gtin, index) {
        if (gtin.number.length != 13) {
          model.errors.gtins[index] = "This is not a valid ISBN13.";
          dirty();
        }
        GTINAccumulator[gtin.type] == null ? GTINAccumulator[gtin.type] = true : model.errors.gtins[index] += " Duplicate GTIN type.";
      });
    }

    //Contributors
    if (model.title.contributors != null && model.title.contributors.length) {
      model.errors.contributors = model.title.contributors.map(function(contributor){
        var errarr = [];
        if (!contributor.first && !contributor.last) errarr.push("at least one name");
        if (!contributor.type) errarr.push("a role");
        if (!contributor.bio) errarr.push("a bio");
	if (errarr.length > 0) return "Contributor needs: " + errarr.join(", ") + ".";
        return null;
      })
    }

    //Prices and Regions
    if (model.title.prices != null && model.title.prices.length) {
      var pricesDupeArray = []
      model.errors.prices = model.title.prices.map(function(price){
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

});

//File uploader with callback.
catalogControllers.factory("UploadFiles", function($http, $q){

  uploader = {};
  uploader.reader = new FileReader();
  uploader.xhr = new XMLHttpRequest();
  console.log("building uploader");

  /*upload.init = function(){
    console.log('initialized uploader');
    document.getElementById('sendFile').addEventListener("click", uploader.send('coverImage', "THISBOOK", 'coverImage', alert('IT SENT!!')))
  }*/

  uploader.send = function(inputId, sku, type, callback){
    console.log("Sending File");
    var file = document.getElementById(inputId).files[0];
    var data = new FormData();
    data.append(file.name, file);
    uploader.xhr.upload.addEventListener("load", callback);
    uploader.xhr.open("PUT", "http://54.149.54.152/api/files/" + sku + "/" + "type");
    uploader.xhr.send(data);
  }

  return uploader

});









var catalogControllers = angular.module('catalogControllers', ['ngRoute', 'ngModal', 'ngCookies'])

//Controls the front page book listing.
catalogControllers.controller('mainListing', function($scope, $http){
  if (!$scope.books) {
    $http.get('/api/books').
      success(function(data){$scope.books = data}).
      error(function(){$scope.error = "<p>Couldn't get book list.</p>"
    });
  }
  $scope.oneProp = function(obj){
    for (var prop in obj){
      return obj[prop];
    };
  };
});

//Controls the add-book page.
catalogControllers.controller('addBook', function($scope, TitleModel){
  TitleModel.clear();
  $scope.title = TitleModel.title;
  $scope.errors = TitleModel.errors;
  $scope.postTitle = TitleModel.postTitle;
  $scope.validateTitle = TitleModel.validateTitle;
  $scope.remove = function(key, obj){
    if (Array.isArray(obj)) {
      obj.splice(key, 1);
    } else {
      delete obj[key];
    }
  }
  $scope.add = TitleModel.add;
  //Initilizes the ISBN type select button.
  $scope.newType = 'Add New';
});



catalogControllers.controller('bookEdit', function($scope, $routeParams, TitleModel, UploadFiles) {
  TitleModel.getTitle($routeParams.id);
  $scope.title = TitleModel.title;
  $scope.errors = TitleModel.errors;
  $scope.putTitle = TitleModel.putTitle;
  //UploadFiles.init();
  $scope.sendFile = UploadFiles.send;
  $scope.validateTitle = TitleModel.validateTitle;
  $scope.remove = function(key, obj){
    if (Array.isArray(obj)) {
      obj.splice(key, 1);
    } else {
      delete obj[key];
    }
  }
  $scope.add = TitleModel.add;
});

catalogControllers.controller('bookDetail', function($scope, $routeParams, $http, TitleModel, $location){
  TitleModel.getTitle($routeParams.id);
  $scope.title = TitleModel.title;
  $scope.pretty = function (string) {
    return string.replace(/([A-Z])/g, ' $1').replace(/^./, function(str){ return str.toUpperCase();});
  }
  $scope.errors = TitleModel.errors;
  $scope.putTitle = TitleModel.putTitle;
  $scope.validateTitle = TitleModel.validateTitle;
  $scope.editTitle = function(){$location.path('/books/' + $routeParams.id + '/edit')};
  $scope.deleteTitle = function(){
    TitleModel.deleteTitle($routeParams.id, function(){
      $location.path('/books');
    });
  };
  $scope.newType = 'Add New';
});

/*catalogControllers.controller('bookEdit', function($scope, $routeParams, $http){
  $http.get('/api/books/' + $routeParams.id)
    .success(function(data){$scope.title = data})
    .error(function(){$scope.error = "There was trouble retrieving this book for editing."});
  $scope.putTitle = function(title){
    $http.put('/api/books/' + $routeParams.id)
      .success(function(data){$scope.title = data})
      .error(function(){$scope.error = "Sorry, there was trouble submitting the book"})
  }
  $scope.newType = 'Add New';
  $scope.addISBN = function(isbns, type){
    type = type.toLowerCase();
    $scope.anyISBN = true;
    $scope.isISBN[type] = true;
    if (isbns[type] == null && type !== 'add new') isbns[type] = '';
    $scope.newType = 'Add New';
  }
  //Cuts an index completely out of an object or array.
  $scope.remove = function(key, obj){
    if (obj.isArray) {
      obj.splice(key, 1);
    } else {
      delete obj[key];
    }
  }
  $scope.isTitle = true;
  $scope.anyISBN = false;
  $scope.isISBN = {};
  $scope.isbnValidate = function(row){
    if (row.length != 13) return false;
    return true;
  };
  $scope.deleteTitle = function(){
    $http.delete('/api/books/' + $routeParams.id)
      .success(function(){$window.location.href = '/books';})
      .error(function(data){$scope.error = data});
  }
  //Author controls
  $scope.addContributor = function() {
    if ($scope.title.contrubutors == null) $scope.title.contributors = [];
    $scope.title.contributors.push({})
  }
  
});*/

/*
 * Controller for the index header.
 */
catalogControllers.controller('headerControl', function($scope, $window, $http, $cookies){
  $scope.loginVisible = false;
  $scope.loggedIn = ($cookies.username != null);
  $scope.openLogin = function(){
    if ($cookies.username == null) $scope.loginVisible = true; 
  }
  $scope.closeLogin = function(){
    $scope.loginVisible = false
  }
  $scope.submitLogin = function(username, password){
    $http.post('/api/sessions/', JSON.stringify({username: username, password: password}))
      .success(function(){
        $scope.loginVisible = false
        $cookies.username = username;
        $scope.error = "";
        $scope.loggedIn = true;
      })
      .error(function(){
        $scope.error = "There was a problem logging in.";
      });
  }
  $scope.signOut = function(){
    $http.delete('/api/sessions/');
    delete $cookies.username;
    delete $cookies.password;
    $scope.loggedIn = false;
  }
});


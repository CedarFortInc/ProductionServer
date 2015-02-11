var catalogControllers = angular.module('catalogControllers', ['ngRoute'])

//Controls the front page book listing.
catalogControllers.controller('mainListing', function($scope, $http){
  $http.get('/api/books').
    success(function(data){$scope.books = data}).
    error(function(){$scope.error = "<p>Couldn't get book list.</p>"
  });
  $scope.oneProp = function(obj){
    for (var prop in obj){
      return obj[prop];
    };
  };
});

//Controls the add-book page.
catalogControllers.controller('addBook', function($scope, $http, $window){
  //Represents the title object that will get sent to the server.
  $scope.title = {title: '', isbns: {}};
  //Initilizes the ISBN type select button.
  $scope.newType = 'Add New';
  //Adds an ISBN of the chosen type.
  $scope.addISBN = function(isbns, type){
    type = type.toLowerCase();
    //Declare that there is at least one ISBN for validation.
    $scope.anyISBN = true;
    //Warn against adding duplicates.
    $scope.isISBN[type] = true;
    if (isbns[type] == null && type !== 'add new') isbns[type] = '';
    //Reset the select button.
    $scope.newType = 'Add New';
  };
  //Delete function for arbitrary object keys.
  $scope.remove = function(key, obj){
    delete obj[key];
  };
  //Valid if there is a title.
  $scope.isTitle = true;
  //Valid if there's one or more ISBN.
  $scope.anyISBN = false;
  //Collection to prevent duplication.
  $scope.isISBN = {};
  //Placeholder validation for ISBNs
  $scope.isbnValidate = function(row){
    if (row.length != 13) return false;
    return true;
  };
  //Final validation and submission to the server via POST.
  $scope.submitTitle = function(title){
    if (title.title == '' || !$scope.isTitle) return $scope.isTitle = false;
    if (Object.keys(title.isbns).length === 0) return $scope.anyISBN = false;
    for (key in title.isbns) {
      if (title.isbns[key].length != 13) return $scope.isISBN[key] = false;
    };
    $scope.sending = true;
    $scope.completed = 'Sending, please be patient.';
    $http.post('/api/books', JSON.stringify(title))
      .success(function(){
        $window.location.href = '/books/' + title.isbns[Object.keys(title.isbns)[0]];
        $scope.sending = false;
      })
      .error(function(){
        $scope.sending = false;
        $scope.completed = 'There were problems sending the information.';
      });
  };
});

catalogControllers.controller('bookDetail', function($scope, $routeParams, $http){
  $http.get('/api/books/' + $routeParams.id)
    .success(function(data){$scope.title = data})
    .error(function(){$scope.error = 'Sorry, that book doesn\'t seem to exist.'});
});

catalogControllers.controller('bookEdit', function($scope, $routeParams, $http){
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
  
});

/*
 * Controller for the popup login controller.
 */
catalogControllers.controller('modalLogin', function($scope, $http){
});

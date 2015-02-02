var catalogControllers = angular.module('catalogControllers', ['ngRoute'])

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

catalogControllers.controller('addBook', function($scope, $http){
	$scope.title = {title: 'Blank', isbns: {}};
	$scope.newType = 'Add New';
	$scope.addISBN = function(isbns, type){
		type = type.toLowerCase();
		if (isbns[type] == null && type !== 'add new') isbns[type] = '';
		$scope.newType = 'Add New';
	};
	$scope.remove = function(key, obj){
		delete obj[key];
	};
});

catalogControllers.controller('bookDetail', function($scope, $routeParams, $http){
	$http.get('/api/books/' + $routeParams.id )
});
